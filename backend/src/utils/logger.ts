/**
 * Logger Utility
 * Simple wrapper around productionLogger with automatic context
 * 
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.debug('Detailed info');
 *   logger.info('Important event');
 *   logger.warn('Warning message');
 *   logger.error('Error occurred');
 */

import { productionLogger } from './productionLogger';
import path from 'path';

/**
 * Get module name from file path for context
 */
function getModuleContext(filePath?: string): string {
  if (!filePath) {
    return 'UNKNOWN';
  }
  
  // Extract filename from path
  const filename = path.basename(filePath, path.extname(filePath));
  
  // Try to extract meaningful context from path
  const pathParts = filePath.split(path.sep);
  const srcIndex = pathParts.indexOf('src');
  if (srcIndex >= 0 && srcIndex < pathParts.length - 1) {
    // Get path after 'src' (e.g., 'controllers/BookingController')
    const contextPath = pathParts.slice(srcIndex + 1, -1).join('/');
    return contextPath ? `${contextPath}/${filename}` : filename;
  }
  
  return filename;
}

/**
 * Logger instance with automatic context
 */
class Logger {
  private context: string;

  constructor(context?: string) {
    // Try to get context from caller's file path
    // Note: This is a best-effort approach. In production, we'll use the provided context
    // or fall back to a default. For better context, pass it explicitly when creating logger.
    this.context = context || 'APP';
  }

  /**
   * Create a logger with specific context
   */
  static withContext(context: string): Logger {
    return new Logger(context);
  }

  /**
   * Debug level - detailed information for debugging
   * Only logged in development mode
   */
  debug(message: string, metadata?: Record<string, any>, requestId?: string): void {
    productionLogger.debug(message, this.context, metadata, requestId);
  }

  /**
   * Info level - important business events
   */
  info(message: string, metadata?: Record<string, any>, requestId?: string): void {
    productionLogger.info(message, this.context, metadata, requestId);
  }

  /**
   * Warn level - warnings, fallbacks, retries
   */
  warn(message: string, metadata?: Record<string, any>, requestId?: string): void {
    productionLogger.warn(message, this.context, metadata, requestId);
  }

  /**
   * Error level - errors, exceptions, failures
   */
  error(message: string, metadata?: Record<string, any>, requestId?: string): void {
    productionLogger.error(message, this.context, metadata, requestId);
  }
}

// Default logger instance
export const logger = new Logger('APP');

// Export Logger class for creating context-specific loggers
export { Logger };

