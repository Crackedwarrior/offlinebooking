import fs from 'fs';
import path from 'path';
import { config } from '../config';

export interface AuditEvent {
  timestamp: string;
  eventType: 'AUTH' | 'BOOKING' | 'PRINT' | 'ADMIN' | 'SECURITY' | 'ERROR';
  action: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
  requestId?: string;
  success: boolean;
}

class AuditLogger {
  private logDir: string;
  private logFile: string;

  constructor() {
    // Create logs directory in the same location as the database
    const appDataPath = process.env.NODE_ENV === 'production' 
      ? process.cwd() 
      : path.join(__dirname, '../../');
    
    this.logDir = path.join(appDataPath, 'logs');
    this.logFile = path.join(this.logDir, 'audit.log');
    
    // Ensure logs directory exists
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  private formatLogEntry(event: AuditEvent): string {
    const baseEntry = {
      timestamp: event.timestamp,
      eventType: event.eventType,
      action: event.action,
      userId: event.userId || 'anonymous',
      ip: event.ip || 'unknown',
      userAgent: event.userAgent || 'unknown',
      requestId: event.requestId || 'unknown',
      success: event.success
    };

    // Only include details if they exist and are not sensitive
    const logEntry = event.details 
      ? { ...baseEntry, details: this.sanitizeDetails(event.details) }
      : baseEntry;

    return JSON.stringify(logEntry) + '\n';
  }

  private sanitizeDetails(details: any): any {
    // Remove sensitive information from logs
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    if (typeof details === 'object' && details !== null) {
      const sanitized = { ...details };
      
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }
      
      return sanitized;
    }
    
    return details;
  }

  public log(event: Omit<AuditEvent, 'timestamp'>) {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    const logEntry = this.formatLogEntry(auditEvent);

    try {
      // Append to log file
      fs.appendFileSync(this.logFile, logEntry);
      
      // Also log to console in development
      if (config.server.isDevelopment) {
        console.log(`[AUDIT] ${auditEvent.eventType} - ${auditEvent.action} - ${auditEvent.success ? 'SUCCESS' : 'FAILED'}`);
      }
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  public logAuth(action: string, success: boolean, userId?: string, ip?: string, userAgent?: string, details?: any, requestId?: string) {
    this.log({
      eventType: 'AUTH',
      action,
      userId,
      ip,
      userAgent,
      details,
      requestId,
      success
    });
  }

  public logBooking(action: string, success: boolean, userId?: string, ip?: string, userAgent?: string, details?: any, requestId?: string) {
    this.log({
      eventType: 'BOOKING',
      action,
      userId,
      ip,
      userAgent,
      details,
      requestId,
      success
    });
  }

  public logPrint(action: string, success: boolean, userId?: string, ip?: string, userAgent?: string, details?: any, requestId?: string) {
    this.log({
      eventType: 'PRINT',
      action,
      userId,
      ip,
      userAgent,
      details,
      requestId,
      success
    });
  }

  public logAdmin(action: string, success: boolean, userId?: string, ip?: string, userAgent?: string, details?: any, requestId?: string) {
    this.log({
      eventType: 'ADMIN',
      action,
      userId,
      ip,
      userAgent,
      details,
      requestId,
      success
    });
  }

  public logSecurity(action: string, success: boolean, userId?: string, ip?: string, userAgent?: string, details?: any, requestId?: string) {
    this.log({
      eventType: 'SECURITY',
      action,
      userId,
      ip,
      userAgent,
      details,
      requestId,
      success
    });
  }

  public logError(action: string, success: boolean, userId?: string, ip?: string, userAgent?: string, details?: any, requestId?: string) {
    this.log({
      eventType: 'ERROR',
      action,
      userId,
      ip,
      userAgent,
      details,
      requestId,
      success
    });
  }

  public getLogFilePath(): string {
    return this.logFile;
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
