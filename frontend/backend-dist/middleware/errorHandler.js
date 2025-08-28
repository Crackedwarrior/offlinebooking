"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
exports.errorLogger = errorLogger;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
exports.validateBookingData = validateBookingData;
const errors_1 = require("../utils/errors");
const config_1 = require("../config");
// Request ID middleware
function requestIdMiddleware(req, res, next) {
    const requestId = req.headers['x-request-id'] || (0, errors_1.generateRequestId)();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
}
// Error logging middleware
function errorLogger(error, req, res, next) {
    const requestId = req.requestId || 'unknown';
    console.error(`[${new Date().toISOString()}] Error ${requestId}:`, {
        error: error.message,
        stack: config_1.config.server.isDevelopment ? error.stack : undefined,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    next(error);
}
// Global error handler middleware
function errorHandler(error, req, res, next) {
    const requestId = req.requestId || 'unknown';
    // Format the error response
    const errorResponse = (0, errors_1.formatError)(error, requestId);
    // Set appropriate status code
    res.status(errorResponse.code);
    // Send error response
    res.json({
        success: false,
        error: errorResponse,
    });
}
// Async error wrapper for route handlers
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Validation middleware
function validateBookingData(req, res, next) {
    try {
        const { tickets, total, totalTickets, timestamp, show, screen, movie, date } = req.body;
        // Validate required fields
        (0, errors_2.validateRequired)(tickets, 'tickets');
        (0, errors_2.validateRequired)(timestamp, 'timestamp');
        (0, errors_2.validateRequired)(show, 'show');
        (0, errors_2.validateRequired)(screen, 'screen');
        (0, errors_2.validateRequired)(movie, 'movie');
        // Validate show enum
        (0, errors_2.validateEnum)(show, ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'], 'show');
        // Validate tickets array
        (0, errors_2.validateArray)(tickets, 'tickets');
        // Validate ticket structure
        for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            (0, errors_2.validateRequired)(ticket.id, `tickets[${i}].id`);
            (0, errors_2.validateRequired)(ticket.classLabel, `tickets[${i}].classLabel`);
            (0, errors_2.validateNumber)(ticket.price, `tickets[${i}].price`, 0);
        }
        // Validate total
        (0, errors_2.validateNumber)(total, 'total', 0);
        // Validate date if provided
        if (date) {
            (0, errors_2.validateDate)(date, 'date');
        }
        next();
    }
    catch (error) {
        next(error);
    }
}
// Import validation helpers
const errors_2 = require("../utils/errors");
