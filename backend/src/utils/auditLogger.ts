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
  private logQueue: AuditEvent[] = [];
  private isProcessing: boolean = false;

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

  /**
   * Log an event asynchronously (non-blocking)
   * Adds event to queue and processes in background
   */
  public log(event: Omit<AuditEvent, 'timestamp'>) {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    // Log to console immediately (non-blocking)
    if (config.server.isDevelopment) {
      console.log(`[AUDIT] ${auditEvent.eventType} - ${auditEvent.action} - ${auditEvent.success ? 'SUCCESS' : 'FAILED'}`);
    }

    // Add to queue (instant, non-blocking)
    this.logQueue.push(auditEvent);

    // Process queue in background (don't wait)
    this.processQueue().catch((error) => {
      console.error('[AUDIT] Failed to process log queue:', error);
    });
  }

  /**
   * Process log queue asynchronously
   * Writes all queued logs in batches for better performance
   */
  private async processQueue(): Promise<void> {
    // Skip if already processing or queue is empty
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get all queued events and clear queue
      const events = this.logQueue.splice(0);
      
      // Format all log entries
      const logEntries = events.map(event => this.formatLogEntry(event)).join('');
      
      // Write all at once (faster than one-by-one)
      await fs.promises.appendFile(this.logFile, logEntries);
      
    } catch (error) {
      console.error('[AUDIT] Failed to write logs:', error);
      // Note: Failed logs are lost, but this doesn't affect booking functionality
      // In production, you might want to retry or use a more robust logging solution
    } finally {
      this.isProcessing = false;
      
      // Process remaining items if queue was added to during processing
      if (this.logQueue.length > 0) {
        // Recursively process remaining items (non-blocking)
        setImmediate(() => this.processQueue().catch(err => {
          console.error('[AUDIT] Error in recursive queue processing:', err);
        }));
      }
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

  /**
   * Flush all queued logs (for graceful shutdown)
   * Waits for current processing and processes remaining queue
   */
  public async flush(): Promise<void> {
    // Wait for current processing to finish (max 5 seconds)
    const maxWait = 5000;
    const startTime = Date.now();
    while (this.isProcessing && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Process remaining queue
    if (this.logQueue.length > 0) {
      await this.processQueue();
    }

    // Wait one more time for final processing
    const finalWait = 1000;
    const finalStartTime = Date.now();
    while (this.isProcessing && (Date.now() - finalStartTime) < finalWait) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  public getLogFilePath(): string {
    return this.logFile;
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
