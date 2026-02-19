// src/server.ts

import express from 'express';
import type { Request, Response } from 'express';
import { setupMiddleware } from './middleware/setup';
import { registerRoutes } from './routes';
import { startServer } from './server/startup';
import { errorLogger, errorHandler } from './middleware/errorHandler';
import { config } from './config';

// Create Express app
const app = express();

// Setup middleware (CORS, security headers, rate limiting, JSON parsing)
setupMiddleware(app);

// Health check endpoint (simple)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv
  });
});

// Register all API routes
registerRoutes(app);

// ===== ERROR HANDLING MIDDLEWARE (must be after routes) =====

// Add error handling middleware (must be last)
app.use(errorLogger);
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.json({
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      code: 404,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    }
  });
});

// ===== SERVER STARTUP =====

// Start the server
startServer(app);
