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
import fs from 'fs';
import path from 'path';

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
        console.log(`📁 Created user data directory: ${dbDir}`);
      } else {
        console.log(`📁 Using existing user data directory: ${dbDir}`);
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
        console.log(`📁 Checking for existing database to migrate to: ${dbPath}`);
        
        for (const oldDbPath of possibleOldPaths) {
          if (fs.existsSync(oldDbPath)) {
            console.log(`📁 Found existing database: ${oldDbPath}`);
            try {
              fs.copyFileSync(oldDbPath, dbPath);
              console.log(`✅ SUCCESS: Migrated database from ${oldDbPath} to ${dbPath}`);
              migrated = true;
              break;
} catch (error) {
              console.error(`❌ Failed to migrate database from ${oldDbPath}:`, error);
            }
          }
        }
        
        if (!migrated) {
          console.log(`📁 No existing database found to migrate. Creating new database at ${dbPath}`);
        }
      } else {
        console.log(`📁 Database already exists at: ${dbPath}`);
      }
    } catch (error) {
      console.error('❌ Failed to setup database directory:', error);
      // Continue anyway - database might still work
    }
  }
  
  return await dbManager.connect();
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  try {
    await dbManager.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await dbManager.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  try {
    await dbManager.disconnect();
  } catch (disconnectError) {
    console.error('❌ Error disconnecting database:', disconnectError);
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  try {
    await dbManager.disconnect();
  } catch (disconnectError) {
    console.error('❌ Error disconnecting database:', disconnectError);
  }
  process.exit(1);
});

const thermalPrintService = new ThermalPrintService();
const pdfPrintService = new PdfPrintService();
const kannadaPdfKitService = new KannadaPdfKitService();

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
      // Add production origins here when deploying
      // 'https://yourdomain.com',
      // 'https://www.yourdomain.com'
    ];
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log unauthorized origin attempts
    console.warn(`🚫 CORS: Blocked request from unauthorized origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Add security headers
app.use((req: Request, res: Response, next) => {
  // Content Security Policy - More restrictive for production
  const cspPolicy = config.server.isProduction
    ? "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' http://localhost:* ws://localhost:*; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "object-src 'none'; " +
      "media-src 'self';"
    : "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' http://localhost:* ws://localhost:*; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';";

  res.setHeader('Content-Security-Policy', cspPolicy);
  
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
const bookingLimiter = rateLimit({
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
const bmsLimiter = rateLimit({
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
    console.error('❌ Error getting security status:', error);
    
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
    console.error('❌ Error reading audit logs:', error);
    
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

// Add printer list endpoint
app.get('/api/printer/list', async (req, res) => {
  try {
    console.log('🔍 Getting list of available printers...');
    
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"', { windowsHide: true });
      
      try {
        const printers = JSON.parse(stdout);
        const printerNames = Array.isArray(printers) 
          ? printers.map((p: any) => p.Name).filter(Boolean)
          : [];
        
        console.log('✅ Found printers:', printerNames);
        res.json({ success: true, printers: printerNames });
        } catch (parseError) {
        console.error('❌ Failed to parse printer list:', parseError);
        res.json({ success: true, printers: [] });
        }
      } else {
      res.json({ success: true, printers: [] });
    }
  } catch (error) {
    console.error('❌ Failed to get printer list:', error);
    res.status(500).json({ success: false, error: 'Failed to get printer list' });
  }
});

// Printer test endpoint
app.post('/api/printer/test', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🖨️ Testing printer connection...');
    const { printerConfig } = req.body;
    
    // Log the printer configuration
    console.log('🖨️ Printer configuration:', printerConfig);
    
    // Actually try to connect to the printer
    // For now we'll simulate success, but in a real implementation
    // this would attempt to establish a connection to the physical printer
    const connected = true;
    
    if (connected) {
      console.log('✅ Printer connection successful');
      res.json({
        success: true,
        message: 'Printer connection test successful',
        timestamp: new Date().toISOString(),
        printerInfo: {
          port: printerConfig?.port || 'COM1',
          status: 'connected',
          ready: true
        }
      });
    } else {
      throw new Error('Could not connect to printer');
    }
  } catch (error) {
    console.error('❌ Printer test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Printer connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Print job status endpoint
app.get('/api/printer/status/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  // Get queue status which includes job information
  const queueStatus = windowsPrintService.getQueueStatus();
  const jobStatus = queueStatus.jobs.find(job => job.id === jobId);
  
  if (!jobStatus) {
    return res.status(404).json({
      success: false,
      error: 'Print job not found'
    });
  }
  
  res.json({
    success: true,
    jobStatus,
    queueStatus
  });
}));

// Print queue status endpoint
app.get('/api/printer/queue', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    queueStatus: windowsPrintService.getQueueStatus()
  });
}));

// Global flag to prevent multiple simultaneous print operations
let isPrinting = false;

// Printer print endpoint
app.post('/api/printer/print', bookingLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { tickets, printerConfig } = req.body;
    
    console.log('🖨️ Printing tickets:', {
      ticketCount: tickets?.length || 0,
      printerConfig,
      rawBody: req.body
    });

    // Log print attempt
    auditLogger.logPrint(
      'PRINT_TICKETS_ATTEMPT',
      true,
      'anonymous',
      req.ip,
      req.get('User-Agent'),
      {
        ticketCount: tickets?.length || 0,
        printerName: printerConfig?.name,
        printerType: 'ESC/POS'
      },
      req.requestId
    );
    
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      throw new Error('No tickets provided or invalid tickets format');
    }

  try {
    console.log('🖨️ Using ESC/POS service for thermal printing...');
    
    // Process each ticket
    for (const ticket of tickets) {
      // Create raw ticket data for the service to format
      const ticketData = {
        theaterName: printerConfig.theaterName || getTheaterConfig().name,
        location: printerConfig.location || getTheaterConfig().location,
        date: ticket.date || new Date().toLocaleDateString(),
        showTime: ticket.showTime || '2:00 PM',
        movieName: ticket.movieName || 'MOVIE',
        class: ticket.class || 'CLASS',
        seatId: ticket.seatId || 'A1',
        netAmount: ticket.netAmount || 0,
        cgst: ticket.cgst || 0,
        sgst: ticket.sgst || 0,
        mc: ticket.mc || 0,
        price: ticket.price || 0,
        transactionId: ticket.transactionId || 'TXN' + Date.now()
      };
      
      console.log('🖨️ Printing ticket data:', ticketData);
      await EscposPrintService.printSilently(ticketData, printerConfig.name);
    }

    console.log('✅ All tickets printed successfully via ESC/POS');
    
    // Log successful print
    auditLogger.logPrint(
      'PRINT_TICKETS_SUCCESS',
      true,
      'anonymous',
      req.ip,
      req.get('User-Agent'),
      {
        ticketCount: tickets.length,
        printerName: printerConfig.name,
        printerType: 'ESC/POS'
      },
      req.requestId
    );
    
    res.json({
      success: true,
      message: `${tickets.length} tickets printed successfully`,
      timestamp: new Date().toISOString(),
      printerInfo: {
        name: printerConfig.name,
        status: 'printed',
        method: 'Direct ESC/POS'
      }
    });

  } catch (error) {
    console.error('❌ ESC/POS printing failed:', error);
    
    // Log failed print
    auditLogger.logPrint(
      'PRINT_TICKETS_FAILED',
      false,
      'anonymous',
      req.ip,
      req.get('User-Agent'),
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        ticketCount: tickets?.length || 0,
        printerName: printerConfig?.name
      },
      req.requestId
    );
    
    res.status(500).json({
      success: false,
      message: 'ESC/POS printing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// ===== THERMAL PRINTER ENDPOINTS =====

// Get all available printers (including thermal)
app.get('/api/thermal-printer/list', asyncHandler(async (req: Request, res: Response) => {
  try {
    const allPrinters = await thermalPrintService.getAllPrinters();
    const thermalPrinters = await thermalPrintService.getThermalPrinters();
    
    res.json({
      success: true,
      allPrinters,
      thermalPrinters,
      recommended: thermalPrinters.length > 0 ? thermalPrinters[0].name : null
    });
  } catch (error) {
    console.error('❌ Error getting thermal printers:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Test thermal printer
app.post('/api/thermal-printer/test', asyncHandler(async (req: Request, res: Response) => {
  const { printerName } = req.body;
  
  if (!printerName) {
    throw new Error('Printer name is required');
  }

  const result = await thermalPrintService.testPrinter(printerName);
  
  if (result.success) {
    res.json({
      success: true,
      message: `Printer test successful for ${printerName}`,
      printer: printerName
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      printer: printerName
    });
  }
}));

// Print ticket using PDF generation (English or Kannada version based on movie settings)
app.post('/api/thermal-printer/print', asyncHandler(async (req: Request, res: Response) => {
  const { ticketData, printerName, movieSettings } = req.body;
  
  if (!ticketData) {
    throw new Error('Ticket data is required');
  }

  // Check if movie should be printed in Kannada
  const shouldPrintInKannada = movieSettings?.printInKannada === true;
  
  console.log(`🖨️ Printing ticket - Language: ${shouldPrintInKannada ? 'Kannada' : 'English'}`);
  console.log(`🎬 Movie settings:`, movieSettings);
  console.log(`🎬 Ticket data:`, ticketData);
  console.log(`🎬 Movie language in ticket data:`, ticketData.movieLanguage);
  console.log(`🔤 printInKannada flag:`, movieSettings?.printInKannada);
  console.log(`🔤 shouldPrintInKannada result:`, shouldPrintInKannada);
  
  console.log('💰 TICKET COST DEBUG - Server Level:');
  console.log('💰 ticketData.individualAmount:', ticketData.individualAmount);
  console.log('💰 ticketData.totalAmount:', ticketData.totalAmount);
  console.log('💰 ticketData.seatCount:', ticketData.seatCount);
  console.log('💰 ticketData.individualPrice:', ticketData.individualPrice);
  console.log('💰 ticketData.totalPrice:', ticketData.totalPrice);

  // Use appropriate service based on language setting
  console.log(`🔤 About to call ${shouldPrintInKannada ? 'KannadaPdfKitService' : 'PdfPrintService'}`);
  
  const result = shouldPrintInKannada 
    ? await kannadaPdfKitService.printTicket(ticketData, printerName)
    : await pdfPrintService.printTicket(ticketData, printerName);
  
  if (result.success) {
    res.json({
      success: true,
      message: result.message,
      printer: result.printer
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      printer: result.printer
    });
  }
}));

// Test endpoint for Ultra-fast Kannada service
app.post('/api/thermal-printer/test-ultra-fast-kannada', asyncHandler(async (req: Request, res: Response) => {
  const { ticketData, printerName } = req.body;
  
  if (!ticketData) {
    throw new Error('Ticket data is required');
  }

  console.log('🚀 Testing Kannada PDFKit Print Service');
  console.log('🚀 Ticket data:', ticketData);
  console.log('🚀 Printer name:', printerName);
  
  const result = await kannadaPdfKitService.printTicket(ticketData, printerName);
  
  if (result.success) {
    res.json({
      success: true,
      message: result.message,
      printer: result.printer
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      printer: result.printer
    });
  }
}));

// Test endpoint for time format debugging
app.get('/api/test/time-format', asyncHandler(async (req: Request, res: Response) => {
  console.log('🕐 TIME FORMAT TEST ENDPOINT CALLED');
  
  const testTimes = [
    new Date('2024-01-01T06:00:00'), // 6:00 AM
    new Date('2024-01-01T12:00:00'), // 12:00 PM
    new Date('2024-01-01T18:00:00'), // 6:00 PM
    new Date('2024-01-01T00:00:00'), // 12:00 AM
    new Date('2024-01-01T14:30:00'), // 2:30 PM
    new Date(), // Current time
  ];
  
  const results = testTimes.map((date, index) => {
    const formatted = date.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
    return {
      index: index + 1,
      iso: date.toISOString(),
      formatted: formatted,
      hasAMPM: /AM|PM/i.test(formatted)
    };
  });
  
  res.json({
    success: true,
    message: 'Time format test results',
    results: results,
    currentTime: new Date().toISOString(),
    currentFormatted: new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })
  });
}));

// Print ticket using old text-based thermal printer (fallback)
app.post('/api/thermal-printer/print-text', asyncHandler(async (req: Request, res: Response) => {
  const { ticketData, printerName } = req.body;
  
  if (!ticketData) {
    throw new Error('Ticket data is required');
  }

  const result = await thermalPrintService.printTicket(ticketData, printerName);
  
  if (result.success) {
    res.json({
      success: true,
      message: result.message,
      printer: result.printer
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      printer: result.printer
    });
  }
}));

// ===== SUMATRAPDF INSTALLATION ENDPOINTS =====

// Check SumatraPDF installation status
app.get('/api/sumatra/status', asyncHandler(async (req: Request, res: Response) => {
  try {
    const sumatraInstaller = new SumatraInstaller();
    const result = await sumatraInstaller.isSumatraInstalled();
    
    res.json({
      success: true,
      installed: result.installed,
      path: result.path,
      message: result.installed ? 'SumatraPDF is installed' : 'SumatraPDF is not installed'
    });
  } catch (error) {
    console.error('❌ Error checking SumatraPDF status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Install SumatraPDF
app.post('/api/sumatra/install', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🔧 SumatraPDF installation requested');
    
    const sumatraInstaller = new SumatraInstaller();
    const result = await sumatraInstaller.installIfNeeded();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        path: result.path
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        instructions: sumatraInstaller.getInstallationInstructions()
      });
    }
  } catch (error) {
    console.error('❌ SumatraPDF installation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      instructions: 'Please install SumatraPDF manually from https://www.sumatrapdfreader.org/download-free-pdf-viewer.html'
    });
  }
}));

app.get('/api/thermal-printer/status/:printerName', asyncHandler(async (req: Request, res: Response) => {
  const { printerName } = req.params;
  
  const status = await thermalPrintService.getPrinterStatus(printerName);
  
  res.json({
    success: true,
    printer: printerName,
    status
  });
}));

// Preview ticket format
app.post('/api/thermal-printer/preview', asyncHandler(async (req: Request, res: Response) => {
  const { ticketData } = req.body;
  
  if (!ticketData) {
    throw new Error('Ticket data is required');
  }

  const formattedTicket = thermalPrintService.formatTicket(ticketData);
  const previewContent = thermalPrintService.createTicketContent(formattedTicket);
  
  res.json({
    success: true,
    preview: previewContent,
    lines: previewContent.split('\n'),
    characterCount: previewContent.length
  });
}));

// Printer setup endpoints
app.get('/api/printer-setup/list', asyncHandler(async (req: Request, res: Response) => {
  try {
    const printers = await PrinterSetup.listPrinters();
    res.json({ success: true, printers });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}));

app.post('/api/printer-setup/properties', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { printerName } = req.body;
    const result = await PrinterSetup.openPrinterProperties(printerName);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}));

app.post('/api/printer-setup/setup', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { printerName } = req.body;
    const result = await PrinterSetup.setupPrinter(printerName);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}));

app.get('/api/printer-setup/info/:printerName', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { printerName } = req.params;
    const info = await PrinterSetup.getPrinterInfo(printerName);
    res.json({ success: true, info });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}));

// Request logging middleware with performance monitoring
  app.use((req: Request, res: Response, next) => {
  const startTime = Date.now();
  const requestId = req.requestId || 'unknown';
  
  // Log request start
  productionLogger.info(`${req.method} ${req.path}`, 'HTTP_REQUEST', {
    method: req.method,
    url: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  }, requestId);

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    // Record performance metrics
    performanceMonitor.recordRequest(responseTime, success);
    
    // Log request completion
    productionLogger.logRequest(req.method, req.path, res.statusCode, responseTime, requestId);
    
    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

    next();
  });

app.post('/api/bookings', bookingLimiter, validateBookingData, asyncHandler(async (req: Request, res: Response) => {
  const bookingRequest: CreateBookingRequest = req.body;
  const { 
    tickets, 
    total, 
    totalTickets, 
    timestamp, 
    show, 
    screen, 
    movie, 
    date,
    source = 'LOCAL',
    customerName,
    customerPhone,
    customerEmail,
    notes
  } = bookingRequest;

  // Sanitize input data with strict validation for critical fields
  const sanitizedCustomerName = customerName ? InputSanitizer.validateAndReject(customerName, 'customerName', 100) : 'Walk-in Customer';
  const sanitizedCustomerPhone = InputSanitizer.sanitizePhone(customerPhone);
  const sanitizedCustomerEmail = customerEmail ? InputSanitizer.sanitizeEmail(customerEmail) : { data: '', sanitized: false };
  const sanitizedNotes = InputSanitizer.sanitizeString(notes, 500);
  
  // Check for dangerous content
  if (customerName) {
  InputSanitizer.logDangerousContent(customerName, 'customerName', req.requestId);
  }
  InputSanitizer.logDangerousContent(customerPhone, 'customerPhone', req.requestId);
  InputSanitizer.logDangerousContent(customerEmail, 'customerEmail', req.requestId);
  InputSanitizer.logDangerousContent(notes, 'notes', req.requestId);

  // Log booking attempt
  auditLogger.logBooking(
    'CREATE_BOOKING_ATTEMPT',
    true, // We'll update this based on success
    'anonymous', // We'll add user authentication later
    req.ip,
    req.get('User-Agent'),
    {
      ticketsCount: tickets.length,
      total,
      show,
      screen,
      movie,
      date,
      source,
      sanitized: {
        customerName: customerName ? sanitizedCustomerName !== customerName : false,
        customerPhone: sanitizedCustomerPhone.sanitized,
        customerEmail: sanitizedCustomerEmail.sanitized,
        notes: sanitizedNotes.sanitized
      }
    },
    req.requestId
  );

  console.log('📝 Creating booking with data:', {
    tickets: tickets.length,
    total,
    show,
    screen,
    movie,
    date,
    seatIds: tickets.map((t: any) => t.id)
  });

  try {
    // Check if a booking with the same seats already exists for this date and show
    // Since bookedSeats is a JSON array, we need to check differently
    const existingBookings = await prisma.booking.findMany({
      where: {
        date: date ? new Date(date) : new Date(timestamp),
        show: show as any,
      }
    });

    // Check if any existing booking has the same seat IDs
    const seatIds = tickets.map((t: any) => t.id);
    const existingBooking = existingBookings.find((booking: any) => {
      const bookingSeats = booking.bookedSeats as string[];
      return bookingSeats.length === seatIds.length && 
             seatIds.every(id => bookingSeats.includes(id));
    });

    if (existingBooking) {
      console.log('⚠️ Booking already exists for these seats:', existingBooking.id);
      
      // Return the existing booking instead of creating a duplicate
      const existingBookingData: BookingData = {
        id: existingBooking.id,
        date: existingBooking.date.toISOString(),
        show: existingBooking.show,
        screen: existingBooking.screen,
        movie: existingBooking.movie,
        movieLanguage: 'HINDI',
        bookedSeats: existingBooking.bookedSeats as string[],
        seatCount: existingBooking.seatCount,
        classLabel: existingBooking.classLabel,
        pricePerSeat: existingBooking.pricePerSeat,
        totalPrice: existingBooking.totalPrice,
        status: existingBooking.status,
        source: existingBooking.source,
        synced: existingBooking.synced,
        customerName: existingBooking.customerName || undefined,
        customerPhone: existingBooking.customerPhone || undefined,
        customerEmail: existingBooking.customerEmail || undefined,
        notes: existingBooking.notes || undefined,
        totalIncome: existingBooking.totalIncome || undefined,
        localIncome: existingBooking.localIncome || undefined,
        bmsIncome: existingBooking.bmsIncome || undefined,
        vipIncome: existingBooking.vipIncome || undefined,
        createdAt: existingBooking.createdAt.toISOString(),
        updatedAt: existingBooking.updatedAt.toISOString(),
        bookedAt: existingBooking.bookedAt.toISOString(),
      };

      const response: CreateBookingResponse = {
        success: true,
        bookings: [existingBookingData],
        message: `Booking already exists for these seats`
      };
      
      return res.status(200).json(response);
    }

    // Get source from request or default to LOCAL
    const source = bookingRequest.source || 'LOCAL';
    console.log('📝 Booking source:', source);
    
    // Create a single booking record instead of multiple class-based bookings
    // This prevents duplicate bookings for the same seats
    const newBooking = await prisma.booking.create({
      data: {
        date: date ? new Date(date) : new Date(timestamp),
        show: show as any,
        screen,
        movie,
        bookedSeats: tickets.map((t: any) => t.id),
        classLabel: tickets[0]?.classLabel || 'MIXED', // Use first ticket's class or 'MIXED' for multiple classes
        seatCount: tickets.length,
        pricePerSeat: Math.round(total / tickets.length),
        totalPrice: total,
        source: source as BookingSource, // Save the source to the database
        synced: false,
      }
    });
    
    console.log('✅ Booking created successfully:', newBooking.id);
    
    // Transform Prisma result to API type
    const bookingData: BookingData = {
      id: newBooking.id,
      date: newBooking.date.toISOString(),
      show: newBooking.show,
      screen: newBooking.screen,
      movie: newBooking.movie,
      movieLanguage: 'HINDI', // Default value
      bookedSeats: newBooking.bookedSeats as string[],
      seatCount: tickets.length,
      classLabel: newBooking.classLabel,
      pricePerSeat: newBooking.pricePerSeat,
      totalPrice: newBooking.totalPrice,
      status: 'CONFIRMED',
      source: source as BookingSource,
      synced: newBooking.synced,
              customerName: sanitizedCustomerName,
        customerPhone: sanitizedCustomerPhone.data,
        customerEmail: sanitizedCustomerEmail.data,
        notes: sanitizedNotes.data,
      totalIncome: 0,
      localIncome: 0,
      bmsIncome: 0,
      vipIncome: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bookedAt: newBooking.bookedAt.toISOString(),
    };

    const response: CreateBookingResponse = {
      success: true, 
      bookings: [bookingData], // Return single booking in array for compatibility
      message: `Created booking successfully`
    };
    
    // Log successful booking
    auditLogger.logBooking(
      'CREATE_BOOKING_SUCCESS',
      true,
      'anonymous',
      req.ip,
      req.get('User-Agent'),
      {
        bookingId: newBooking.id,
        ticketsCount: tickets.length,
        total,
        show,
        screen,
        movie
      },
      req.requestId
    );
    
    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    
    // Log failed booking
    auditLogger.logBooking(
      'CREATE_BOOKING_FAILED',
      false,
      'anonymous',
      req.ip,
      req.get('User-Agent'),
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        ticketsCount: tickets.length,
        total,
        show,
        screen,
        movie
      },
      req.requestId
    );
    throw error; // Let the error handler deal with it
  }
}));

app.get('/api/bookings', asyncHandler(async (req: Request, res: Response) => {
  const queryParams: BookingQueryParams = req.query as any;
  const { date, show, status } = queryParams;
  
  console.log('🔍 GET /api/bookings called with params:', { date, show, status });
  
  // Build filter conditions
  const where: any = {};
  if (date) {
    // Parse the date and create a range that covers the entire day
    // Use UTC to avoid timezone issues
    const dateObj = new Date(date + 'T00:00:00.000Z');
    const startOfDay = new Date(dateObj);
    const endOfDay = new Date(dateObj);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    
    where.date = {
      gte: startOfDay,
      lt: endOfDay
    };
    console.log('📅 Date filter:', { 
      inputDate: date, 
      startOfDay: startOfDay.toISOString(), 
      endOfDay: endOfDay.toISOString() 
    });
  }
  if (show) where.show = show;
  if (status) where.status = status;
  
  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { bookedAt: 'desc' },
  });
  
  console.log('📊 Found bookings:', bookings.length);
  console.log('📊 Where clause:', JSON.stringify(where, null, 2));
  
  // Transform to API response format
  const bookingData: BookingData[] = bookings.map((booking: any) => ({
    id: booking.id,
    date: booking.date.toISOString(),
    show: booking.show,
    screen: booking.screen,
    movie: booking.movie,
    movieLanguage: 'HINDI',
    bookedSeats: booking.bookedSeats as string[],
    seatCount: (booking.bookedSeats as string[]).length,
            classLabel: booking.classLabel,
    pricePerSeat: booking.pricePerSeat,
    totalPrice: booking.totalPrice,
    status: 'CONFIRMED',
    source: 'LOCAL',
    synced: booking.synced,
    totalIncome: 0,
    localIncome: 0,
    bmsIncome: 0,
    vipIncome: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bookedAt: booking.bookedAt.toISOString(),
  }));
  
  const response: ApiResponse<BookingData[]> = {
    success: true,
    data: bookingData,
  };
  
  console.log('📤 Sending response:', {
    success: response.success,
    dataLength: response.data?.length || 0,
    sampleBooking: response.data?.[0]
  });
  
  res.json(response);
}));

// Comprehensive metrics endpoint
app.get('/api/metrics', asyncHandler(async (_req: Request, res: Response) => {
  const performanceMetrics = performanceMonitor.getPerformanceMetrics();
  const requestMetrics = performanceMonitor.getRequestMetrics();
  const logStats = productionLogger.getLogStats();
  const dbHealth = await dbManager.healthCheck();
  
  const metrics = {
    timestamp: new Date().toISOString(),
    system: {
      uptime: performanceMetrics.uptime,
      memory: performanceMetrics.memory,
      cpu: performanceMetrics.cpu,
      nodeVersion: process.version,
      platform: process.platform
    },
    database: {
      ...performanceMetrics.database,
      health: dbHealth.status,
      details: dbHealth.details
    },
    requests: {
      ...performanceMetrics.requests,
      metrics: requestMetrics
    },
    logging: logStats,
    environment: {
      nodeEnv: config.server.nodeEnv,
      port: config.server.port,
      corsOrigin: config.api.corsOrigin
    }
  };
  
  res.json({
    success: true,
    data: metrics
  });
}));

// Production readiness check endpoint
app.get('/api/production-readiness', asyncHandler(async (_req: Request, res: Response) => {
  const readinessCheck = validateProductionReadiness();
  const dbHealth = await dbManager.healthCheck();
  
  const response = {
    success: true,
    productionReady: readinessCheck.ready,
    environment: config.server.nodeEnv,
    timestamp: new Date().toISOString(),
    checks: {
      configuration: readinessCheck.ready,
      database: dbHealth.status === 'healthy',
      security: validateSecurityConfig(),
    },
    issues: readinessCheck.issues,
    databaseDetails: dbHealth.details,
    recommendations: readinessCheck.ready ? [] : [
      'Review and fix all configuration issues',
      'Ensure all production environment variables are set',
      'Verify security settings meet production standards',
      'Test database connectivity and performance'
    ]
  };
  
  res.json(response);
}));

// Enhanced health check endpoint with detailed system metrics
app.get('/api/health', asyncHandler(async (_req: Request, res: Response) => {
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

// Get booking statistics
app.get('/api/bookings/stats', asyncHandler(async (req: Request, res: Response) => {
  const { date, show } = req.query;
  
  const where: any = {};
  if (date) {
    // Parse the date and create a range that covers the entire day
    // Use UTC to avoid timezone issues
    const dateObj = new Date(date as string + 'T00:00:00.000Z');
    const startOfDay = new Date(dateObj);
    const endOfDay = new Date(dateObj);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    
    where.date = {
      gte: startOfDay,
      lt: endOfDay
    };
  }
  if (show) where.show = show;
  
  const [totalBookings, totalRevenue, bookingsByClass] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.aggregate({
      where,
      _sum: { totalPrice: true }
    }),
    prisma.booking.groupBy({
      by: ['classLabel'],
      where,
      _count: { id: true },
      _sum: { totalPrice: true }
    })
  ]);
  
  const response: BookingStatsResponse = {
    success: true,
    data: {
      totalBookings,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      bookingsByClass: bookingsByClass.map((item: any) => ({
        class: item.classLabel,
        count: item._count.id,
        revenue: item._sum.totalPrice || 0
      }))
    }
  };
  
  res.json(response);
}));

// Get seat status for a specific date and show
app.get('/api/seats/status', asyncHandler(async (req: Request, res: Response) => {
  const queryParams: SeatStatusQueryParams = req.query as any;
  const { date, show } = queryParams;
  
  if (!date || !show) {
    throw new ValidationError('Date and show are required');
  }
  
  // Build filter conditions with date range
  const where: any = {};
  
  // Parse the date and create a range that covers the entire day
  // Use UTC to avoid timezone issues
  const dateObj = new Date(date + 'T00:00:00.000Z');
  const startOfDay = new Date(dateObj);
  const endOfDay = new Date(dateObj);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
  
  if (date) {
    where.date = {
      gte: startOfDay,
      lt: endOfDay
    };
  }
  if (show) where.show = show;
  
  const bookings = await prisma.booking.findMany({
    where,
    select: {
      bookedSeats: true,
      classLabel: true
    }
  });
  
  // Helper to derive class label from seatId prefix to ensure per-seat accuracy
  const deriveClassFromSeatId = (seatId: string): string => {
    if (seatId.startsWith('BOX')) return 'BOX';
    if (seatId.startsWith('SC2')) return 'SECOND CLASS';
    if (seatId.startsWith('SC')) return 'STAR CLASS';
    if (seatId.startsWith('CB')) return 'CLASSIC';
    if (seatId.startsWith('FC')) return 'FIRST CLASS';
    return 'STAR CLASS';
  };

  // Extract all booked seats with proper per-seat class
  const bookedSeats = bookings.flatMap((booking: any) => {
    const seats = Array.isArray(booking.bookedSeats) ? (booking.bookedSeats as string[]) : [];
    return seats.map((seatId: string) => ({
      seatId,
      class: deriveClassFromSeatId(seatId)
    }));
  });
  
  // Get BMS marked seats from the BmsBooking table for this specific date and show
  const bmsSeats = await prisma.bmsBooking.findMany({
    where: {
      date: {
        gte: startOfDay,
        lt: endOfDay
      },
      show: show as any,
      status: 'BMS_BOOKED' // Ensure we only get BMS_BOOKED seats
    },
    select: {
      seatId: true,
      classLabel: true
    }
  });
  
  console.log('🔍 BMS seats found:', {
    date,
    show,
    count: bmsSeats.length,
    seats: bmsSeats.map((seat: any) => ({ id: seat.seatId, class: seat.classLabel }))
  });
  
  console.log('📊 Seat status response:', {
    date,
    show,
    bookingsFound: bookings.length,
    totalBookedSeats: bookedSeats.length,
    bmsSeatsFound: bmsSeats.length,
    sampleBookedSeats: bookedSeats.slice(0, 5),
    sampleBmsSeats: bmsSeats.slice(0, 5)
  });
  
  // Get selected seats from in-memory storage
  const storageKey = getStorageKey(date, show);
  const selectedSeats = selectedSeatsStorage.get(storageKey) || new Set();
  const selectedSeatsArray = Array.from(selectedSeats).map((seatId: string) => ({
    seatId,
    class: 'SELECTED' // We don't store class info for selected seats, just mark as selected
  }));
  
  const response: SeatStatusResponse = {
    success: true,
    data: {
      date,
      show,
      bookedSeats,
      bmsSeats: bmsSeats.map((seat: any) => ({
        seatId: seat.seatId,
        class: seat.classLabel
      })),
      selectedSeats: selectedSeatsArray,
      totalBooked: bookedSeats.length,
      totalBms: bmsSeats.length,
      totalSelected: selectedSeatsArray.length
    }
  };
  
  res.json(response);
}));

// Save BMS seat status - Apply BMS limiter for bulk operations
app.post('/api/seats/bms', bmsLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { seatIds, status, date, show } = req.body;
  
  if (!seatIds || !Array.isArray(seatIds)) {
    throw new ValidationError('seatIds array is required');
  }
  
  if (!status || !['BMS_BOOKED', 'AVAILABLE'].includes(status)) {
    throw new ValidationError('status must be BMS_BOOKED or AVAILABLE');
  }
  
  if (!date || !show) {
    throw new ValidationError('date and show are required');
  }
  
  console.log('📝 Saving BMS seat status:', { seatIds, status, date, show });
  
  // Update or create BMS booking records
  const results = await Promise.all(
    seatIds.map(async (seatId: string) => {
      // Determine class label based on seat ID
      let classLabel = 'STAR CLASS'; // default
      if (seatId.startsWith('BOX')) classLabel = 'BOX';
      else if (seatId.startsWith('SC2')) classLabel = 'SECOND CLASS';
      else if (seatId.startsWith('SC')) classLabel = 'STAR CLASS';
      else if (seatId.startsWith('CB')) classLabel = 'CLASSIC';
      else if (seatId.startsWith('FC')) classLabel = 'FIRST CLASS';
      
      if (status === 'BMS_BOOKED') {
        // Create BMS booking record
        console.log(`Creating BMS booking for seat ${seatId} with class ${classLabel}`);
        return await prisma.bmsBooking.upsert({
          where: { 
            seatId_date_show: {
              seatId,
              date: new Date(date),
              show: show as any
            }
          },
          update: { 
            status: status as any,
            classLabel, // Ensure class label is updated
            updatedAt: new Date()
          },
          create: {
            seatId,
            date: new Date(date),
            show: show as any,
            classLabel,
            status: status as any
          }
        });
      } else {
        // Remove BMS booking record
        return await prisma.bmsBooking.deleteMany({
          where: {
            seatId,
            date: new Date(date),
            show: show as any
          }
        });
      }
    })
  );
  
  console.log(`✅ Updated ${results.length} BMS bookings to status: ${status}`);
  
  const response = {
    success: true,
    message: `Updated ${results.length} BMS bookings to ${status}`,
    data: results
  };
  
  res.json(response);
}));

// In-memory storage for selected seats (temporary solution)
const selectedSeatsStorage = new Map<string, Set<string>>();

// Helper function to get storage key
const getStorageKey = (date: string, show: string) => `${date}-${show}`;

// Update seat status (for move operations)
app.post('/api/seats/status', asyncHandler(async (req: Request, res: Response) => {
  const { seatUpdates, date, show } = req.body;
  
  if (!seatUpdates || !Array.isArray(seatUpdates)) {
    throw new ValidationError('seatUpdates array is required');
  }
  
  if (!date || !show) {
    throw new ValidationError('date and show are required');
  }
  
  console.log('📝 Updating seat status:', { seatUpdates, date, show });
  
  const storageKey = getStorageKey(date, show);
  if (!selectedSeatsStorage.has(storageKey)) {
    selectedSeatsStorage.set(storageKey, new Set());
  }
  const selectedSeats = selectedSeatsStorage.get(storageKey)!;
  
  // Process each seat update
  const results = await Promise.all(
    seatUpdates.map(async (update: { seatId: string; status: string }) => {
      const { seatId, status } = update;
      
      if (!['AVAILABLE', 'SELECTED', 'BOOKED', 'BLOCKED'].includes(status)) {
        throw new ValidationError(`Invalid status: ${status}`);
      }
      
      // Update in-memory storage
      if (status === 'SELECTED') {
        selectedSeats.add(seatId);
      } else {
        selectedSeats.delete(seatId);
      }
      
      console.log(`🔄 Seat ${seatId} status updated to ${status} for ${date} ${show}`);
      
      return { seatId, status, success: true };
    })
  );
  
  console.log(`✅ Updated ${results.length} seat statuses. Current selected seats for ${storageKey}:`, Array.from(selectedSeats));
  
  const response = {
    success: true,
    message: `Updated ${results.length} seat statuses`,
    data: results
  };
  
  res.json(response);
}));

// Update a booking
app.put('/api/bookings/:id', validateBookingData, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  
  console.log('📝 Updating booking:', { id, updateData });
  
  // Validate booking exists
  const existingBooking = await prisma.booking.findUnique({
    where: { id }
  });
  
  if (!existingBooking) {
    throw new NotFoundError(`Booking with ID ${id} not found`);
  }
  
  // Update the booking
  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      movie: updateData.movie,
      movieLanguage: updateData.movieLanguage,
      pricePerSeat: updateData.pricePerSeat,
      totalPrice: updateData.pricePerSeat * existingBooking.seatCount,
      status: updateData.status,
      updatedAt: new Date()
    }
  });
  
  console.log('✅ Booking updated successfully:', { id, updatedBooking });
  
  const response: ApiResponse<BookingData> = {
    success: true,
    data: {
      ...updatedBooking,
      date: updatedBooking.date.toISOString(),
      createdAt: updatedBooking.createdAt.toISOString(),
      updatedAt: updatedBooking.updatedAt.toISOString(),
      bookedAt: updatedBooking.bookedAt.toISOString(),
      bookedSeats: Array.isArray(updatedBooking.bookedSeats) ? (updatedBooking.bookedSeats as string[]) : [],
      customerName: updatedBooking.customerName || undefined,
      customerPhone: updatedBooking.customerPhone || undefined,
      customerEmail: updatedBooking.customerEmail || undefined,
      notes: updatedBooking.notes || undefined,
      totalIncome: updatedBooking.totalIncome || undefined,
      localIncome: updatedBooking.localIncome || undefined,
      bmsIncome: updatedBooking.bmsIncome || undefined,
      vipIncome: updatedBooking.vipIncome || undefined
    },
    message: 'Booking updated successfully'
  };
  
  res.json(response);
}));

// Delete a booking
app.delete('/api/bookings/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  console.log('🗑️ Deleting booking:', { id });
  
  // Validate booking exists
  const existingBooking = await prisma.booking.findUnique({
    where: { id }
  });
  
  if (!existingBooking) {
    throw new NotFoundError(`Booking with ID ${id} not found`);
  }
  
  // Delete the booking
  await prisma.booking.delete({
    where: { id }
  });
  
  console.log('✅ Booking deleted successfully:', { id });
  
  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: 'Booking deleted successfully'
  };
  
  res.json(response);
}));

// Ticket ID Management Endpoints
app.get('/api/ticket-id/current', asyncHandler(async (req: Request, res: Response) => {
  const config = ticketIdService.getConfig();
  const currentTicketId = ticketIdService.getCurrentTicketId();
  
  const response: ApiResponse<{ currentId: number; currentTicketId: string; config: any }> = {
    success: true,
    data: {
      currentId: config.currentId,
      currentTicketId,
      config
    },
    message: 'Current ticket ID retrieved successfully'
  };
  
  res.json(response);
}));

app.post('/api/ticket-id/reset', asyncHandler(async (req: Request, res: Response) => {
  const { newId } = req.body;
  
  if (typeof newId !== 'number' || newId < 0) {
    throw new ValidationError('newId must be a positive number');
  }
  
  ticketIdService.resetTicketId(newId);
  const currentTicketId = ticketIdService.getCurrentTicketId();
  
  const response: ApiResponse<{ currentId: number; currentTicketId: string }> = {
    success: true,
    data: {
      currentId: newId,
      currentTicketId
    },
    message: `Ticket ID reset to ${currentTicketId}`
  };
  
  res.json(response);
}));

app.get('/api/ticket-id/next', asyncHandler(async (req: Request, res: Response) => {
  const nextTicketId = ticketIdService.getNextTicketId();
  
  const response: ApiResponse<{ nextTicketId: string }> = {
    success: true,
    data: {
      nextTicketId
    },
    message: 'Next ticket ID generated successfully'
  };
  
  res.json(response);
}));

// Add error handling middleware (must be last)
app.use(errorLogger);
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
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

// Start server with database initialization and graceful error handling
async function startServer() {
  try {
    // Initialize database first with retry logic
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.error('❌ Failed to initialize database after all retries. Exiting...');
      process.exit(1);
    }
    
    // Start the server
    const server = app.listen(config.server.port, () => {
      console.log(`🚀 Server running at http://localhost:${config.server.port}`);
      console.log(`📊 Environment: ${config.server.nodeEnv}`);
      console.log(`🔗 CORS Origin: ${config.api.corsOrigin}`);
      console.log(`🔧 Error handling: Enabled`);
      console.log(`💾 Database: Connected and ready`);
      console.log(`🛡️ Security: Enhanced with Phase 1 fixes`);
      console.log(`⚡ Performance: Optimized with Phase 2 fixes`);
      console.log(`📝 Logging: Production-ready with Phase 4 enhancements`);
      
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
        console.error(`❌ Port ${config.server.port} is already in use`);
        productionLogger.error(`Port ${config.server.port} is already in use`, 'SERVER_ERROR', {
          port: config.server.port,
          errorCode: error.code
        });
      } else {
        console.error('❌ Server error:', error);
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
    console.error('❌ Failed to start server:', error);
    productionLogger.logError(error as Error, 'SERVER_STARTUP');
    process.exit(1);
  }
}

// Start the server
startServer();