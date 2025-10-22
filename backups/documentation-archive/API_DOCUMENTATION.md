# AuditoriumX API Documentation

## Overview
AuditoriumX is a professional theater booking system with a comprehensive REST API for managing bookings, shows, movies, and system configuration.

## Base URL
- **Development:** `http://localhost:3001`
- **Production:** `http://localhost:3001` (embedded in Electron app)

## Authentication
Currently, the API does not require authentication for theater management operations. This is suitable for offline desktop applications.

## Response Format
All API responses follow this standard format:

```json
{
  "success": true|false,
  "data": any,
  "message": "string",
  "error": "string" // Only present when success is false
}
```

## Error Codes
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

---

## 📅 Booking Management

### Create Booking
**POST** `/api/bookings`

Creates a new booking for selected seats.

**Request Body:**
```json
{
  "tickets": [
    {
      "id": "A1",
      "row": "A",
      "number": 1,
      "classLabel": "BOX",
      "price": 150
    }
  ],
  "total": 150,
  "totalTickets": 1,
  "timestamp": "2025-09-28T10:30:00.000Z",
  "show": "EVENING",
  "screen": "Screen 1",
  "movie": "Movie Name",
  "date": "2025-09-28",
  "source": "LOCAL",
  "customerName": "John Doe",
  "customerPhone": "9876543210",
  "customerEmail": "john@example.com",
  "notes": "Special request"
}
```

**Response:**
```json
{
  "success": true,
  "bookings": [
    {
      "id": "booking-uuid",
      "date": "2025-09-28T00:00:00.000Z",
      "show": "EVENING",
      "screen": "Screen 1",
      "movie": "Movie Name",
      "movieLanguage": "HINDI",
      "bookedSeats": ["A1"],
      "seatCount": 1,
      "classLabel": "BOX",
      "pricePerSeat": 150,
      "totalPrice": 150,
      "status": "CONFIRMED",
      "source": "LOCAL",
      "customerName": "John Doe",
      "customerPhone": "9876543210",
      "customerEmail": "john@example.com",
      "notes": "Special request",
      "createdAt": "2025-09-28T10:30:00.000Z",
      "updatedAt": "2025-09-28T10:30:00.000Z",
      "bookedAt": "2025-09-28T10:30:00.000Z"
    }
  ],
  "message": "Booking created successfully"
}
```

### Get Bookings
**GET** `/api/bookings`

Retrieves bookings with optional filtering.

**Query Parameters:**
- `date` (optional) - Filter by date (YYYY-MM-DD)
- `show` (optional) - Filter by show (MORNING, MATINEE, EVENING, NIGHT)
- `status` (optional) - Filter by status (CONFIRMED, CANCELLED, PENDING, REFUNDED)
- `source` (optional) - Filter by source (LOCAL, BMS, VIP, ONLINE)
- `limit` (optional) - Number of results (default: 100)
- `offset` (optional) - Number to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "booking-uuid",
      "date": "2025-09-28T00:00:00.000Z",
      "show": "EVENING",
      "screen": "Screen 1",
      "movie": "Movie Name",
      "bookedSeats": ["A1", "A2"],
      "seatCount": 2,
      "classLabel": "BOX",
      "pricePerSeat": 150,
      "totalPrice": 300,
      "status": "CONFIRMED",
      "source": "LOCAL",
      "customerName": "John Doe",
      "createdAt": "2025-09-28T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

### Update Booking
**PUT** `/api/bookings/:id`

Updates an existing booking.

**Request Body:**
```json
{
  "status": "CANCELLED",
  "customerName": "Jane Doe",
  "notes": "Updated notes"
}
```

### Delete Booking
**DELETE** `/api/bookings/:id`

Deletes a booking.

**Response:**
```json
{
  "success": true,
  "message": "Booking deleted successfully"
}
```

---

## 🎬 Show Time Management

### Get All Show Times
**GET** `/api/shows`

Retrieves all configured show times.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "show-uuid",
      "show": "MORNING",
      "startTime": "10:00",
      "endTime": "13:00",
      "isActive": true,
      "createdAt": "2025-09-28T10:00:00.000Z",
      "updatedAt": "2025-09-28T10:00:00.000Z"
    }
  ]
}
```

### Add Show Time
**POST** `/api/shows`

Creates a new show time configuration.

**Request Body:**
```json
{
  "key": "SPECIAL",
  "label": "Special Show",
  "startTime": "15:00",
  "endTime": "18:00",
  "enabled": true
}
```

**Validation Rules:**
- `key`: Uppercase, alphanumeric, max 20 characters
- `label`: Max 50 characters
- `startTime`/`endTime`: HH:MM format (24-hour)
- `key` must be unique

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "show-uuid",
    "show": "SPECIAL",
    "startTime": "15:00",
    "endTime": "18:00",
    "isActive": true,
    "createdAt": "2025-09-28T10:00:00.000Z",
    "updatedAt": "2025-09-28T10:00:00.000Z"
  },
  "message": "Show time added successfully"
}
```

### Update Show Time
**PUT** `/api/shows/:key`

Updates an existing show time.

**Request Body:**
```json
{
  "startTime": "15:30",
  "endTime": "18:30",
  "enabled": false
}
```

### Delete Show Time
**DELETE** `/api/shows/:key`

Deletes a show time configuration.

**Response:**
```json
{
  "success": true,
  "message": "Show time deleted successfully"
}
```

---

## 🎫 Seat Management

### Get Seat Status
**GET** `/api/seats/status`

Retrieves seat availability for a specific date and show.

**Query Parameters:**
- `date` (required) - Date in YYYY-MM-DD format
- `show` (required) - Show time (MORNING, MATINEE, EVENING, NIGHT)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "seatId": "A1",
      "class": "BOX",
      "status": "AVAILABLE"
    },
    {
      "seatId": "A2",
      "class": "BOX",
      "status": "BOOKED"
    }
  ]
}
```

### Update Seat Status
**POST** `/api/seats/status`

Updates multiple seat statuses.

**Request Body:**
```json
{
  "seatUpdates": [
    {
      "seatId": "A1",
      "status": "BOOKED"
    },
    {
      "seatId": "A2",
      "status": "AVAILABLE"
    }
  ],
  "date": "2025-09-28",
  "show": "EVENING"
}
```

---

## 🎟️ Ticket ID Management

### Get Current Ticket ID
**GET** `/api/ticket-id/current`

Retrieves the current ticket ID counter.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentId": 5,
    "currentTicketId": "TKT000005",
    "config": {
      "prefix": "TKT",
      "padding": 6
    }
  }
}
```

### Reset Ticket ID
**POST** `/api/ticket-id/reset`

Resets the ticket ID counter to a new value.

**Request Body:**
```json
{
  "newId": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentId": 10,
    "currentTicketId": "TKT000010"
  },
  "message": "Ticket ID reset successfully"
}
```

### Get Next Ticket ID
**GET** `/api/ticket-id/next`

Gets the next available ticket ID without incrementing the counter.

**Response:**
```json
{
  "success": true,
  "data": {
    "nextTicketId": "TKT000006"
  }
}
```

---

## 🖨️ Printing Services

### Print Ticket (Thermal)
**POST** `/api/thermal-printer/print`

Prints a ticket using thermal printer.

**Request Body:**
```json
{
  "ticketData": {
    "theaterName": "SREELEKHA THEATER",
    "location": "Chikmagalur",
    "gstin": "29AAVFS7423E120",
    "movie": "Movie Name",
    "date": "28-09-2025",
    "show": "EVENING",
    "screen": "Screen 1",
    "seatId": "A1",
    "classLabel": "BOX",
    "price": 150,
    "net": 125.12,
    "cgst": 11.44,
    "sgst": 11.44,
    "mc": 2.00,
    "totalAmount": 150,
    "individualAmount": 150,
    "seatCount": 1,
    "ticketId": "TKT000005"
  },
  "printerName": "EPSON TM-T81 ReceiptE4"
}
```

### Print Ticket (PDF)
**POST** `/api/pdf-printer/print`

Prints a ticket as PDF.

**Request Body:** Same as thermal printer

### Preview Ticket Format
**POST** `/api/thermal-printer/preview`

Preview ticket format without printing.

**Request Body:** Same as thermal printer

---

## 📊 Reports & Analytics

### Get Booking Statistics
**GET** `/api/bookings/stats`

Retrieves booking statistics.

**Query Parameters:**
- `startDate` (optional) - Start date for statistics
- `endDate` (optional) - End date for statistics
- `groupBy` (optional) - Group by: day, week, month

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBookings": 150,
    "totalRevenue": 22500,
    "averageBookingValue": 150,
    "bookingsByShow": {
      "MORNING": 30,
      "MATINEE": 40,
      "EVENING": 50,
      "NIGHT": 30
    },
    "bookingsByClass": {
      "BOX": 60,
      "STAR CLASS": 90
    },
    "bookingsBySource": {
      "LOCAL": 120,
      "BMS": 20,
      "VIP": 10
    }
  }
}
```

---

## 🔧 System Configuration

### Get Theater Configuration
**GET** `/api/theater/config`

Retrieves theater configuration settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "SREELEKHA THEATER",
    "location": "Chikmagalur",
    "gstin": "29AAVFS7423E120",
    "defaultTaxValues": {
      "net": 125.12,
      "cgst": 11.44,
      "sgst": 11.44,
      "mc": 2.00,
      "totalAmount": 150
    }
  }
}
```

### Health Check
**GET** `/api/health`

Checks system health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-09-28T10:30:00.000Z",
    "version": "1.0.4",
    "database": "connected",
    "uptime": 3600
  }
}
```

---

## 📝 Data Models

### Booking Model
```typescript
interface Booking {
  id: string;
  date: DateTime;
  show: Show;
  screen: string;
  movie: string;
  movieLanguage: string;
  bookedSeats: string[];
  seatCount: number;
  classLabel: string;
  pricePerSeat: number;
  totalPrice: number;
  status: BookingStatus;
  source: BookingSource;
  synced: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
  bookedAt: DateTime;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  totalIncome?: number;
  localIncome?: number;
  bmsIncome?: number;
  vipIncome?: number;
}
```

### Show Configuration Model
```typescript
interface ShowConfig {
  id: string;
  show: Show;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Enums
```typescript
enum Show {
  MORNING = "MORNING",
  MATINEE = "MATINEE", 
  EVENING = "EVENING",
  NIGHT = "NIGHT"
}

enum BookingStatus {
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  PENDING = "PENDING",
  REFUNDED = "REFUNDED"
}

enum BookingSource {
  LOCAL = "LOCAL",
  BMS = "BMS",
  VIP = "VIP",
  ONLINE = "ONLINE"
}

enum SeatStatus {
  AVAILABLE = "AVAILABLE",
  BOOKED = "BOOKED",
  BLOCKED = "BLOCKED",
  BMS_BOOKED = "BMS_BOOKED",
  SELECTED = "SELECTED"
}
```

---

## 🚨 Error Handling

### Validation Errors
When validation fails, the API returns a 400 status with detailed error messages:

```json
{
  "success": false,
  "error": "Show key must be uppercase, alphanumeric, and max 20 characters"
}
```

### Database Errors
Database errors are handled gracefully and return appropriate error messages:

```json
{
  "success": false,
  "error": "Show time key already exists"
}
```

### Server Errors
Internal server errors return a 500 status with generic error messages:

```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## 📋 Rate Limiting

The API implements rate limiting to prevent abuse:
- **Default:** 100 requests per 15 minutes per IP
- **Booking endpoints:** 50 requests per 15 minutes per IP
- **Print endpoints:** 20 requests per 15 minutes per IP

---

## 🔒 Security Features

- **Input Sanitization:** All user inputs are sanitized
- **SQL Injection Protection:** Prisma ORM prevents SQL injection
- **XSS Protection:** Content Security Policy headers
- **CORS Configuration:** Properly configured for desktop app
- **Request Validation:** Comprehensive input validation
- **Error Logging:** Security events are logged for audit

---

## 📚 Examples

### Complete Booking Flow
```bash
# 1. Get seat status
GET /api/seats/status?date=2025-09-28&show=EVENING

# 2. Create booking
POST /api/bookings
{
  "tickets": [{"id": "A1", "row": "A", "number": 1, "classLabel": "BOX", "price": 150}],
  "total": 150,
  "totalTickets": 1,
  "timestamp": "2025-09-28T10:30:00.000Z",
  "show": "EVENING",
  "screen": "Screen 1",
  "movie": "Movie Name",
  "date": "2025-09-28",
  "source": "LOCAL"
}

# 3. Print ticket
POST /api/thermal-printer/print
{
  "ticketData": {...},
  "printerName": "EPSON TM-T81 ReceiptE4"
}
```

### Show Time Management
```bash
# 1. Get all show times
GET /api/shows

# 2. Add new show time
POST /api/shows
{
  "key": "SPECIAL",
  "label": "Special Show",
  "startTime": "15:00",
  "endTime": "18:00",
  "enabled": true
}

# 3. Update show time
PUT /api/shows/SPECIAL
{
  "startTime": "15:30",
  "enabled": false
}
```

---

## 📞 Support

For technical support or questions about the API:
- **Version:** 1.0.4
- **Last Updated:** September 28, 2025
- **Compatibility:** Windows 10/11 desktop application

---

*This documentation covers the complete AuditoriumX API. All endpoints are designed for offline theater management with robust error handling and validation.*
