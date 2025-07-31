import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import dashboardRoutes from './routes/dashboard';
import adminRoutes from './routes/admin';
import adminConsoleRoutes from './routes/adminConsole';
import { databaseService } from './services/databaseService';
import { syncService } from './services/syncService';

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any localhost origin for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Block other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      
      // Start sync service
      console.log('Starting sync service...');
      // syncService is already started in its constructor
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
    await databaseService.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

startServer();
