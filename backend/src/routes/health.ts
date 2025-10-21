import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { dbManager } from '../db/connectionManager';
import { performanceMonitor } from '../utils/performanceMonitor';
import { productionLogger } from '../utils/productionLogger';
import { HealthCheckResponse } from '../types/api';
import { config } from '../config';

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Offline Booking API',
    version: '1.0.0'
  });
});

// Detailed health check
router.get('/api/health', asyncHandler(async (_req: Request, res: Response) => {
  const dbHealth = await dbManager.healthCheck();
  const performanceMetrics = performanceMonitor.getPerformanceMetrics();
  const logStats = productionLogger.getLogStats();
  
  // Determine overall health status
  const isHealthy = dbHealth.status === 'healthy' && 
                   performanceMetrics.memory.percentage < 90 &&
                   performanceMetrics.requests.errorRate < 10;
  
  const response: HealthCheckResponse = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    database: dbHealth.status,
    databaseDetails: dbHealth.details,
    system: {
      uptime: performanceMetrics.uptime,
      memory: {
        used: Math.round(performanceMetrics.memory.used / 1024 / 1024), // MB
        total: Math.round(performanceMetrics.memory.total / 1024 / 1024), // MB
        percentage: Math.round(performanceMetrics.memory.percentage)
      },
      requests: {
        total: performanceMetrics.requests.total,
        averageResponseTime: Math.round(performanceMetrics.requests.averageResponseTime),
        errorRate: Math.round(performanceMetrics.requests.errorRate * 100) / 100
      },
      database: {
        connectionCount: performanceMetrics.database.connectionCount,
        queryCount: performanceMetrics.database.queryCount,
        averageQueryTime: Math.round(performanceMetrics.database.averageQueryTime)
      }
    },
    logging: {
      totalFiles: logStats.totalFiles,
      totalSize: Math.round(logStats.totalSize / 1024 / 1024), // MB
      oldestLog: logStats.oldestLog,
      newestLog: logStats.newestLog
    },
    warnings: []
  };
  
  // Add warnings for concerning metrics
  if (performanceMetrics.memory.percentage > 80) {
    response.warnings?.push(`High memory usage: ${Math.round(performanceMetrics.memory.percentage)}%`);
  }
  
  if (performanceMetrics.requests.errorRate > 5) {
    response.warnings?.push(`High error rate: ${Math.round(performanceMetrics.requests.errorRate * 100) / 100}%`);
  }
  
  if (performanceMetrics.database.averageQueryTime > 1000) {
    response.warnings?.push(`Slow database queries: ${Math.round(performanceMetrics.database.averageQueryTime)}ms average`);
  }
  
  if (logStats.totalSize > 100) { // 100MB
    response.warnings?.push(`Large log files: ${Math.round(logStats.totalSize / 1024 / 1024)}MB total`);
  }
  
  res.json(response);
}));

export default router;
