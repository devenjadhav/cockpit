import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import dashboardRoutes from './routes/dashboard';
import adminRoutes from './routes/admin';
import adminConsoleRoutes from './routes/adminConsole';
import securityRoutes from './routes/security';
import healthRoutes from './routes/health';
import signupRoutes from './routes/signups';
import { databaseService } from './services/databaseService';
import { syncService } from './services/syncService';
import { slackSyncJobService } from './services/slackSyncJobService';
import { createSlackSyncTable } from './utils/createSlackSyncTable';
import { listSlackChannels } from './utils/testSlackChannels';
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
    const dashboardData = await DashboardService.getDashboardData('dev@hackclub.com');
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
app.use('/api/signups', signupRoutes);

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

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Database: ${databaseService.isInitialized() ? 'Connected' : 'Not connected'}`);
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
