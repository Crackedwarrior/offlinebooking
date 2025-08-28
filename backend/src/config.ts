import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable validation schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().default(() => {
    if (process.env.NODE_ENV === 'production') {
      return 'file:./database/auditoriumx.db';
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
  JWT_SECRET: z.string().default('dev-secret-key-change-in-production'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),
  
  // Feature Flags
  ENABLE_SYNC_FEATURE: z.string().transform((val: string) => val === 'true').default('false'),
  ENABLE_ANALYTICS: z.string().transform((val: string) => val === 'true').default('false'),
  
  // External Services (optional)
  BMS_API_URL: z.string().optional(),
  BMS_API_KEY: z.string().optional(),
  EMAIL_SERVICE_URL: z.string().optional(),
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
    console.error('❌ Missing required environment variables:', missingFields);
    return false;
  }
  
  return true;
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