import { Request, Response, NextFunction } from 'express';
import { formatError, generateRequestId, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, DatabaseError } from '../utils/errors';
import { config } from '../config';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

// Request ID middleware
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// Error logging middleware
export function errorLogger(error: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = req.requestId || 'unknown';
  
  console.error(`[${new Date().toISOString()}] Error ${requestId}:`, {
    error: error.message,
    stack: config.server.isDevelopment ? error.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  next(error);
}

// Global error handler middleware
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = req.requestId || 'unknown';
  
  // Format the error response
  const errorResponse = formatError(error, requestId);
  
  // Set appropriate status code
  res.status(errorResponse.code);
  
  // Send error response
  res.json({
    success: false,
    error: errorResponse,
  });
}

// Async error wrapper for route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Validation middleware
export function validateBookingData(req: Request, res: Response, next: NextFunction) {
  try {
    const { tickets, total, totalTickets, timestamp, show, screen, movie, date } = req.body;
    
    // Validate required fields
    validateRequired(tickets, 'tickets');
    validateRequired(timestamp, 'timestamp');
    validateRequired(show, 'show');
    validateRequired(screen, 'screen');
    validateRequired(movie, 'movie');
    
    // Validate show enum
    validateEnum(show, ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'], 'show');
    
    // Validate tickets array
    validateArray(tickets, 'tickets');
    
    // Validate ticket structure
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      validateRequired(ticket.id, `tickets[${i}].id`);
      validateRequired(ticket.classLabel, `tickets[${i}].classLabel`);
      validateNumber(ticket.price, `tickets[${i}].price`, 0);
    }
    
    // Validate total
    validateNumber(total, 'total', 0);
    
    // Validate date if provided
    if (date) {
      validateDate(date, 'date');
    }
    
    next();
  } catch (error) {
    next(error);
  }
}

// Import validation helpers
import { validateRequired, validateEnum, validateDate, validateArray, validateNumber } from '../utils/errors'; 