import express from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { ApiResponse } from '../types/api';
import { syncService } from '../services/syncService';
import { databaseService } from '../services/databaseService';
import os from 'os';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  details?: string;
}

interface BackgroundJobStatus {
  name: string;
  status: HealthStatus;
  frequency: string;
  lastRun?: Date;
  nextRun?: Date;
  metrics?: {
    successRate: number;
    averageDuration: number;
    errorCount: number;
  };
}

interface ServerMetrics {
  uptime: number;
  memory: {
    total: number;
    used: number;
    free: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpu: {
    loadAverage: number[];
    cpuCount: number;
  };
  database: HealthStatus;
  syncJobs: BackgroundJobStatus[];
}

const router = express.Router();

// Basic health check endpoint (no auth required)
router.get('/', async (req, res) => {
  try {
    const isDbHealthy = await databaseService.healthCheck();
    
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: isDbHealthy ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable'
    });
  }
});

// Get comprehensive health status
router.get('/status', adminAuth, async (req, res) => {
  try {
    const healthData = await getSystemHealth();
    
    const response: ApiResponse<ServerMetrics> = {
      success: true,
      data: healthData
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting health status:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get health status'
    };
    
    res.status(500).json(response);
  }
});

// Get sync job details
router.get('/sync-jobs', adminAuth, async (req, res) => {
  try {
    const syncStatus = await syncService.getSyncStatus();
    const isRunning = syncService.isRunning();
    
    const jobs: BackgroundJobStatus[] = [
      {
        name: 'Airtable Sync',
        status: {
          status: isRunning ? 'healthy' : 'degraded',
          lastCheck: new Date(),
          details: isRunning ? 'Running' : 'Not currently running'
        },
        frequency: '30 seconds',
        lastRun: syncStatus.find(s => s.table_name === 'events')?.last_sync_at,
        metrics: await getSyncMetrics()
      }
    ];
    
    const response: ApiResponse<BackgroundJobStatus[]> = {
      success: true,
      data: jobs
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting sync job status:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sync job status'
    };
    
    res.status(500).json(response);
  }
});

// Get detailed sync logs
router.get('/sync-logs', adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const query = `
      SELECT table_name, last_sync_status, records_synced, errors_count, 
             error_details, created_at, last_sync_at
      FROM sync_metadata 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    
    const result = await databaseService.query(query, [limit, offset]);
    
    const response: ApiResponse<any[]> = {
      success: true,
      data: result.rows
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting sync logs:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sync logs'
    };
    
    res.status(500).json(response);
  }
});

// Force manual sync
router.post('/sync/trigger', adminAuth, async (req, res) => {
  try {
    const result = await syncService.performFullSync();
    
    const response: ApiResponse<any> = {
      success: result.success,
      data: result,
      error: result.success ? undefined : result.errors.join('; ')
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger sync'
    };
    
    res.status(500).json(response);
  }
});

// Database health check
router.get('/database', adminAuth, async (req, res) => {
  try {
    const isHealthy = await databaseService.healthCheck();
    const poolInfo = databaseService.getPoolInfo();
    
    const dbHealth: HealthStatus & { poolInfo?: any } = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      lastCheck: new Date(),
      details: isHealthy ? 'Database connection healthy' : 'Database connection failed',
      poolInfo
    };
    
    const response: ApiResponse<typeof dbHealth> = {
      success: true,
      data: dbHealth
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error checking database health:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check database health'
    };
    
    res.status(500).json(response);
  }
});

async function getSystemHealth(): Promise<ServerMetrics> {
  const memoryUsage = process.memoryUsage();
  const systemMemory = {
    total: os.totalmem(),
    free: os.freemem(),
    used: os.totalmem() - os.freemem()
  };
  
  const dbHealthy = await databaseService.healthCheck();
  const syncStatus = await syncService.getSyncStatus();
  const isRunning = syncService.isRunning();
  
  return {
    uptime: process.uptime(),
    memory: {
      total: systemMemory.total,
      used: systemMemory.used,
      free: systemMemory.free,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal
    },
    cpu: {
      loadAverage: os.loadavg(),
      cpuCount: os.cpus().length
    },
    database: {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      lastCheck: new Date(),
      details: dbHealthy ? 'Connected' : 'Connection failed'
    },
    syncJobs: [
      {
        name: 'Airtable Sync',
        status: {
          status: isRunning ? 'healthy' : 'degraded',
          lastCheck: new Date(),
          details: isRunning ? 'Running normally' : 'Not currently active'
        },
        frequency: '30 seconds',
        lastRun: syncStatus.find(s => s.table_name === 'events')?.last_sync_at,
        metrics: await getSyncMetrics()
      }
    ]
  };
}

async function getSyncMetrics() {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_syncs,
        COUNT(CASE WHEN last_sync_status = 'success' THEN 1 END) as successful_syncs,
        COUNT(CASE WHEN errors_count > 0 THEN 1 END) as error_count,
        AVG(CASE WHEN last_sync_status = 'success' THEN records_synced END) as avg_records
      FROM sync_metadata 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;
    
    const result = await databaseService.query(query);
    const row = result.rows[0];
    
    const totalSyncs = parseInt(row.total_syncs) || 0;
    const successfulSyncs = parseInt(row.successful_syncs) || 0;
    
    return {
      successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100,
      averageDuration: 5000, // Would need to track duration in metadata
      errorCount: parseInt(row.error_count) || 0
    };
  } catch (error) {
    console.error('Error getting sync metrics:', error);
    return {
      successRate: 0,
      averageDuration: 0,
      errorCount: 0
    };
  }
}

export default router;
