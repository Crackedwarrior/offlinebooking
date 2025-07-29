# Environment Configuration Setup

This document explains how to set up environment configuration for the Offline Booking System.

## Overview

The application uses environment variables for configuration management across different environments (development, production, staging).

## Backend Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# Database Configuration
DATABASE_URL="file:./prisma/dev.db"

# Server Configuration
PORT=3001
NODE_ENV=development

# API Configuration
API_BASE_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:8080

# Logging Configuration
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
BCRYPT_ROUNDS=12

# Feature Flags
ENABLE_SYNC_FEATURE=false
ENABLE_ANALYTICS=false

# External Services (optional)
# BMS_API_URL=https://api.bms.com
# BMS_API_KEY=your-bms-api-key
# EMAIL_SERVICE_URL=smtp://localhost:1025
```

### Configuration Management

The backend uses a centralized configuration system (`src/config.ts`) that:

- ✅ Validates environment variables using Zod
- ✅ Provides type-safe configuration access
- ✅ Includes helpful helper functions
- ✅ Logs configuration in development mode
- ✅ Handles missing variables gracefully

### Usage

```typescript
import { config, isDevelopment, isProduction } from './config';

// Access configuration
const port = config.server.port;
const dbUrl = config.database.url;
const isDev = isDevelopment();
```

## Frontend Configuration

### Environment Variables

Create a `.env` file in the `frontend/` directory with the following variables:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_API_TIMEOUT=10000

# App Configuration
VITE_APP_NAME="Offline Booking System"
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_OFFLINE_MODE=true

# External Services (for future use)
# VITE_BMS_API_URL=https://api.bms.com
# VITE_EMAIL_SERVICE_URL=smtp://localhost:1025

# Development Settings
# VITE_DEV_MODE=true
# VITE_MOCK_API=false
```

### Configuration Management

The frontend uses a centralized configuration system (`src/config/env.ts`) that:

- ✅ Uses Vite's `import.meta.env` for environment variables
- ✅ Provides type-safe configuration access
- ✅ Includes API URL helpers
- ✅ Validates required variables
- ✅ Logs configuration in development mode

### Usage

```typescript
import { envConfig, isDev, getApiUrl } from '@/config/env';

// Access configuration
const apiUrl = envConfig.api.baseUrl;
const appName = envConfig.app.name;
const isDevelopment = isDev();

// Get API URLs
const bookingsUrl = getApiUrl('/api/bookings');
```

## API Service

The frontend includes a centralized API service (`src/services/api.ts`) that:

- ✅ Uses environment configuration for API endpoints
- ✅ Provides type-safe API responses
- ✅ Includes timeout handling
- ✅ Offers convenient methods for common operations

### Usage

```typescript
import { apiService, createBooking, getBookings } from '@/services/api';

// Create a booking
const result = await createBooking(bookingData);

// Get all bookings
const bookings = await getBookings();

// Health check
const health = await apiService.healthCheck();
```

## Environment-Specific Configurations

### Development

```bash
# Backend
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true

# Frontend
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_OFFLINE_MODE=true
```

### Production

```bash
# Backend
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_REQUEST_LOGGING=false
JWT_SECRET=your-production-secret-key

# Frontend
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_ANALYTICS=true
```

### Testing

```bash
# Backend
NODE_ENV=test
DATABASE_URL="file:./test.db"

# Frontend
VITE_MOCK_API=true
```

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Use strong secrets** in production
3. **Validate all environment variables** on startup
4. **Use different configurations** for different environments
5. **Rotate secrets regularly** in production

## Deployment

### Backend Deployment

1. Set environment variables in your deployment platform
2. Ensure `DATABASE_URL` points to your production database
3. Set `NODE_ENV=production`
4. Configure CORS origins for your frontend domain

### Frontend Deployment

1. Set environment variables in your deployment platform
2. Ensure `VITE_API_BASE_URL` points to your production API
3. Set `VITE_ENABLE_DEBUG_MODE=false`
4. Configure feature flags as needed

## Troubleshooting

### Common Issues

1. **Missing environment variables**: Check the validation logs
2. **CORS errors**: Verify `CORS_ORIGIN` configuration
3. **Database connection issues**: Check `DATABASE_URL`
4. **API timeout errors**: Adjust `VITE_API_TIMEOUT`

### Validation

Both frontend and backend include validation:

```typescript
// Backend
import { validateConfig } from './config';
if (!validateConfig()) {
  process.exit(1);
}

// Frontend
import { validateEnvConfig } from '@/config/env';
if (!validateEnvConfig()) {
  console.error('Environment validation failed');
}
```

## Migration Guide

### From Hardcoded Values

1. Replace hardcoded URLs with environment variables
2. Update API calls to use the centralized service
3. Add validation for required variables
4. Test in different environments

### Example Migration

```typescript
// Before
const API_URL = 'http://localhost:3001';

// After
import { envConfig } from '@/config/env';
const API_URL = envConfig.api.baseUrl;
```

## Best Practices

1. ✅ **Use descriptive variable names**
2. ✅ **Provide sensible defaults**
3. ✅ **Validate all inputs**
4. ✅ **Log configuration in development**
5. ✅ **Use type-safe configuration objects**
6. ✅ **Separate concerns** (API, app, features)
7. ✅ **Document all variables**
8. ✅ **Test in all environments** 