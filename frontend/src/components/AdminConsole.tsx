'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Loader2, AlertCircle, CheckCircle, X, Maximize2, Minimize2 } from 'lucide-react';

interface ConsoleMessage {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
}

interface AdminConsoleProps {
  authToken: string;
  onActiveChange?: (active: boolean) => void;
}

interface QueryResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: string;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ authToken, onActiveChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [consoleStatus, setConsoleStatus] = useState<'ready' | 'not_configured' | 'loading'>('loading');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded) {
      checkConsoleStatus();
      inputRef.current?.focus();
    }
    // Notify parent about active state change
    onActiveChange?.(isExpanded || isFullscreen);
  }, [isExpanded, isFullscreen, onActiveChange]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle escape key for fullscreen mode
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isFullscreen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkConsoleStatus = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/admin-console/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setConsoleStatus(data.data.status);
        addSystemMessage(data.data.message);
      } else {
        setConsoleStatus('not_configured');
        addSystemMessage('Failed to check console status');
      }
    } catch (error) {
      setConsoleStatus('not_configured');
      addSystemMessage('Error connecting to admin console');
    }
  };

  const addSystemMessage = (content: string) => {
    const message: ConsoleMessage = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const addMessage = (type: ConsoleMessage['type'], content: string) => {
    const message: ConsoleMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentInput.trim() || isLoading || consoleStatus !== 'ready') {
      return;
    }

    const query = currentInput.trim();
    setCurrentInput('');
    setIsLoading(true);

    // Add input message
    addMessage('input', query);

    try {
      // Build conversation history from recent messages (last 20 messages)
      const conversationHistory = messages.slice(-20).map(msg => ({
        role: msg.type === 'input' ? 'user' as const : 'assistant' as const,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      })).filter(msg => msg.role === 'user' || msg.role === 'assistant');

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/admin-console/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          conversationHistory 
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        const queryResult: QueryResponse = data.data;
        
        if (queryResult.success) {
          addMessage('output', queryResult.message);
        } else {
          addMessage('error', queryResult.message || queryResult.error || 'Query failed');
        }
      } else {
        addMessage('error', data.message || 'Failed to process query');
      }
    } catch (error) {
      addMessage('error', 'Network error while processing query');
    } finally {
      setIsLoading(false);
    }
  };

  const clearConsole = () => {
    setMessages([]);
    addSystemMessage('Console cleared');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setIsExpanded(false); // Close expanded mode when going fullscreen
    }
  };

  const closeConsole = () => {
    setIsExpanded(false);
    setIsFullscreen(false);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const renderFormattedContent = (content: string) => {
    // Split content by color markers and render with appropriate styling
    const parts = content.split(/(\[GREEN\].*?\[\/GREEN\])/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('[GREEN]') && part.endsWith('[/GREEN]')) {
        // Extract the text between the markers
        const text = part.slice(7, -8); // Remove [GREEN] and [/GREEN]
        return (
          <span key={index} className="text-green-400 font-semibold">
            {text}
          </span>
        );
      }
      return part;
    });
  };

  if (!isExpanded && !isFullscreen) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center px-4 py-3 bg-gray-900 text-green-400 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors font-mono text-sm"
      >
        <Terminal className="w-4 h-4 mr-2" />
        <span>Open Admin Console</span>
        <span className="ml-2 text-xs text-gray-500">(Claude-powered queries)</span>
      </button>
    );
  }

  return (
    <div className={`
      bg-gray-900 border border-gray-700 overflow-hidden
      ${isFullscreen 
        ? 'fixed inset-0 z-50 rounded-none' 
        : 'rounded-lg'
      }
    `}>
      {/* Console Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Terminal className="w-4 h-4 text-green-400 mr-2" />
            <span className="text-sm font-medium text-green-400 font-mono">
              Admin Console
            </span>
            <div className="ml-3 flex items-center">
              {consoleStatus === 'ready' && (
                <div className="flex items-center text-xs text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </div>
              )}
              {consoleStatus === 'not_configured' && (
                <div className="flex items-center text-xs text-red-400">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Configured
                </div>
              )}
              {consoleStatus === 'loading' && (
                <div className="flex items-center text-xs text-yellow-400">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Loading
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearConsole}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors px-2 py-1 rounded"
              title="Clear console"
            >
              Clear
            </button>
            <button
              onClick={toggleFullscreen}
              className="text-gray-400 hover:text-gray-300 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={closeConsole}
              className="text-gray-400 hover:text-gray-300 transition-colors"
              title="Close console"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Console Body */}
      <div className={`flex flex-col ${isFullscreen ? 'h-screen' : 'h-80'}`}>
        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
          {messages.length === 0 && (
            <div className="text-gray-500 text-xs">
              <p className="text-green-400 font-semibold">🚀 Welcome to the Admin Console!</p>
              <p className="mt-2">I'm your AI database analyst. Ask me questions about your hackathon events data and I'll run SQL queries to get the answers.</p>
              
              <p className="mt-3 text-gray-400">📊 Try these example queries:</p>
              <p className="text-green-400 ml-2">• "How many events are approved?"</p>
              <p className="text-green-400 ml-2">• "Show me California events with confirmed venues"</p>
              <p className="text-green-400 ml-2">• "What's the average attendee count by event format?"</p>
              <p className="text-green-400 ml-2">• "Which cities have the most events?"</p>
              
              <p className="mt-3 text-gray-400">💬 I understand follow-up questions too:</p>
              <p className="text-blue-300 ml-2">• "Show me more details about those"</p>
              <p className="text-blue-300 ml-2">• "What about the rejected ones?"</p>
              <p className="text-blue-300 ml-2">• "Group those results by state"</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className="mb-2 group">
              <div className="flex items-start space-x-2">
                <span className="text-xs text-gray-500 mt-0.5 min-w-0 flex-shrink-0">
                  {formatTimestamp(message.timestamp)}
                </span>
                <div className="flex-1 min-w-0">
                  {message.type === 'input' && (
                    <div className="flex items-start">
                      <span className="text-green-400 mr-2">&gt;</span>
                      <span className="text-white break-words">{message.content}</span>
                    </div>
                  )}
                  {message.type === 'output' && (
                    <div className="text-blue-300 whitespace-pre-wrap break-words">
                      {renderFormattedContent(message.content)}
                    </div>
                  )}
                  {message.type === 'error' && (
                    <div className="text-red-400 whitespace-pre-wrap break-words">
                      Error: {message.content}
                    </div>
                  )}
                  {message.type === 'system' && (
                    <div className="text-yellow-400 text-xs italic">
                      {message.content}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing query...
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-4">
          {consoleStatus === 'not_configured' ? (
            <div className="text-red-400 text-sm">
              Claude API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 font-mono">
                  &gt;
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  disabled={isLoading || consoleStatus !== 'ready'}
                  className="w-full pl-8 pr-4 py-2 bg-gray-800 border border-gray-600 rounded text-white font-mono text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 disabled:opacity-50"
                  placeholder="Ask me anything about your events data..."
                />
              </div>
              <button
                type="submit"
                disabled={!currentInput.trim() || isLoading || consoleStatus !== 'ready'}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Send query"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
