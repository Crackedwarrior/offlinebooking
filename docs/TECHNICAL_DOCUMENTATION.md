# AuditoriumX Technical Documentation
## Professional Theater Booking System

**Version:** 1.0.0  
**Last Updated:** September 28, 2025

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Security Implementation](#security-implementation)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Deployment Guide](#deployment-guide)
9. [Development Setup](#development-setup)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## Architecture Overview

### System Architecture
AuditoriumX follows a **desktop application architecture** with the following components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   Frontend      │  │   Backend API   │  │   Database  │  │
│  │   (React)       │  │   (Express)     │  │   (SQLite)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction
1. **Frontend (React):** User interface and state management
2. **Backend (Express):** API server and business logic
3. **Database (SQLite):** Local data persistence
4. **Electron:** Desktop application wrapper

### Data Flow
```
User Action → Frontend → API Call → Backend → Database
                ↓
            State Update ← Response ← Processing ← Query Result
```

---

## Technology Stack

### Frontend Technologies
- **React 18:** UI framework with hooks
- **TypeScript:** Type-safe JavaScript
- **Vite:** Build tool and development server
- **Tailwind CSS:** Utility-first CSS framework
- **Zustand:** State management
- **React Router:** Client-side routing
- **Radix UI:** Accessible UI components
- **Lucide React:** Icon library

### Backend Technologies
- **Node.js:** JavaScript runtime
- **Express.js:** Web framework
- **TypeScript:** Type-safe server code
- **Prisma:** Database ORM
- **SQLite:** Embedded database
- **CORS:** Cross-origin resource sharing
- **Rate Limiting:** Request throttling

### Desktop Application
- **Electron:** Desktop app framework
- **Electron Builder:** Application packaging
- **NSIS:** Windows installer creation

### Development Tools
- **ESLint:** Code linting
- **Prettier:** Code formatting
- **TypeScript Compiler:** Type checking
- **Vite Dev Server:** Hot reload development

---

## Database Schema

### Core Models

#### Booking Model
```prisma
model Booking {
  id            String        @id @default(uuid())
  date          DateTime
  show          Show
  screen        String
  movie         String
  movieLanguage String        @default("HINDI")
  bookedSeats   Json          // Array of seat IDs
  seatCount     Int
  classLabel    String
  pricePerSeat  Int
  totalPrice    Int
  status        BookingStatus @default(CONFIRMED)
  source        BookingSource @default(LOCAL)
  synced        Boolean       @default(false)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  bookedAt      DateTime     @default(now())
  customerName  String?
  customerPhone String?
  customerEmail String?
  notes         String?
  totalIncome   Int?         @default(0)
  localIncome   Int?         @default(0)
  bmsIncome     Int?         @default(0)
  vipIncome     Int?         @default(0)
  seats         Seat[]
  
  @@index([date, show])
  @@index([status])
  @@index([source])
  @@index([classLabel])
  @@index([createdAt])
  @@unique([date, show, bookedSeats])
}
```

#### Show Configuration Model
```prisma
model ShowConfig {
  id        String   @id @default(uuid())
  show      Show     @unique
  startTime String   // HH:MM format
  endTime   String   // HH:MM format
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([show])
  @@index([isActive])
}
```

#### Seat Model
```prisma
model Seat {
  id          String     @id @default(uuid())
  seatId      String     @unique // e.g., "A1", "B5"
  row         String     // e.g., "A", "B"
  number      Int        // e.g., 1, 2, 3
  classLabel  String     // e.g., "BOX", "STAR CLASS"
  status      SeatStatus @default(AVAILABLE)
  bookingId   String?
  booking     Booking?   @relation(fields: [bookingId], references: [id])
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  @@index([seatId])
  @@index([status])
  @@index([classLabel])
}
```

### Enums
```prisma
enum Show {
  MORNING
  MATINEE
  EVENING
  NIGHT
}

enum BookingStatus {
  CONFIRMED
  CANCELLED
  PENDING
  REFUNDED
}

enum BookingSource {
  LOCAL
  BMS
  VIP
  ONLINE
}

enum SeatStatus {
  AVAILABLE
  BOOKED
  BLOCKED
  BMS_BOOKED
  SELECTED
}
```

### Database Indexes
- **Performance Indexes:** Optimized for common queries
- **Unique Constraints:** Prevent duplicate bookings
- **Foreign Key Relations:** Maintain data integrity

---

## 🔌 API Endpoints

### Booking Management
```
POST   /api/bookings              # Create booking
GET    /api/bookings              # List bookings
PUT    /api/bookings/:id           # Update booking
DELETE /api/bookings/:id           # Delete booking
GET    /api/bookings/stats         # Booking statistics
```

### Show Time Management
```
GET    /api/shows                  # List show times
POST   /api/shows                  # Add show time
PUT    /api/shows/:key             # Update show time
DELETE /api/shows/:key             # Delete show time
```

### Seat Management
```
GET    /api/seats/status          # Get seat status
POST   /api/seats/status          # Update seat status
```

### Ticket ID Management
```
GET    /api/ticket-id/current      # Current ticket ID
POST   /api/ticket-id/reset        # Reset ticket ID
GET    /api/ticket-id/next         # Next ticket ID
```

### Printing Services
```
POST   /api/thermal-printer/print  # Print thermal ticket
POST   /api/pdf-printer/print      # Print PDF ticket
POST   /api/thermal-printer/preview # Preview ticket
```

### System Management
```
GET    /api/health                 # Health check
GET    /api/theater/config         # Theater configuration
```

---

## Security Implementation

### Input Validation
```typescript
// Show key validation
const keyRegex = /^[A-Z0-9_]{1,20}$/;
if (!keyRegex.test(key)) {
  throw new ValidationError('Invalid show key format');
}

// Time format validation
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
if (!timeRegex.test(time)) {
  throw new ValidationError('Invalid time format');
}
```

### Input Sanitization
```typescript
class InputSanitizer {
  static sanitizeString(input: any, maxLength: number = 1000): string {
    let sanitized = String(input);
    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    // Trim whitespace
    sanitized = sanitized.trim();
    // Check length
    if (sanitized.length > maxLength) {
      throw new ValidationError(`Input exceeds maximum length`);
    }
    return sanitized;
  }
}
```

### Security Headers
```typescript
// Content Security Policy
const cspPolicy = "default-src 'self'; " +
  "script-src 'self'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; " +
  "font-src 'self' data:; " +
  "connect-src 'self' http://localhost:* ws://localhost:*; " +
  "frame-ancestors 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "object-src 'none';";

res.setHeader('Content-Security-Policy', cspPolicy);
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-XSS-Protection', '1; mode=block');
```

### Rate Limiting
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

---

## Error Handling

### Error Classes
```typescript
export class ValidationError extends Error {
  constructor(message: string, public code: number = 400) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string, public code: number = 404) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

### Global Error Handler
```typescript
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string;
  
  // Log error
  errorLogger(error, req, res, next);
  
  // Format error response
  const formattedError = formatError(error, requestId);
  
  res.status(formattedError.code).json({
    success: false,
    error: formattedError.message,
    requestId: formattedError.requestId,
    timestamp: formattedError.timestamp
  });
}
```

### Database Error Mapping
```typescript
export function handleDatabaseError(error: any, operation: string): never {
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
```

---

## ⚡ Performance Optimization

### Frontend Optimization
```typescript
// Code splitting
const manualChunks = {
  'react-vendor': ['react', 'react-dom'],
  'radix-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
  'forms': ['react-hook-form', 'zod'],
  'charts': ['recharts']
};

// Bundle optimization
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: mode === 'production',
      drop_debugger: mode === 'production'
    }
  }
}
```

### Database Optimization
```prisma
// Strategic indexing
@@index([date, show])        // Common query pattern
@@index([status])            // Filter by status
@@index([source])            // Filter by source
@@index([classLabel])        // Filter by seat class
@@index([createdAt])         // Sort by creation time
```

### Caching Strategy
```typescript
// In-memory caching for frequently accessed data
const cache = new Map();

function getCachedData(key: string, fetcher: () => Promise<any>) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fetcher();
  cache.set(key, data);
  return data;
}
```

---

## Deployment Guide

### Production Build Process
```bash
# 1. Build backend
cd backend
npm run build

# 2. Build frontend
cd frontend
npm run build

# 3. Create installer
npm run electron:dist
```

### Electron Builder Configuration
```json
{
  "appId": "com.auditoriumx.app",
  "productName": "AuditoriumX",
  "directories": {
    "output": "dist-installer"
  },
  "files": [
    "dist/**/*",
    "backend-dist/**/*",
    "electron/**/*"
  ],
  "win": {
    "target": "nsis",
    "icon": "resources/icon.png"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

### Database Migration
```typescript
// Automatic database migration on startup
async function initializeDatabase(): Promise<boolean> {
  // Check for existing database
  const dbPath = config.database.url.replace('file:', '');
  
  if (!fs.existsSync(dbPath)) {
    // Migrate from old locations
    const possibleOldPaths = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'AuditoriumX', 'dev.db')
    ];
    
    for (const oldDbPath of possibleOldPaths) {
      if (fs.existsSync(oldDbPath)) {
        fs.copyFileSync(oldDbPath, dbPath);
        console.log(`Migrated database from ${oldDbPath}`);
        break;
      }
    }
  }
  
  return await dbManager.connect();
}
```

---

## Development Setup

### Prerequisites
- **Node.js:** Version 18 or higher
- **npm:** Version 8 or higher
- **Git:** For version control

### Installation Steps
```bash
# 1. Clone repository
git clone <repository-url>
cd offlinebooking

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Setup database
cd ../backend
npx prisma generate
npx prisma db push

# 5. Start development servers
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Electron (optional)
cd frontend
npm run electron:dev
```

### Development Scripts
```json
{
  "scripts": {
    "dev": "vite --host",
    "build": "npm run build:backend && npm run copy:backend && vite build",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:8080 && electron electron/main.cjs\"",
    "electron:build": "npm run build && electron-builder --win"
  }
}
```

### Environment Configuration
```typescript
// Development environment
const envSchema = z.object({
  DATABASE_URL: z.string().default('file:./prisma/dev.db'),
  PORT: z.string().transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_BASE_URL: z.string().default('http://localhost:3001'),
  CORS_ORIGIN: z.string().default('http://localhost:8080')
});
```

---

## Troubleshooting Guide

### Common Development Issues

#### Database Connection Issues
```bash
# Check database file exists
ls -la backend/prisma/dev.db

# Reset database
npx prisma db push --force-reset

# Check Prisma client
npx prisma generate
```

#### Port Conflicts
```bash
# Check port usage
netstat -ano | findstr :3001
netstat -ano | findstr :8080

# Kill processes using ports
taskkill /PID <PID> /F
```

#### Build Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist backend/dist
npm run build
```

### Production Issues

#### Printer Not Working
```typescript
// Check printer status
const printerStatus = await windowsPrintService.getPrinterStatus(printerName);

// Test print
const testResult = await windowsPrintService.printTestPage(printerName);
```

#### Database Corruption
```typescript
// Database integrity check
const integrityCheck = await prisma.$queryRaw`PRAGMA integrity_check`;

// Backup and restore
const backup = await prisma.$queryRaw`BACKUP TO 'backup.db'`;
```

#### Performance Issues
```typescript
// Database optimization
await prisma.$queryRaw`VACUUM`;

// Index analysis
await prisma.$queryRaw`ANALYZE`;
```

---

## Monitoring & Logging

### Application Logging
```typescript
class ProductionLogger {
  private logFile: string;
  
  constructor() {
    this.logFile = path.join(app.getPath('userData'), 'logs', 'app.log');
  }
  
  log(level: string, message: string, meta?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta
    };
    
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
  }
}
```

### Error Tracking
```typescript
// Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  auditLogger.logError('UNCAUGHT_EXCEPTION', error.message, error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  auditLogger.logError('UNHANDLED_REJECTION', String(reason));
});
```

### Performance Monitoring
```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(operation: string): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.recordMetric(operation, duration);
    };
  }
  
  recordMetric(operation: string, value: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const values = this.metrics.get(operation)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }
}
```

---

## 🔄 Maintenance & Updates

### Database Maintenance
```sql
-- Weekly maintenance tasks
VACUUM;                    -- Reclaim unused space
ANALYZE;                   -- Update statistics
PRAGMA integrity_check;    -- Check database integrity
```

### Log Rotation
```typescript
// Automatic log rotation
function rotateLogs() {
  const logDir = path.join(app.getPath('userData'), 'logs');
  const files = fs.readdirSync(logDir);
  
  files.forEach(file => {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    
    // Rotate files older than 30 days
    if (Date.now() - stats.mtime.getTime() > 30 * 24 * 60 * 60 * 1000) {
      fs.unlinkSync(filePath);
    }
  });
}
```

### Backup Strategy
```typescript
// Daily automatic backup
function createBackup() {
  const dbPath = config.database.url.replace('file:', '');
  const backupPath = path.join(
    app.getPath('userData'), 
    'backups', 
    `backup-${new Date().toISOString().split('T')[0]}.db`
  );
  
  fs.copyFileSync(dbPath, backupPath);
  console.log(`Backup created: ${backupPath}`);
}
```

---

## 📈 Future Enhancements

### Planned Features
1. **Multi-screen Support:** Multiple theater screens
2. **Online Sync:** Cloud backup and sync
3. **Mobile App:** Companion mobile application
4. **Advanced Analytics:** Business intelligence features
5. **Payment Integration:** Online payment processing

### Technical Improvements
1. **Microservices:** Split into smaller services
2. **GraphQL:** More efficient API queries
3. **Real-time Updates:** WebSocket integration
4. **Machine Learning:** Predictive analytics
5. **Containerization:** Docker deployment

---

*This technical documentation provides comprehensive information for developers, system administrators, and technical users working with AuditoriumX v1.0.4.*

**© 2025 AuditoriumX - Professional Theater Booking System**
