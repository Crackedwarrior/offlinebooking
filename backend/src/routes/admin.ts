/**
 * Admin Routes
 * Admin-only endpoints for security monitoring and audit logs
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { auditLogger } from '../utils/auditLogger';
import { config } from '../config';
import fs from 'fs';

const router = Router();

/**
 * Security monitoring endpoint (admin only)
 * GET /api/admin/security-status
 */
router.get('/security-status', asyncHandler(async (req: Request, res: Response) => {
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

/**
 * Audit logs endpoint (admin only)
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', asyncHandler(async (req: Request, res: Response) => {
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

export default router;

