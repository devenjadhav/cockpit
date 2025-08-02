import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import WebSocket from 'ws';
import url from 'url';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import dashboardRoutes from './routes/dashboard';
import adminRoutes from './routes/admin';
import adminConsoleRoutes from './routes/adminConsole';
import securityRoutes from './routes/security';
import healthRoutes from './routes/health';
import { databaseService } from './services/databaseService';
import { syncService } from './services/syncService';
import { slackSyncJobService } from './services/slackSyncJobService';
import { createSlackSyncTable } from './utils/createSlackSyncTable';
import { listSlackChannels } from './utils/testSlackChannels';
import { logStreamService } from './services/logStreamService';
import { airtableService } from './services/airtableService';
import { apiRateLimit, securityMonitoringMiddleware } from './middleware/rateLimiting';
import { sanitizeQueryParams } from './middleware/inputValidation';
import { securityHeaders, apiSecurityHeaders, corsOptions, securityAuditMiddleware, requestTimeoutMiddleware } from './middleware/securityHeaders';
import { globalErrorHandler, notFoundHandler, uncaughtExceptionHandler, unhandledRejectionHandler } from './middleware/errorHandling';

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Set up global error handlers
process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', unhandledRejectionHandler);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses behind reverse proxies
app.set('trust proxy', 1);

// Security headers (must come first)
app.use(securityHeaders);

// Request timeout protection
app.use(requestTimeoutMiddleware(30000));

// Enhanced CORS with production security
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security audit middleware
app.use(securityAuditMiddleware);

// Security monitoring middleware (must come before rate limiting)
app.use(securityMonitoringMiddleware);

// Input sanitization
app.use(sanitizeQueryParams);

// Global rate limiting (temporarily disabled for testing)
// app.use('/api/', apiRateLimit);

// API-specific security headers
app.use('/api/', apiSecurityHeaders);

// Test route to debug event format issue
app.get('/api/test-eventformat', async (req, res) => {
  try {
    const { DashboardService } = await import('./services/dashboardService');
    console.log('Testing dashboard for dev@hackclub.com');
    const dashboardData = await DashboardService.getDashboardData('dev@hackclub.com');
    console.log('Dashboard data retrieved:', JSON.stringify(dashboardData, null, 2));
    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Test dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test dashboard data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-console', adminConsoleRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/health', healthRoutes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

app.get('/', (req, res) => {
  res.json({ message: 'Daydream Portal API' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Wait for database service to be ready
    console.log('Initializing database service...');
    let retries = 0;
    const maxRetries = 10;
    
    while (!databaseService.isInitialized() && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }
    
    if (!databaseService.isInitialized()) {
      console.warn('Database service not initialized, continuing without it...');
    } else {
      console.log('Database service initialized successfully');
      
      // Create Slack sync table if needed
      console.log('Setting up Slack sync table...');
      await createSlackSyncTable();

      // Start sync service
      console.log('Starting sync service...');
      // syncService is already started in its constructor
      
      // Start Slack sync job
      console.log('Starting Slack sync job...');
      // slackSyncJobService is already started in its constructor
    }

    // Create HTTP server to support both Express and WebSocket
    const server = http.createServer(app);
    
    // Store user data temporarily during authentication
    const pendingUsers = new Map<string, any>();
    
    // Create WebSocket server for secure log streaming
    const wss = new WebSocket.Server({
      server,
      path: '/api/health/logs/ws',
      verifyClient: async (info: any) => {
        console.log('WebSocket connection attempt from:', info.origin, 'to:', info.req.url);
        try {
          // Extract token from query or Authorization header
          const parsedUrl = url.parse(info.req.url!, true);
          const token = parsedUrl.query.token as string || 
                       info.req.headers.authorization?.replace('Bearer ', '');
          
          if (!token) return false;
          
          // Verify JWT token
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          if (!decoded?.email) return false;
          
          // Additional security checks
          const now = Math.floor(Date.now() / 1000);
          if (decoded.exp && decoded.exp < now) return false; // Token expired
          if (decoded.iat && decoded.iat > now + 300) return false; // Token issued too far in future
          
          // Check admin permissions
          const isAdmin = await airtableService.isAdmin(decoded.email);
          if (!isAdmin) return false;
          
          // Rate limiting check - only allow 3 concurrent connections per user
          const userConnections = Array.from(wss.clients).filter(ws => 
            (ws as any).userEmail === decoded.email
          ).length;
          if (userConnections >= 3) return false;
          
          // Store user info with the socket's remote address as key
          const socketKey = `${info.req.socket.remoteAddress}:${info.req.socket.remotePort}`;
          pendingUsers.set(socketKey, decoded);
          
          console.log('WebSocket auth successful for:', decoded.email);
          console.log('🔑 Storing user data with key:', socketKey);
          console.log('🔑 Returning true from verifyClient, connection should proceed...');
          return true;
        } catch (error) {
          console.error('WebSocket auth error:', error);
          return false;
        }
      }
    });
    
    wss.on('connection', (ws, req) => {
      console.log('🎯 WebSocket connection event fired!');
      
      // Retrieve user data using socket's remote address as key
      const socketKey = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
      const user = pendingUsers.get(socketKey);
      console.log('🔍 Looking for user with key:', socketKey);
      console.log('🔍 User object:', user);
      
      if (!user || !user.email) {
        console.error('❌ No user object found in pendingUsers map, WebSocket connection will be closed');
        ws.close(1008, 'Authentication failed');
        return;
      }
      
      // Clean up the pending user data
      pendingUsers.delete(socketKey);
      
      (ws as any).userEmail = user.email;
      console.log(`Log stream WebSocket connected for user: ${user.email}`);
      
      // Parse filters from query params
      const parsedUrl = url.parse(req.url!, true);
      const filters: any = {};
      if (parsedUrl.query.level) {
        filters.level = Array.isArray(parsedUrl.query.level) ? 
          parsedUrl.query.level : [parsedUrl.query.level];
      }
      if (parsedUrl.query.service) {
        filters.service = Array.isArray(parsedUrl.query.service) ? 
          parsedUrl.query.service : [parsedUrl.query.service];
      }
      
      console.log(`🔗 Adding WebSocket subscriber for user: ${user.email} with filters:`, filters);
      console.log(`🔗 Current subscriber count before adding: ${logStreamService.getSubscriberCount()}`);
      
      // Add to log stream service
      const subscriberId = logStreamService.addWebSocketSubscriber(
        ws, 
        Object.keys(filters).length > 0 ? filters : undefined
      );
      
      console.log(`🔗 Subscriber added with ID: ${subscriberId}`);
      console.log(`🔗 Current subscriber count after adding: ${logStreamService.getSubscriberCount()}`);
      
      // Security: Set connection timeout (30 minutes max)
      const connectionTimeout = setTimeout(() => {
        ws.close(1000, 'Connection timeout');
      }, 30 * 60 * 1000);
      
      ws.on('close', () => {
        clearTimeout(connectionTimeout);
        console.log(`Log stream WebSocket disconnected for user: ${user.email}`);
      });
      
      ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket error:', error);
      });
    });

    // Let the WebSocket server handle upgrades automatically since it's attached to the HTTP server

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Database: ${databaseService.isInitialized() ? 'Connected' : 'Not connected'}`);
      console.log(`WebSocket server ready at ws://localhost:${PORT}/api/health/logs/ws`);
      
      // Test log streaming
      console.log('🧪 Testing log streaming service...');
      logStreamService.log('info', '🧪 Manual test log - server started', 'server-startup');
      console.log('🧪 Current subscriber count:', logStreamService.getSubscriberCount?.() || 'method not available');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  try {
    syncService.stopPeriodicSync();
    slackSyncJobService.stopPeriodicSync();
    await databaseService.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  try {
    syncService.stopPeriodicSync();
    slackSyncJobService.stopPeriodicSync();
    await databaseService.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

startServer();
