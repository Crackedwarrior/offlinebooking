// Error handling utilities for the backend

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  code: number;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export class ValidationError extends Error {
  public type = ErrorType.VALIDATION_ERROR;
  public code = 400;
  public details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends Error {
  public type = ErrorType.NOT_FOUND;
  public code = 404;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  public type = ErrorType.UNAUTHORIZED;
  public code = 401;

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  public type = ErrorType.FORBIDDEN;
  public code = 403;

  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  public type = ErrorType.CONFLICT;
  public code = 409;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends Error {
  public type = ErrorType.DATABASE_ERROR;
  public code = 500;

  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Error response formatter
export function formatError(error: Error, requestId?: string): AppError {
  const baseError: AppError = {
    type: ErrorType.INTERNAL_ERROR,
    message: error.message || 'Internal server error',
    code: 500,
    timestamp: new Date().toISOString(),
    requestId,
  };

  if (error instanceof ValidationError) {
    return {
      ...baseError,
      type: ErrorType.VALIDATION_ERROR,
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  if (error instanceof NotFoundError) {
    return {
      ...baseError,
      type: ErrorType.NOT_FOUND,
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof UnauthorizedError) {
    return {
      ...baseError,
      type: ErrorType.UNAUTHORIZED,
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof ForbiddenError) {
    return {
      ...baseError,
      type: ErrorType.FORBIDDEN,
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof ConflictError) {
    return {
      ...baseError,
      type: ErrorType.CONFLICT,
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof DatabaseError) {
    return {
      ...baseError,
      type: ErrorType.DATABASE_ERROR,
      message: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.originalError : undefined,
    };
  }

  return baseError;
}

// Validation helpers
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateEnum(value: any, validValues: string[], fieldName: string): void {
  if (!validValues.includes(value)) {
    throw new ValidationError(`${fieldName} must be one of: ${validValues.join(', ')}`);
  }
}

export function validateDate(value: any, fieldName: string): void {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }
}

export function validateArray(value: any, fieldName: string): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }
}

export function validateNumber(value: any, fieldName: string, min?: number, max?: number): void {
  const num = Number(value);
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }
  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`);
  }
}

// Database error handler
export function handleDatabaseError(error: any, operation: string): never {
  console.error(`Database error during ${operation}:`, error);
  
  if (error.code === 'P2002') {
    throw new ConflictError('Resource already exists');
  }
  
  if (error.code === 'P2025') {
    throw new NotFoundError('Resource not found');
  }
  
  if (error.code === 'P2003') {
    throw new ValidationError('Invalid foreign key reference');
  }
  
  throw new DatabaseError(`Database operation failed: ${operation}`, error);
}

// Request ID generator
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
} 