/**
 * Server Startup and Shutdown
 * Handles server initialization, graceful shutdown, and error handling
 */

import { Express } from 'express';
import { dbManager } from '../db/connectionManager';
import { config } from '../config';
import { productionLogger } from '../utils/productionLogger';
import { performanceMonitor } from '../utils/performanceMonitor';
import { initializeDatabase } from '../db/initialization';
import { scheduleStartupTasks, initializeBackupService } from '../services/backupInitialization';
import { auditLogger } from '../utils/auditLogger';

/**
 * Setup graceful shutdown handlers
 * Handles SIGINT, SIGTERM, uncaught exceptions, and unhandled rejections
 */
export function setupGracefulShutdown(): void {
  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.log('[STARTUP] Received SIGINT, shutting down gracefully...');
    try {
      // Flush audit logs before shutdown
      console.log('[STARTUP] Flushing audit logs...');
      await auditLogger.flush().catch(err => {
        console.error('[ERROR] Error flushing audit logs:', err);
      });
      
      await dbManager.disconnect();
      process.exit(0);
    } catch (error) {
      console.error('[ERROR] Error during shutdown:', error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', async () => {
    console.log('[STARTUP] Received SIGTERM, shutting down gracefully...');
    try {
      // Flush audit logs before shutdown
      console.log('[STARTUP] Flushing audit logs...');
      await auditLogger.flush().catch(err => {
        console.error('[ERROR] Error flushing audit logs:', err);
      });
      
      await dbManager.disconnect();
      process.exit(0);
    } catch (error) {
      console.error('[ERROR] Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('[ERROR] Uncaught Exception:', error);
    try {
      await dbManager.disconnect();
    } catch (disconnectError) {
      console.error('[ERROR] Error disconnecting database:', disconnectError);
    }
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('[ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
    try {
      await dbManager.disconnect();
    } catch (disconnectError) {
      console.error('[ERROR] Error disconnecting database:', disconnectError);
    }
    process.exit(1);
  });
}

/**
 * Start server with database initialization and graceful error handling
 */
export async function startServer(app: Express): Promise<void> {
  try {
    // Setup graceful shutdown handlers first
    setupGracefulShutdown();

    // Initialize backup service and schedule startup tasks
    const backupService = initializeBackupService();
    scheduleStartupTasks(backupService);

    // Initialize database first with retry logic
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.error('[ERROR] Failed to initialize database after all retries. Exiting...');
      process.exit(1);
    }
    
    // Start the server
    const server = app.listen(config.server.port, () => {
      console.log(`[STARTUP] Server running at http://localhost:${config.server.port}`);
      console.log(`[STARTUP] Environment: ${config.server.nodeEnv}`);
      console.log(`[STARTUP] CORS Origin: ${config.api.corsOrigin}`);
      console.log(`[STARTUP] Error handling: Enabled`);
      console.log(`[STARTUP] Database: Connected and ready`);
      console.log(`[STARTUP] Security: Enhanced with Phase 1 fixes`);
      console.log(`[STARTUP] Performance: Optimized with Phase 2 fixes`);
      console.log(`[STARTUP] Logging: Production-ready with Phase 4 enhancements`);
      
      // Log server startup
      productionLogger.info('Server started successfully', 'SERVER_STARTUP', {
        port: config.server.port,
        environment: config.server.nodeEnv,
        nodeVersion: process.version,
        platform: process.platform
      });
    });
    
    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[ERROR] Port ${config.server.port} is already in use`);
        productionLogger.error(`Port ${config.server.port} is already in use`, 'SERVER_ERROR', {
          port: config.server.port,
          errorCode: error.code
        });
      } else {
        console.error('[ERROR] Server error:', error);
        productionLogger.logError(error, 'SERVER_ERROR');
      }
      process.exit(1);
    });
    
    // Set up periodic performance logging (every 5 minutes)
    const performanceLogInterval = setInterval(() => {
      performanceMonitor.logPerformanceMetrics();
    }, 5 * 60 * 1000);
    
    // Clean up interval on shutdown
    process.on('SIGINT', () => {
      clearInterval(performanceLogInterval);
    });
    
    process.on('SIGTERM', () => {
      clearInterval(performanceLogInterval);
    });
    
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error);
    productionLogger.logError(error as Error, 'SERVER_STARTUP');
    process.exit(1);
  }
}

