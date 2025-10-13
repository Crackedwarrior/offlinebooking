# 📚 AuditoriumX API Documentation

## Overview
This document provides comprehensive API documentation for AuditoriumX, including all endpoints, request/response formats, and authentication requirements.

## Base URL
```
http://localhost:3001/api
```

## Authentication
Most endpoints require proper authentication. The application uses JWT tokens for authentication.

## Response Format
All API responses follow a consistent format:

```json
{
  "success": boolean,
  "data": object | array,
  "error": {
    "type": string,
    "message": string,
    "code": number,
    "details": object,
    "timestamp": string,
    "requestId": string
  },
  "message": string
}
```

## Health & Monitoring Endpoints

### GET /api/health
**Description**: Comprehensive health check with system metrics  
**Authentication**: None required  
**Rate Limit**: None

**Response**:
```json
{
  "status": "healthy" | "unhealthy",
  "timestamp": "2024-01-27T10:30:00.000Z",
  "environment": "development" | "production",
  "database": "healthy" | "unhealthy",
  "databaseDetails": "string",
  "system": {
    "uptime": 3600000,
    "memory": {
      "used": 128,
      "total": 512,
      "percentage": 25
    },
    "requests": {
      "total": 1000,
      "averageResponseTime": 150,
      "errorRate": 0.5
    },
    "database": {
      "connectionCount": 5,
      "queryCount": 500,
      "averageQueryTime": 25
    }
  },
  "logging": {
    "totalFiles": 3,
    "totalSize": 15,
    "oldestLog": "app-2024-01-25.log",
    "newestLog": "app-2024-01-27.log"
  },
  "warnings": []
}
```

### GET /api/metrics
**Description**: Detailed system metrics and performance data  
**Authentication**: None required  
**Rate Limit**: 30 requests per minute

**Response**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-27T10:30:00.000Z",
    "system": {
      "uptime": 3600000,
      "memory": {
        "used": 128,
        "total": 512,
        "percentage": 25
      },
      "cpu": {
        "usage": 15.5
      },
      "nodeVersion": "v18.17.0",
      "platform": "win32"
    },
    "database": {
      "connectionCount": 5,
      "queryCount": 500,
      "averageQueryTime": 25,
      "health": "healthy",
      "details": "Connection successful"
    },
    "requests": {
      "total": 1000,
      "averageResponseTime": 150,
      "errorRate": 0.5,
      "metrics": {
        "totalRequests": 1000,
        "successfulRequests": 995,
        "failedRequests": 5,
        "slowestRequest": 2000,
        "fastestRequest": 50
      }
    },
    "logging": {
      "totalFiles": 3,
      "totalSize": 15,
      "oldestLog": "app-2024-01-25.log",
      "newestLog": "app-2024-01-27.log"
    },
    "environment": {
      "nodeEnv": "production",
      "port": 3001,
      "corsOrigin": "http://localhost:8080"
    }
  }
}
```

### GET /api/production-readiness
**Description**: Production readiness validation  
**Authentication**: None required  
**Rate Limit**: 10 requests per minute

**Response**:
```json
{
  "success": true,
  "productionReady": true,
  "environment": "production",
  "timestamp": "2024-01-27T10:30:00.000Z",
  "checks": {
    "configuration": true,
    "database": true,
    "security": true
  },
  "issues": [],
  "databaseDetails": "Connection successful",
  "recommendations": []
}
```

## Booking Management Endpoints

### POST /api/bookings
**Description**: Create a new booking  
**Authentication**: Required  
**Rate Limit**: 100 requests per minute

**Request Body**:
```json
{
  "tickets": [
    {
      "id": "A1",
      "row": "A",
      "number": 1,
      "classLabel": "PREMIUM",
      "price": 150
    }
  ],
  "total": 150,
  "totalTickets": 1,
  "timestamp": "2024-01-27T10:30:00.000Z",
  "show": "MORNING",
  "screen": "Screen 1",
  "movie": "Movie Name",
  "date": "2024-01-27",
  "source": "LOCAL",
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "customerEmail": "john@example.com",
  "notes": "Special requirements"
}
```

**Response**:
```json
{
  "success": true,
  "bookings": [
    {
      "id": "booking_id",
      "date": "2024-01-27",
      "show": "MORNING",
      "screen": "Screen 1",
      "movie": "Movie Name",
      "movieLanguage": "English",
      "bookedSeats": ["A1"],
      "seatCount": 1,
      "classLabel": "PREMIUM",
      "pricePerSeat": 150,
      "totalPrice": 150,
      "status": "CONFIRMED",
      "source": "LOCAL",
      "synced": true,
      "customerName": "John Doe",
      "customerPhone": "9876543210",
      "customerEmail": "john@example.com",
      "notes": "Special requirements",
      "createdAt": "2024-01-27T10:30:00.000Z",
      "updatedAt": "2024-01-27T10:30:00.000Z",
      "bookedAt": "2024-01-27T10:30:00.000Z"
    }
  ],
  "message": "Booking created successfully"
}
```

### GET /api/bookings
**Description**: Get booking history with pagination  
**Authentication**: Required  
**Rate Limit**: 200 requests per minute

**Query Parameters**:
- `date` (optional): Filter by date (YYYY-MM-DD)
- `show` (optional): Filter by show (MORNING, MATINEE, EVENING, NIGHT)
- `status` (optional): Filter by status (CONFIRMED, CANCELLED, PENDING, REFUNDED)
- `source` (optional): Filter by source (LOCAL, BMS, VIP, ONLINE)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "booking_id",
      "date": "2024-01-27",
      "show": "MORNING",
      "screen": "Screen 1",
      "movie": "Movie Name",
      "bookedSeats": ["A1", "A2"],
      "seatCount": 2,
      "classLabel": "PREMIUM",
      "pricePerSeat": 150,
      "totalPrice": 300,
      "status": "CONFIRMED",
      "source": "LOCAL",
      "customerName": "John Doe",
      "createdAt": "2024-01-27T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### GET /api/bookings/stats
**Description**: Get booking statistics  
**Authentication**: Required  
**Rate Limit**: 100 requests per minute

**Query Parameters**:
- `date` (optional): Filter by date (YYYY-MM-DD)
- `show` (optional): Filter by show (MORNING, MATINEE, EVENING, NIGHT)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalBookings": 50,
    "totalRevenue": 7500,
    "bookingsByClass": [
      {
        "class": "PREMIUM",
        "count": 30,
        "revenue": 4500
      },
      {
        "class": "STANDARD",
        "count": 20,
        "revenue": 3000
      }
    ]
  }
}
```

## Seat Management Endpoints

### GET /api/seats/status
**Description**: Get seat status for a specific date and show  
**Authentication**: Required  
**Rate Limit**: 200 requests per minute

**Query Parameters**:
- `date` (required): Date in YYYY-MM-DD format
- `show` (required): Show type (MORNING, MATINEE, EVENING, NIGHT)

**Response**:
```json
{
  "success": true,
  "data": {
    "date": "2024-01-27",
    "show": "MORNING",
    "bookedSeats": [
      {
        "seatId": "A1",
        "class": "PREMIUM"
      }
    ],
    "bmsSeats": [
      {
        "seatId": "A2",
        "class": "PREMIUM"
      }
    ],
    "selectedSeats": [
      {
        "seatId": "A3",
        "class": "PREMIUM"
      }
    ],
    "totalBooked": 1,
    "totalBms": 1,
    "totalSelected": 1
  }
}
```

### PUT /api/seats/status
**Description**: Update seat status  
**Authentication**: Required  
**Rate Limit**: 100 requests per minute

**Request Body**:
```json
{
  "date": "2024-01-27",
  "show": "MORNING",
  "selectedSeats": [
    {
      "seatId": "A1",
      "class": "PREMIUM"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Seat status updated successfully"
}
```

### POST /api/seats/bms
**Description**: Save BMS (Book My Show) seat data  
**Authentication**: Required  
**Rate Limit**: 50 requests per minute

**Request Body**:
```json
{
  "date": "2024-01-27",
  "show": "MORNING",
  "bmsSeats": [
    {
      "seatId": "A1",
      "classLabel": "PREMIUM"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "BMS seat data saved successfully"
}
```

## Print Service Endpoints

### POST /api/print
**Description**: Print tickets  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute

**Request Body**:
```json
{
  "tickets": [
    {
      "id": "A1",
      "row": "A",
      "number": 1,
      "classLabel": "PREMIUM",
      "price": 150
    }
  ],
  "show": "MORNING",
  "showTime": "10:00 AM",
  "movie": "Movie Name",
  "date": "2024-01-27",
  "screen": "Screen 1",
  "seatRange": "A1",
  "totalAmount": 150,
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "printerType": "thermal",
  "language": "english"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Tickets printed successfully",
  "printedTickets": 1,
  "printerUsed": "thermal"
}
```

## Movie Management Endpoints

### GET /api/movies
**Description**: Get all movies  
**Authentication**: Required  
**Rate Limit**: 100 requests per minute

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "movie_id",
      "name": "Movie Name",
      "language": "English",
      "screen": "Screen 1",
      "isActive": true,
      "createdAt": "2024-01-27T10:30:00.000Z",
      "updatedAt": "2024-01-27T10:30:00.000Z"
    }
  ]
}
```

### POST /api/movies
**Description**: Create a new movie  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute

**Request Body**:
```json
{
  "name": "Movie Name",
  "language": "English",
  "screen": "Screen 1"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "movie_id",
    "name": "Movie Name",
    "language": "English",
    "screen": "Screen 1",
    "isActive": true,
    "createdAt": "2024-01-27T10:30:00.000Z",
    "updatedAt": "2024-01-27T10:30:00.000Z"
  },
  "message": "Movie created successfully"
}
```

### PUT /api/movies/:id
**Description**: Update a movie  
**Authentication**: Required  
**Rate Limit**: 20 requests per minute

**Request Body**:
```json
{
  "name": "Updated Movie Name",
  "language": "Hindi",
  "screen": "Screen 2",
  "isActive": false
}
```

### DELETE /api/movies/:id
**Description**: Delete a movie  
**Authentication**: Required  
**Rate Limit**: 10 requests per minute

**Response**:
```json
{
  "success": true,
  "message": "Movie deleted successfully"
}
```

## Error Codes

### Standard HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **429**: Too Many Requests
- **500**: Internal Server Error

### Custom Error Types
- **VALIDATION_ERROR**: Input validation failed
- **NOT_FOUND**: Resource not found
- **DATABASE_ERROR**: Database operation failed
- **PRINTER_ERROR**: Printer operation failed
- **AUTHENTICATION_ERROR**: Authentication failed

### Error Response Format
```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "code": 400,
    "details": {
      "field": "customerName",
      "reason": "Name is required"
    },
    "timestamp": "2024-01-27T10:30:00.000Z",
    "requestId": "req_123456"
  }
}
```

## Rate Limiting

All endpoints are protected by rate limiting to ensure fair usage and prevent abuse.

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706356200
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": {
    "type": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "code": 429,
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetTime": "2024-01-27T11:30:00.000Z"
    },
    "timestamp": "2024-01-27T10:30:00.000Z"
  }
}
```

## Security

### Input Validation
All inputs are validated and sanitized to prevent injection attacks.

### CORS Configuration
CORS is configured to allow only authorized origins.

### Request Logging
All requests are logged with unique request IDs for tracing.

### Authentication
JWT tokens are required for most endpoints with proper validation.

## Testing

### Health Check Test
```bash
curl -X GET http://localhost:3001/api/health
```

### Authentication Test
```bash
curl -X POST http://localhost:3001/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"tickets": [{"id": "A1", "row": "A", "number": 1, "classLabel": "PREMIUM", "price": 150}], "total": 150, "totalTickets": 1, "show": "MORNING", "movie": "Test Movie"}'
```

### Metrics Test
```bash
curl -X GET http://localhost:3001/api/metrics
```

---

**Last Updated**: January 2024  
**API Version**: 1.0  
**Documentation Version**: 1.0
