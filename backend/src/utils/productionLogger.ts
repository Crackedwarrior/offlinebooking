import fs from 'fs';
import path from 'path';
import { config } from '../config';

/**
 * Production Logging System
 * Provides structured logging with file rotation and different log levels
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  requestId?: string;
  userId?: string;
}

class ProductionLogger {
  private logDir: string;
  private maxFileSize: number;
  private maxFiles: number;
  private currentLogFile: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxFiles = 5;
    this.currentLogFile = this.getLogFileName();
    
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `app-${date}.log`);
  }

  private shouldRotateLog(): boolean {
    try {
      const stats = fs.statSync(this.currentLogFile);
      return stats.size > this.maxFileSize;
    } catch {
      return false;
    }
  }

  private rotateLogFile(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = path.join(this.logDir, `app-${timestamp}.log`);
    
    if (fs.existsSync(this.currentLogFile)) {
      fs.renameSync(this.currentLogFile, rotatedFile);
    }
    
    this.currentLogFile = this.getLogFileName();
    this.cleanupOldLogs();
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          mtime: fs.statSync(path.join(this.logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Keep only the most recent files
      const filesToDelete = files.slice(this.maxFiles);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
      });
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }

  private writeLog(entry: LogEntry): void {
    try {
      // Check if log rotation is needed
      if (this.shouldRotateLog()) {
        this.rotateLogFile();
      }

      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.currentLogFile, logLine);

      // Also log to console in development
      if (config.server.isDevelopment) {
        const consoleMessage = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
        if (entry.context) {
          console.log(consoleMessage + ` (${entry.context})`);
        } else {
          console.log(consoleMessage);
        }
      }
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  private createLogEntry(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>, requestId?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
      requestId
    };
  }

  public error(message: string, context?: string, metadata?: Record<string, any>, requestId?: string): void {
    this.writeLog(this.createLogEntry(LogLevel.ERROR, message, context, metadata, requestId));
  }

  public warn(message: string, context?: string, metadata?: Record<string, any>, requestId?: string): void {
    this.writeLog(this.createLogEntry(LogLevel.WARN, message, context, metadata, requestId));
  }

  public info(message: string, context?: string, metadata?: Record<string, any>, requestId?: string): void {
    this.writeLog(this.createLogEntry(LogLevel.INFO, message, context, metadata, requestId));
  }

  public debug(message: string, context?: string, metadata?: Record<string, any>, requestId?: string): void {
    if (config.server.isDevelopment) {
      this.writeLog(this.createLogEntry(LogLevel.DEBUG, message, context, metadata, requestId));
    }
  }

  // Specialized logging methods
  public logRequest(method: string, url: string, statusCode: number, responseTime: number, requestId: string): void {
    this.info(`${method} ${url}`, 'HTTP_REQUEST', {
      method,
      url,
      statusCode,
      responseTime,
      userAgent: 'N/A' // Could be extracted from request
    }, requestId);
  }

  public logDatabaseQuery(query: string, duration: number, requestId?: string): void {
    this.debug(`Database query executed`, 'DATABASE', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      duration
    }, requestId);
  }

  public logSecurityEvent(event: string, details: Record<string, any>, requestId?: string): void {
    this.warn(`Security event: ${event}`, 'SECURITY', details, requestId);
  }

  public logBusinessEvent(event: string, details: Record<string, any>, requestId?: string): void {
    this.info(`Business event: ${event}`, 'BUSINESS', details, requestId);
  }

  public logError(error: Error, context?: string, requestId?: string): void {
    this.error(`Error: ${error.message}`, context, {
      stack: error.stack,
      name: error.name
    }, requestId);
  }

  // Get log statistics
  public getLogStats(): { totalFiles: number; totalSize: number; oldestLog: string; newestLog: string } {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          size: fs.statSync(path.join(this.logDir, file)).size,
          mtime: fs.statSync(path.join(this.logDir, file)).mtime
        }));

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const sortedFiles = files.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      return {
        totalFiles: files.length,
        totalSize,
        oldestLog: sortedFiles[0]?.name || 'N/A',
        newestLog: sortedFiles[sortedFiles.length - 1]?.name || 'N/A'
      };
    } catch {
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestLog: 'N/A',
        newestLog: 'N/A'
      };
    }
  }
}

// Export singleton instance
export const productionLogger = new ProductionLogger();
export default productionLogger;
