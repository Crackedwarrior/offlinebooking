# Debug Logging Configuration

This document explains how to control debug logging in the offline booking application.

## Configuration File

The debug configuration is located at `src/config/debug.ts` and controls various types of logging throughout the application.

## Available Log Categories

- **SEAT_SELECTION**: Seat selection and deselection logs
- **AUTO_UPDATE**: Auto-update show selection logs  
- **SEAT_STATISTICS**: Seat grid statistics logs
- **CHECKOUT**: Checkout process logs
- **PRINTER**: Printer service logs (enabled by default for debugging)
- **API**: API call logs (enabled by default for debugging)
- **TAURI**: Tauri availability logs

## Usage

To enable/disable specific logging categories, edit the `DEBUG_CONFIG.LOGGING` object in `src/config/debug.ts`:

```typescript
LOGGING: {
  SEAT_SELECTION: true,    // Enable seat selection logs
  AUTO_UPDATE: false,      // Disable auto-update logs
  PRINTER: true,          // Keep printer logs enabled
  // ... other categories
}
```

## Helper Functions

The debug configuration provides helper functions for conditional logging:

```typescript
import { DEBUG_CONFIG } from '@/config/debug';

// Conditional logging
DEBUG_CONFIG.log('SEAT_SELECTION', 'Seat selected:', seatData);

// Conditional warning
DEBUG_CONFIG.warn('TAURI', 'Tauri not available');

// Always log errors
DEBUG_CONFIG.error('Critical error occurred', errorData);
```

## Development vs Production

Logging is automatically disabled in production builds. The `isDevelopment` flag controls this behavior.

## Recent Changes

- Reduced console noise by disabling most debug logs by default
- Kept printer and API logs enabled for debugging purposes
- Added favicon to prevent 404 errors
- Created centralized debug configuration for easy management
