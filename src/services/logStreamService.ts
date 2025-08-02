import { Request, Response } from 'express';
import WebSocket from 'ws';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service?: string;
  metadata?: any;
}

interface LogSubscriber {
  id: string;
  connection: Response | WebSocket;
  type: 'sse' | 'websocket';
  filters?: {
    level?: string[];
    service?: string[];
  };
}

class LogStreamService {
  private logs: LogEntry[] = [];
  private subscribers: Map<string, LogSubscriber> = new Map();
  private maxLogHistory = 1000;
  private originalConsole: any = {};

  constructor() {
    this.interceptConsole();
  }

  private interceptConsole() {
    // Store original console methods
    this.originalConsole.log = console.log;
    this.originalConsole.warn = console.warn;
    this.originalConsole.error = console.error;
    this.originalConsole.info = console.info;

    // Override console methods to capture logs
    console.log = (...args) => {
      this.addLog('info', this.formatMessage(args));
      this.originalConsole.log(...args);
    };

    console.warn = (...args) => {
      this.addLog('warn', this.formatMessage(args));
      this.originalConsole.warn(...args);
    };

    console.error = (...args) => {
      this.addLog('error', this.formatMessage(args));
      this.originalConsole.error(...args);
    };

    console.info = (...args) => {
      this.addLog('info', this.formatMessage(args));
      this.originalConsole.info(...args);
    };
  }

  private formatMessage(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  private addLog(level: LogEntry['level'], message: string, service?: string, metadata?: any) {
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      message,
      service,
      metadata
    };

    this.logs.push(logEntry);
    
    // Debug logging - use original console to avoid recursion
    this.originalConsole.log(`[LogStream] Added log (${this.subscribers.size} subscribers):`, {
      level,
      message: message.substring(0, 100),
      service,
      subscriberCount: this.subscribers.size
    });

    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogHistory) {
      this.logs = this.logs.slice(-this.maxLogHistory);
    }

    // Broadcast to subscribers
    this.broadcastLog(logEntry);
  }

  private broadcastLog(logEntry: LogEntry) {
    for (const [subscriberId, subscriber] of this.subscribers) {
      try {
        // Apply filters if any
        if (this.shouldSendLog(logEntry, subscriber.filters)) {
          const data = JSON.stringify(logEntry);
          
          if (subscriber.type === 'websocket') {
            const ws = subscriber.connection as WebSocket;
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(data);
            } else {
              this.subscribers.delete(subscriberId);
            }
          } else {
            // SSE
            const res = subscriber.connection as Response;
            res.write(`data: ${data}\n\n`);
          }
        }
      } catch (error) {
        // Subscriber connection likely closed, remove it
        this.subscribers.delete(subscriberId);
      }
    }
  }

  private shouldSendLog(logEntry: LogEntry, filters?: LogSubscriber['filters']): boolean {
    if (!filters) return true;

    if (filters.level && !filters.level.includes(logEntry.level)) {
      return false;
    }

    if (filters.service && logEntry.service && !filters.service.includes(logEntry.service)) {
      return false;
    }

    return true;
  }

  // Public method to manually add logs with service context
  public log(level: LogEntry['level'], message: string, service?: string, metadata?: any) {
    this.addLog(level, message, service, metadata);
  }

  // Get recent logs
  public getRecentLogs(limit: number = 100, filters?: { level?: string[]; service?: string[] }): LogEntry[] {
    let filteredLogs = this.logs;

    if (filters?.level) {
      filteredLogs = filteredLogs.filter(log => filters.level!.includes(log.level));
    }

    if (filters?.service) {
      filteredLogs = filteredLogs.filter(log => log.service && filters.service!.includes(log.service));
    }

    return filteredLogs.slice(-limit);
  }

  // Start streaming to a client
  public startStream(req: Request, res: Response): string {
    const subscriberId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Parse filters from query params
    const filters: LogSubscriber['filters'] = {};
    if (req.query.level) {
      filters.level = Array.isArray(req.query.level) ? req.query.level as string[] : [req.query.level as string];
    }
    if (req.query.service) {
      filters.service = Array.isArray(req.query.service) ? req.query.service as string[] : [req.query.service as string];
    }

    // Add subscriber
    this.subscribers.set(subscriberId, {
      id: subscriberId,
      connection: res,
      type: 'sse',
      filters: Object.keys(filters).length > 0 ? filters : undefined
    });

    // Send recent logs immediately
    const recentLogs = this.getRecentLogs(50, filters);
    for (const log of recentLogs) {
      try {
        const data = JSON.stringify(log);
        res.write(`data: ${data}\n\n`);
      } catch (error) {
        // Ignore write errors
      }
    }

    // Send a heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
        this.subscribers.delete(subscriberId);
      }
    }, 30000);

    // Clean up when client disconnects
    req.on('close', () => {
      clearInterval(heartbeat);
      this.subscribers.delete(subscriberId);
    });

    return subscriberId;
  }

  // Add WebSocket subscriber
  public addWebSocketSubscriber(ws: WebSocket, filters?: { level?: string[]; service?: string[] }): string {
    const subscriberId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    this.originalConsole.log(`[LogStream] Adding WebSocket subscriber ${subscriberId}, total subscribers will be: ${this.subscribers.size + 1}`);
    this.originalConsole.log(`[LogStream] Current log count: ${this.logs.length}`);
    
    // Add subscriber
    this.subscribers.set(subscriberId, {
      id: subscriberId,
      connection: ws,
      type: 'websocket',
      filters: Object.keys(filters || {}).length > 0 ? filters : undefined
    });

    // Send recent logs immediately
    const recentLogs = this.getRecentLogs(50, filters);
    this.originalConsole.log(`[LogStream] Sending ${recentLogs.length} recent logs to new subscriber`);
    for (const log of recentLogs) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(log));
        }
      } catch (error) {
        // Ignore send errors
      }
    }
    
    // Send a test log immediately to verify connection
    if (ws.readyState === WebSocket.OPEN) {
      const testLog = {
        id: `test-${Date.now()}`,
        timestamp: new Date(),
        level: 'info' as const,
        message: '🚀 WebSocket subscriber connected successfully - you should see logs here now',
        service: 'websocket-test'
      };
      ws.send(JSON.stringify(testLog));
      this.originalConsole.log(`[LogStream] Sent test log to subscriber ${subscriberId}`);
    }

    // Clean up when WebSocket closes
    ws.on('close', () => {
      this.subscribers.delete(subscriberId);
    });

    ws.on('error', () => {
      this.subscribers.delete(subscriberId);
    });

    return subscriberId;
  }

  // Stop streaming for a specific client
  public stopStream(subscriberId: string) {
    const subscriber = this.subscribers.get(subscriberId);
    if (subscriber) {
      try {
        if (subscriber.type === 'websocket') {
          const ws = subscriber.connection as WebSocket;
          ws.close();
        } else {
          const res = subscriber.connection as Response;
          res.end();
        }
      } catch (error) {
        // Ignore errors when closing
      }
      this.subscribers.delete(subscriberId);
    }
  }

  // Get current subscriber count
  public getSubscriberCount(): number {
    return this.subscribers.size;
  }

  // Restore original console methods (for testing or cleanup)
  public restoreConsole() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
  }
}

export const logStreamService = new LogStreamService();
