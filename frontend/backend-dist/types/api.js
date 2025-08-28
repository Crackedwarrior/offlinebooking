"use strict";
// API Type Definitions for Backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.isApiResponse = isApiResponse;
exports.isAppError = isAppError;
exports.isBookingData = isBookingData;
exports.isCreateBookingRequest = isCreateBookingRequest;
// Request/Response Type Guards
function isApiResponse(obj) {
    return typeof obj === 'object' && obj !== null && 'success' in obj;
}
function isAppError(obj) {
    return typeof obj === 'object' && obj !== null &&
        'type' in obj && 'message' in obj && 'code' in obj;
}
function isBookingData(obj) {
    return typeof obj === 'object' && obj !== null &&
        'id' in obj && 'date' in obj && 'show' in obj && 'movie' in obj;
}
function isCreateBookingRequest(obj) {
    return typeof obj === 'object' && obj !== null &&
        'tickets' in obj && 'total' in obj && 'show' in obj && 'movie' in obj;
}
