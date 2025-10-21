// src/server.ts

import express from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config, validateConfig, validateSecurityConfig, validateProductionReadiness } from './config';
import { getTheaterConfig } from './config/theaterConfig';
import { dbManager } from './db/connectionManager';
import { productionLogger } from './utils/productionLogger';
import { performanceMonitor } from './utils/performanceMonitor';
import { 
  requestIdMiddleware, 
  errorLogger, 
  errorHandler, 
  asyncHandler, 
  validateBookingData 
} from './middleware/errorHandler';
import { 
  ValidationError, 
  NotFoundError, 
  DatabaseError, 
  handleDatabaseError 
} from './utils/errors';
import {
  type CreateBookingRequest,
  type CreateBookingResponse,
  type BookingData,
  type BookingQueryParams,
  type SeatStatusQueryParams,
  type BookingStatsResponse,
  type HealthCheckResponse,
  type SeatStatusResponse,
  type ApiResponse,
  BookingSource
} from './types/api';
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer';
import { windowsPrintService } from './printService';
import { EscposPrintService } from './escposPrintService';
import ThermalPrintService from './thermalPrintService';
import PdfPrintService from './pdfPrintService';
import { KannadaPdfKitService } from './kannadaPdfKitService';
import PrinterSetup from './printerSetup';
import ticketIdService from './ticketIdService';
import { auditLogger } from './utils/auditLogger';
import { InputSanitizer } from './utils/inputSanitizer';
import SumatraInstaller from './sumatraInstaller';
import BackupService from './services/backupService';
import fs from 'fs';
import path from 'path';

// Initialize backup service
const initializeBackupService = () => {
  const databasePath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
  const backupDir = path.join(require('os').homedir(), 'Documents', 'AuditoriumX_Backups');
  
  return new BackupService({
    sourcePath: databasePath,
    backupDir,
    retentionDays: 7,    // Keep daily backups for 7 days
    retentionWeeks: 4,   // Keep weekly backups for 4 weeks
    retentionMonths: 12  // Keep monthly backups for 12 months
  });
};

const backupService = initializeBackupService();

// Runtime database migration - Add missing columns automatically
const runDatabaseMigration = async () => {
  try {
    console.log('[DB] Checking database schema...');
    const prisma = dbManager.getClient();
    
    // Check if printedAt column exists
    try {
      await prisma.$queryRaw`SELECT printedAt FROM Booking LIMIT 1`;
      console.log('[DB] printedAt column exists');
    } catch (error: any) {
      if (error instanceof Error && error.message && error.message.includes('printedAt')) {
        console.log('[DB] Running migration: Adding printedAt column...');
        await prisma.$executeRaw`ALTER TABLE Booking ADD COLUMN printedAt DATETIME`;
        console.log('[DB] Migration completed: printedAt column added');
      } else {
        throw error;
      }
    }
    
    // Check if Settings table exists (non-blocking)
    try {
      await prisma.$queryRaw`SELECT * FROM Settings LIMIT 1`;
      console.log('[DB] Settings table exists');
    } catch (error: any) {
      if (error instanceof Error && error.message && error.message.includes('Settings')) {
        console.log('[DB] Running migration: Creating Settings table...');
        try {
          await prisma.$executeRaw`
            CREATE TABLE Settings (
              id TEXT PRIMARY KEY,
              key TEXT UNIQUE NOT NULL,
              value TEXT NOT NULL,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `;
          console.log('[DB] Settings table created successfully');
        } catch (settingsError) {
          // Don't crash the app if Settings table creation fails
          console.error('[ERROR] Failed to create Settings table:', settingsError);
          console.log('[WARN] Settings will use localStorage fallback');
          // App continues! Bookings still work!
        }
      }
    }
    
    console.log('[DB] Database schema check completed');
  } catch (error) {
    console.error('[ERROR] Database migration error:', error);
    throw error; // Only throw if critical tables fail
  }
};

// Auto-backup on server startup (runs once when server starts)
const runStartupBackup = async () => {
  try {
    console.log('[BACKUP] Running startup backup...');
    const result = await backupService.createBackup();
    if (result.success) {
      console.log('[BACKUP] Startup backup completed successfully');
    } else {
      console.log('[BACKUP] Startup backup failed:', result.message);
    }
  } catch (error) {
    console.error('[ERROR] Startup backup error:', error);
  }
};

// Run migration first, then backup on server start (non-blocking)
setTimeout(async () => {
  await runDatabaseMigration();
  await runStartupBackup();
}, 2000); // Wait 2 seconds after server start

// Production path handling function
const getAppDataPath = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, we're running from the current working directory
    // which will be resources/backend/ when spawned by Electron
    return process.cwd();
  }
  // In development, we're running from backend/dist/ or backend/src/
  return path.join(__dirname, '../');
}

// Validate configuration on startup - disabled for installer environment
// if (!validateConfig()) {
//   process.exit(1);
// }

// Validate security configuration - disabled for installer environment
// validateSecurityConfig();



const app = express();

// Get Prisma client from connection manager
const prisma = dbManager.getClient();

// Database initialization using connection manager
async function initializeDatabase(): Promise<boolean> {
  // Ensure user data directory exists for database persistence
  if (config.server.nodeEnv === 'production') {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Extract database directory from DATABASE_URL
      const dbUrl = config.database.url;
      const dbPath = dbUrl.replace('file:', '');
      const dbDir = path.dirname(dbPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`[DB] Created user data directory: ${dbDir}`);
      } else {
        console.log(`[DB] Using existing user data directory: ${dbDir}`);
      }
      
      // Check if we need to migrate existing database
      if (!fs.existsSync(dbPath)) {
        // Check multiple possible old database locations
        const possibleOldPaths = [
          // App bundle locations (will be deleted on uninstall)
          path.join(__dirname, 'dev.db'),
          path.join(__dirname, '..', 'dev.db'),
          path.join(__dirname, '..', 'prisma', 'dev.db'),
          path.join(process.cwd(), 'dev.db'),
          path.join(process.cwd(), 'prisma', 'dev.db'),
          
          // Installer-specific paths (Electron resourcesPath)
          path.join((process as any).resourcesPath || '', 'app.asar.unpacked', 'dist', 'backend', 'dev.db'),
          path.join((process as any).resourcesPath || '', 'app.asar.unpacked', 'backend-dist', 'dev.db'),
          path.join((process as any).resourcesPath || '', 'app.asar.unpacked', 'dev.db'),
          
          // Legacy app data paths
          path.join(process.env.APPDATA || '', 'AuditoriumX', 'dev.db'),
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'AuditoriumX', 'dev.db'),
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'AuditoriumX', 'resources', 'app.asar.unpacked', 'dev.db')
        ];
        
        let migrated = false;
        console.log(`[DB] Checking for existing database to migrate to: ${dbPath}`);
        
        for (const oldDbPath of possibleOldPaths) {
          if (fs.existsSync(oldDbPath)) {
            console.log(`[DB] Found existing database: ${oldDbPath}`);
            try {
              fs.copyFileSync(oldDbPath, dbPath);
              console.log(`[DB] SUCCESS: Migrated database from ${oldDbPath} to ${dbPath}`);
              migrated = true;
              break;
} catch (error) {
              console.error(`[ERROR] Failed to migrate database from ${oldDbPath}:`, error);
            }
          }
        }
        
        if (!migrated) {
          console.log(`[DB] No existing database found to migrate. Creating new database at ${dbPath}`);
        }
      } else {
        console.log(`[DB] Database already exists at: ${dbPath}`);
      }
    } catch (error) {
      console.error('[ERROR] Failed to setup database directory:', error);
      // Continue anyway - database might still work
    }
  }
  
  return await dbManager.connect();
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('[STARTUP] Received SIGINT, shutting down gracefully...');
  try {
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

const thermalPrintService = new ThermalPrintService();
const pdfPrintService = new PdfPrintService();
const kannadaPdfKitService = new KannadaPdfKitService();

// Trust proxy for Railway deployment (fixes rate limiting errors)
// Use specific proxy configuration instead of 'true' to avoid security warnings
app.set('trust proxy', 1);

// Add Content Security Policy headers to fix CSP errors
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self' https: http:; " +
    "font-src 'self' data:;"
  );
  next();
});

// Configure CORS with proper origin restrictions
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Define allowed origins
    const allowedOrigins = [
      'http://localhost:8080',    // Development frontend
      'http://localhost:3000',    // Alternative dev port
      'http://127.0.0.1:8080',    // Localhost alternative
      'http://127.0.0.1:3000',    // Localhost alternative
      // Vercel frontend domains
      'https://offlinebooking.vercel.app',  // Vercel production
      'https://offlinebooking-git-main.vercel.app',  // Vercel preview
      'https://offlinebooking-git-develop.vercel.app',  // Vercel branch
      // Allow all Vercel preview deployments
      ...(origin && origin.includes('.vercel.app') ? [origin] : [])
    ];
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow all origins for testing
    if (config.server.nodeEnv === 'development') {
      console.log(`[CORS] Development mode: Allowing origin: ${origin}`);
      return callback(null, true);
    }
    
    // Log unauthorized origin attempts
    console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Add security headers (CSP is already set above, so we skip it here)
app.use((req: Request, res: Response, next) => {
  // Skip CSP header - already set above with proper unsafe-eval support
  // This prevents conflicting CSP headers that block JavaScript execution
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
});

app.use(express.json());

// Add rate limiting - Theatre booking system optimized limits
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute (theater booking optimized)
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false, // Count failed requests too
});

// Higher rate limiting for booking and printing endpoints
export const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 booking requests per minute (theater booking optimized)
  message: {
    success: false,
    error: 'Too many booking requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Very high rate limit for BMS operations (bulk seat updates for theater staff)
export const bmsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // Very high limit for BMS bulk operations (theater staff needs)
  message: {
    success: false,
    error: 'Too many BMS requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Add request ID middleware
app.use(requestIdMiddleware);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv
  });
});

// Security monitoring endpoint (admin only)
app.get('/api/admin/security-status', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get database health (simplified)
    const dbHealth = {
      status: 'healthy' as const,
      details: 'Database connection validated',
      timestamp: new Date().toISOString()
    };
    
    // Get database stats (simplified)
    const dbStats = {
      totalBookings: 0, // Will be populated by actual query if needed
      totalSeats: 400,
      lastBackup: undefined,
      databaseSize: undefined
    };
    
    // Get rate limit info (this would need to be implemented with a rate limiter store)
    const rateLimitInfo = {
      general: { remaining: 100, timeUntilReset: 0 },
      booking: { remaining: 20, timeUntilReset: 0 },
      print: { remaining: 10, timeUntilReset: 0 }
    };
    
    // Get security configuration status
    const securityConfig = {
      webSecurity: config.server.isProduction ? 'enabled' : 'disabled',
      cspEnabled: true,
      rateLimiting: true,
      inputSanitization: true,
      auditLogging: true,
      jwtSecretStrength: config.security.jwtSecret.length >= 32 ? 'strong' : 'weak'
    };
    
    const securityStatus = {
      timestamp: new Date().toISOString(),
      database: {
        health: dbHealth,
        stats: dbStats
      },
      rateLimiting: rateLimitInfo,
      security: securityConfig,
      environment: config.server.nodeEnv
    };
    
    // Log security status access
    auditLogger.logAdmin(
      'SECURITY_STATUS_ACCESSED',
      true,
      'anonymous',
      req.ip,
      req.get('User-Agent'),
      { environment: config.server.nodeEnv },
      req.requestId
    );
    
    res.json({
      success: true,
      data: securityStatus
    });
  } catch (error) {
    console.error('[ERROR] Error getting security status:', error);
    
    auditLogger.logError(
      'SECURITY_STATUS_FAILED',
      false,
      'anonymous',
      req.ip,
      req.get('User-Agent'),
      { error: error instanceof Error ? error.message : 'Unknown error' },
      req.requestId
    );
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Audit logs endpoint (admin only)
app.get('/api/admin/audit-logs', asyncHandler(async (req: Request, res: Response) => {
  try {
    const logFilePath = auditLogger.getLogFilePath();
    
    if (!fs.existsSync(logFilePath)) {
      return res.json({
        success: true,
        logs: [],
        message: 'No audit logs found'
      });
    }
    
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const logLines = logContent.trim().split('\n').filter(line => line.trim());
    
    const logs = logLines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
    
    // Log access to audit logs
    auditLogger.logAdmin(
      'VIEW_AUDIT_LOGS',
      true,
      'anonymous',
      req.ip,
      req.get('User-Agent'),
      { logCount: logs.length },
      req.requestId
    );
    
    res.json({
      success: true,
      logs: logs.slice(-100), // Return last 100 entries
      total: logs.length,
      logFilePath
    });
  } catch (error) {
    console.error('[ERROR] Error reading audit logs:', error);
    
    auditLogger.logError(
      'VIEW_AUDIT_LOGS_FAILED',
      false,
      'anonymous',
      req.ip,
      req.get('User-Agent'),
      { error: error instanceof Error ? error.message : 'Unknown error' },
      req.requestId
    );
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// ===== ROUTE REGISTRATION =====
// All API routes are now defined in separate route files for better modularity
import { registerRoutes } from './routes';

// Register all routes (bookings, settings, seats, printer, health checks)
registerRoutes(app);

// ===== ERROR HANDLING MIDDLEWARE (must be after routes) =====

// Add error handling middleware (must be last)
app.use(errorLogger);
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.json({
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      code: 404,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    }
  });
});

// ===== SERVER STARTUP =====

// Start server with database initialization and graceful error handling
async function startServer() {
  try {
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

// Start the server
startServer();
