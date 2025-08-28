"use strict";
// Error handling utilities for the backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.ErrorType = void 0;
exports.formatError = formatError;
exports.validateRequired = validateRequired;
exports.validateEnum = validateEnum;
exports.validateDate = validateDate;
exports.validateArray = validateArray;
exports.validateNumber = validateNumber;
exports.handleDatabaseError = handleDatabaseError;
exports.generateRequestId = generateRequestId;
var ErrorType;
(function (ErrorType) {
    ErrorType["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorType["NOT_FOUND"] = "NOT_FOUND";
    ErrorType["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorType["FORBIDDEN"] = "FORBIDDEN";
    ErrorType["CONFLICT"] = "CONFLICT";
    ErrorType["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorType["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorType["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorType["TIMEOUT_ERROR"] = "TIMEOUT_ERROR";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.type = ErrorType.VALIDATION_ERROR;
        this.code = 400;
        this.name = 'ValidationError';
        this.details = details;
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.type = ErrorType.NOT_FOUND;
        this.code = 404;
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.type = ErrorType.UNAUTHORIZED;
        this.code = 401;
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends Error {
    constructor(message = 'Forbidden') {
        super(message);
        this.type = ErrorType.FORBIDDEN;
        this.code = 403;
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.type = ErrorType.CONFLICT;
        this.code = 409;
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class DatabaseError extends Error {
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
        this.type = ErrorType.DATABASE_ERROR;
        this.code = 500;
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
// Error response formatter
function formatError(error, requestId) {
    const baseError = {
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
function validateRequired(value, fieldName) {
    if (value === undefined || value === null || value === '') {
        throw new ValidationError(`${fieldName} is required`);
    }
}
function validateEnum(value, validValues, fieldName) {
    if (!validValues.includes(value)) {
        throw new ValidationError(`${fieldName} must be one of: ${validValues.join(', ')}`);
    }
}
function validateDate(value, fieldName) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        throw new ValidationError(`${fieldName} must be a valid date`);
    }
}
function validateArray(value, fieldName) {
    if (!Array.isArray(value)) {
        throw new ValidationError(`${fieldName} must be an array`);
    }
}
function validateNumber(value, fieldName, min, max) {
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
function handleDatabaseError(error, operation) {
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
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
