import { Express } from 'express';
import bookingRoutes from './bookings';
import settingsRoutes from './settings';
import seatRoutes from './seats';
import printerRoutes from './printer';
import healthRoutes from './health';
import ticketIdRoutes from './ticketId';

/**
 * Register all routes with the Express app
 * This centralizes route registration and makes server.ts cleaner
 */
export function registerRoutes(app: Express): void {
  console.log('[ROUTES] Registering all routes...');
  
  // API routes
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/seats', seatRoutes);
  app.use('/api/printer', printerRoutes);
  app.use('/api/ticket-id', ticketIdRoutes);
  
  // Health check routes (both root and /api/health)
  app.use('/', healthRoutes);
  
  console.log('[ROUTES] All routes registered successfully');
  console.log('[ROUTES] Available endpoints:');
  console.log('[ROUTES]   - /api/bookings/*');
  console.log('[ROUTES]   - /api/settings/*');
  console.log('[ROUTES]   - /api/seats/*');
  console.log('[ROUTES]   - /api/printer/*');
  console.log('[ROUTES]   - /api/ticket-id/*');
  console.log('[ROUTES]   - / (health check)');
  console.log('[ROUTES]   - /api/health (detailed health check)');
}
