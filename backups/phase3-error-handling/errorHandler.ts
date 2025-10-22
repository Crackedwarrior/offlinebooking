// Error handling utilities for the frontend

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
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

export interface ApiErrorResponse {
  success: false;
  error: AppError;
}

// Error classes for frontend
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

export class NetworkError extends Error {
  public type = ErrorType.NETWORK_ERROR;
  public code = 0;

  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  public type = ErrorType.TIMEOUT_ERROR;
  public code = 408;

  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Error formatter for API responses
export function formatApiError(response: ApiErrorResponse): AppError {
  return {
    type: response.error.type as ErrorType,
    message: response.error.message,
    code: response.error.code,
    details: response.error.details,
    timestamp: response.error.timestamp,
    requestId: response.error.requestId,
  };
}

// Error handler for fetch requests
export function handleFetchError(response: Response, requestId?: string): never {
  if (response.status === 400) {
    throw new ValidationError('Invalid request data');
  }
  
  if (response.status === 401) {
    throw new Error('Unauthorized access');
  }
  
  if (response.status === 403) {
    throw new Error('Access forbidden');
  }
  
  if (response.status === 404) {
    throw new Error('Resource not found');
  }
  
  if (response.status === 409) {
    throw new Error('Resource conflict');
  }
  
  if (response.status === 408) {
    throw new TimeoutError();
  }
  
  if (response.status >= 500) {
    throw new Error('Server error occurred');
  }
  
  throw new Error(`HTTP error: ${response.status}`);
}

// Error handler for network errors
export function handleNetworkError(error: any): never {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    throw new NetworkError('Unable to connect to server');
  }
  
  if (error.name === 'AbortError') {
    throw new TimeoutError();
  }
  
  throw error;
}

// User-friendly error messages
export function getUserFriendlyMessage(error: Error | AppError): string {
  const message = 'message' in error ? error.message : String(error);
  
  // Common error patterns
  if (message.includes('NetworkError') || message.includes('fetch')) {
    return 'Unable to connect to server. Please check your internet connection.';
  }
  
  if (message.includes('TimeoutError') || message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  if (message.includes('ValidationError')) {
    return 'Please check your input and try again.';
  }
  
  if (message.includes('Unauthorized')) {
    return 'You are not authorized to perform this action.';
  }
  
  if (message.includes('Forbidden')) {
    return 'Access denied. You do not have permission for this action.';
  }
  
  if (message.includes('Not found')) {
    return 'The requested resource was not found.';
  }
  
  if (message.includes('Server error')) {
    return 'A server error occurred. Please try again later.';
  }
  
  return message;
}

// Error logging
export function logError(error: Error | AppError, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    error: error.message,
    stack: 'stack' in error ? error.stack : undefined,
    type: 'type' in error ? error.type : 'UNKNOWN',
    code: 'code' in error ? error.code : 'UNKNOWN',
  };
  
  console.error('Application Error:', errorInfo);
  
  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToErrorTrackingService(errorInfo);
  }
}

// Error boundary helper
export function isErrorBoundaryError(error: Error): boolean {
  return error.name === 'ErrorBoundaryError';
}

// Retry logic for failed requests
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof ValidationError || 
          error instanceof NetworkError ||
          'code' in error && error.code === 400) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError!;
}

// Error notification helper
export function showErrorNotification(error: Error | AppError): void {
  const message = getUserFriendlyMessage(error);
  
  // You can integrate with your toast notification system here
  console.error('Error Notification:', message);
  
  // Example with a toast system:
  // toast({
  //   title: 'Error',
  //   description: message,
  //   variant: 'destructive',
  // });
} 