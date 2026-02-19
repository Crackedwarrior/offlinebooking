/**
 * Middleware Setup
 * Configures CORS, security headers, rate limiting, and other Express middleware
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { requestIdMiddleware } from './errorHandler';

/**
 * Rate limiters for different endpoint types
 * Exported for use in route-specific rate limiting
 */
export const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // limit each IP to 200 booking requests per minute (theater booking optimized)
  message: {
    success: false,
    error: 'Too many booking requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

export const bmsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // Very high limit for BMS bulk operations (theater staff needs)
  message: {
    success: false,
    error: 'Too many BMS requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Setup all Express middleware
 * Configures CORS, security headers, rate limiting, and JSON parsing
 */
export function setupMiddleware(app: Express): void {
  // Trust proxy for Railway deployment (fixes rate limiting errors)
  // Use specific proxy configuration instead of 'true' to avoid security warnings
  app.set('trust proxy', 1);

  // Add Content Security Policy headers to fix CSP errors
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "connect-src 'self' https: http:; " +
      "font-src 'self' data:;"
    );
    next();
  });

  // Configure CORS with proper origin restrictions
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Define allowed origins
      const allowedOrigins = [
        'http://localhost:8080',    // Development frontend
        'http://localhost:3000',    // Alternative dev port
        'http://127.0.0.1:8080',    // Localhost alternative
        'http://127.0.0.1:3000',    // Localhost alternative
        // Vercel frontend domains
        'https://offlinebooking.vercel.app',  // Vercel production
        'https://offlinebooking-git-main.vercel.app',  // Vercel preview
        'https://offlinebooking-git-develop.vercel.app',  // Vercel branch
        // Allow all Vercel preview deployments
        ...(origin && origin.includes('.vercel.app') ? [origin] : [])
      ];
      
      // Check if origin is allowed
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // In development, allow all origins for testing
      if (config.server.nodeEnv === 'development') {
        console.log(`[CORS] Development mode: Allowing origin: ${origin}`);
        return callback(null, true);
      }
      
      // Log unauthorized origin attempts
      console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
  }));

  // Add security headers (CSP is already set above, so we skip it here)
  app.use((req: Request, res: Response, next) => {
    // Skip CSP header - already set above with proper unsafe-eval support
    // This prevents conflicting CSP headers that block JavaScript execution
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    next();
  });

  // JSON body parser
  app.use(express.json());

  // Add rate limiting - Theatre booking system optimized limits
  const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // limit each IP to 1000 requests per minute (theater booking optimized)
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: false, // Count all requests
    skipFailedRequests: false, // Count failed requests too
  });

  // Apply general rate limiting to all routes
  app.use(generalLimiter);

  // Add request ID middleware
  app.use(requestIdMiddleware);
}

