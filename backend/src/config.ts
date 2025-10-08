import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables only in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Environment variable validation schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().default(() => {
    // In production, DATABASE_URL is set by Electron main process
    if (process.env.NODE_ENV === 'production') {
      return process.env.DATABASE_URL || 'file:./dev.db';
    }
    // In development, check if we're running from compiled dist directory
    if (__dirname.includes('dist')) {
      return 'file:./dev.db';
    }
    return 'file:./prisma/dev.db';
  }),
  
  // Server
  PORT: z.string().transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // API
  API_BASE_URL: z.string().default('http://localhost:3001'),
  CORS_ORIGIN: z.string().default('http://localhost:8080'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_REQUEST_LOGGING: z.string().transform((val: string) => val === 'true').default('true'),
  
  // Security
  JWT_SECRET: z.string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security')
    .default('2dff666cd28b63d3e7164d3bb33d28306c6908bacaaef551a4f2562b48e98ed7cb8397d62fad8cbedb87419fe3d8b68e2e79d4b61d5314df4d16294e8948031a'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),
  
  // Feature Flags
  ENABLE_SYNC_FEATURE: z.string().transform((val: string) => val === 'true').default('false'),
  ENABLE_ANALYTICS: z.string().transform((val: string) => val === 'true').default('false'),
  
  // External Services (optional)
  BMS_API_URL: z.string().optional(),
  BMS_API_KEY: z.string().optional(),
  EMAIL_SERVICE_URL: z.string().optional(),
  
  // Theater Configuration
  THEATER_NAME: z.string().default('SREELEKHA THEATER'),
  THEATER_LOCATION: z.string().default('Chikmagalur'),
  THEATER_GSTIN: z.string().default('29AAVFS7423E120'),
  
  // Default Tax Values (fallbacks)
  DEFAULT_NET: z.string().default('125.12'),
  DEFAULT_CGST: z.string().default('11.44'),
  DEFAULT_SGST: z.string().default('11.44'),
  DEFAULT_MC: z.string().default('2.00'),
  DEFAULT_TOTAL: z.string().default('150.00'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
};

const env = parseEnv();

// Configuration object
export const config = {
  // Database
  database: {
    url: env.DATABASE_URL,
  },
  
  // Server
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },
  
  // API
  api: {
    baseUrl: env.API_BASE_URL,
    corsOrigin: env.CORS_ORIGIN,
  },
  
  // Logging
  logging: {
    level: env.LOG_LEVEL,
    enableRequestLogging: env.ENABLE_REQUEST_LOGGING,
  },
  
  // Security
  security: {
    jwtSecret: env.JWT_SECRET,
    bcryptRounds: env.BCRYPT_ROUNDS,
  },
  
  // Features
  features: {
    enableSync: env.ENABLE_SYNC_FEATURE,
    enableAnalytics: env.ENABLE_ANALYTICS,
  },
  
  // External Services
  external: {
    bmsApiUrl: env.BMS_API_URL,
    bmsApiKey: env.BMS_API_KEY,
    emailServiceUrl: env.EMAIL_SERVICE_URL,
  },
  
  // Theater Configuration
  theater: {
    name: env.THEATER_NAME,
    location: env.THEATER_LOCATION,
    gstin: env.THEATER_GSTIN,
    defaultTaxValues: {
      net: env.DEFAULT_NET,
      cgst: env.DEFAULT_CGST,
      sgst: env.DEFAULT_SGST,
      mc: env.DEFAULT_MC,
      totalAmount: env.DEFAULT_TOTAL,
    },
  },
} as const;

// Type for the config object
export type Config = typeof config;

// Helper functions
export const isDevelopment = () => config.server.isDevelopment;
export const isProduction = () => config.server.isProduction;
export const isTest = () => config.server.isTest;

// Validation helpers
export const validateConfig = () => {
  const requiredFields = [
    'DATABASE_URL',
    'PORT',
    'NODE_ENV',
  ];
  
  const missingFields = requiredFields.filter(field => !process.env[field]);
  
  if (missingFields.length > 0) {
    console.warn('⚠️ Missing environment variables:', missingFields);
    // Don't exit, just warn
  }
  
  // Additional production-specific validations
  if (config.server.isProduction) {
    const productionRequiredFields = [
      'JWT_SECRET',
      'THEATER_NAME',
      'THEATER_LOCATION',
      'THEATER_GSTIN'
    ];
    
    const missingProductionFields = productionRequiredFields.filter(field => !process.env[field]);
    
    if (missingProductionFields.length > 0) {
      console.warn('⚠️ Missing production environment variables:', missingProductionFields);
      // Don't exit, just warn
    }
    
    // Validate production-specific values - make non-blocking
    if (config.database.url.includes('dev.db')) {
      console.warn('⚠️ Production environment detected but using development database');
      // Don't exit, just warn
    }
    
    if (config.api.corsOrigin === '*') {
      console.warn('⚠️ Production environment detected but CORS is set to allow all origins');
      // Don't exit, just warn
    }
  }
  
  return true; // Always return true to allow startup
};

// Security validation
export const validateSecurityConfig = () => {
  const warnings: string[] = [];
  
  // Check JWT secret strength
  const jwtSecret = config.security.jwtSecret;
  
  if (jwtSecret === 'dev-secret-key-change-in-production') {
    warnings.push('⚠️ WARNING: Using default JWT secret in production!');
  }
  
  if (jwtSecret.length < 32) {
    warnings.push('⚠️ WARNING: JWT secret is too short for production!');
  }
  
  if (!/[A-Z]/.test(jwtSecret) || !/[a-z]/.test(jwtSecret) || !/[0-9]/.test(jwtSecret)) {
    warnings.push('⚠️ WARNING: JWT secret should contain uppercase, lowercase, and numbers!');
  }
  
  // Check BCRYPT rounds
  if (config.security.bcryptRounds < 10) {
    warnings.push('⚠️ WARNING: BCRYPT_ROUNDS is too low for production!');
  }
  
  // Check database path security
  if (config.server.isProduction && config.database.url.includes('dev.db')) {
    warnings.push('⚠️ WARNING: Using development database in production!');
  }
  
  // Log warnings
  if (warnings.length > 0) {
    console.warn('🔒 Security Configuration Warnings:');
    warnings.forEach(warning => console.warn(warning));
  }
  
  // In production, exit on critical security issues
  if (config.server.isProduction && warnings.length > 0) {
    console.error('❌ Critical security issues detected in production. Exiting...');
    process.exit(1);
  }
  
  return warnings.length === 0;
};

// Production readiness validation
export const validateProductionReadiness = (): { ready: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check environment
  if (!config.server.isProduction) {
    issues.push('Not running in production mode');
  }
  
  // Check security configuration
  if (config.security.jwtSecret === 'dev-secret-key-change-in-production') {
    issues.push('Using default JWT secret');
  }
  
  if (config.security.jwtSecret.length < 32) {
    issues.push('JWT secret too short');
  }
  
  if (config.security.bcryptRounds < 10) {
    issues.push('BCRYPT rounds too low');
  }
  
  // Check database configuration
  if (config.database.url.includes('dev.db')) {
    issues.push('Using development database');
  }
  
  // Check CORS configuration
  if (config.api.corsOrigin === '*') {
    issues.push('CORS allows all origins');
  }
  
  // Check theater configuration
  if (config.theater.name === 'SREELEKHA THEATER' && config.server.isProduction) {
    issues.push('Using default theater name in production');
  }
  
  if (config.theater.location === 'Chikmagalur' && config.server.isProduction) {
    issues.push('Using default theater location in production');
  }
  
  // Check logging configuration
  if (config.logging.enableRequestLogging && config.server.isProduction) {
    issues.push('Request logging enabled in production (may impact performance)');
  }
  
  return {
    ready: issues.length === 0,
    issues
  };
};

// Log configuration (only in development)
if (isDevelopment()) {
  console.log('🔧 Configuration loaded:', {
    port: config.server.port,
    nodeEnv: config.server.nodeEnv,
    databaseUrl: config.database.url,
    corsOrigin: config.api.corsOrigin,
    logLevel: config.logging.level,
  });
}