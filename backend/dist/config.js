"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSecurityConfig = exports.validateConfig = exports.isTest = exports.isProduction = exports.isDevelopment = exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Environment variable validation schema
const envSchema = zod_1.z.object({
    // Database
    DATABASE_URL: zod_1.z.string().default(() => {
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
    PORT: zod_1.z.string().transform(Number).default('3001'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    // API
    API_BASE_URL: zod_1.z.string().default('http://localhost:3001'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:8080'),
    // Logging
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    ENABLE_REQUEST_LOGGING: zod_1.z.string().transform((val) => val === 'true').default('true'),
    // Security
    JWT_SECRET: zod_1.z.string()
        .min(1, 'JWT_SECRET must not be empty')
        .default('dev-secret-key-change-in-production'),
    BCRYPT_ROUNDS: zod_1.z.string().transform(Number).default('10'),
    // Feature Flags
    ENABLE_SYNC_FEATURE: zod_1.z.string().transform((val) => val === 'true').default('false'),
    ENABLE_ANALYTICS: zod_1.z.string().transform((val) => val === 'true').default('false'),
    // External Services (optional)
    BMS_API_URL: zod_1.z.string().optional(),
    BMS_API_KEY: zod_1.z.string().optional(),
    EMAIL_SERVICE_URL: zod_1.z.string().optional(),
});
// Parse and validate environment variables
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        console.error('❌ Environment validation failed:', error);
        process.exit(1);
    }
};
const env = parseEnv();
// Configuration object
exports.config = {
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
};
// Helper functions
const isDevelopment = () => exports.config.server.isDevelopment;
exports.isDevelopment = isDevelopment;
const isProduction = () => exports.config.server.isProduction;
exports.isProduction = isProduction;
const isTest = () => exports.config.server.isTest;
exports.isTest = isTest;
// Validation helpers
const validateConfig = () => {
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
exports.validateConfig = validateConfig;
// Security validation
const validateSecurityConfig = () => {
    const warnings = [];
    // Check JWT secret strength (only in development for now)
    if (exports.config.server.isDevelopment) {
        const jwtSecret = exports.config.security.jwtSecret;
        if (jwtSecret === 'dev-secret-key-change-in-production') {
            warnings.push('⚠️ WARNING: Using default JWT secret in production!');
        }
        if (jwtSecret.length < 32) {
            warnings.push('⚠️ WARNING: JWT secret is too short for production!');
        }
        if (!/[A-Z]/.test(jwtSecret) || !/[a-z]/.test(jwtSecret) || !/[0-9]/.test(jwtSecret)) {
            warnings.push('⚠️ WARNING: JWT secret should contain uppercase, lowercase, and numbers!');
        }
    }
    // Log warnings
    if (warnings.length > 0) {
        console.warn('🔒 Security Configuration Warnings:');
        warnings.forEach(warning => console.warn(warning));
    }
    return warnings.length === 0;
};
exports.validateSecurityConfig = validateSecurityConfig;
// Log configuration (only in development)
if ((0, exports.isDevelopment)()) {
    console.log('🔧 Configuration loaded:', {
        port: exports.config.server.port,
        nodeEnv: exports.config.server.nodeEnv,
        databaseUrl: exports.config.database.url,
        corsOrigin: exports.config.api.corsOrigin,
        logLevel: exports.config.logging.level,
    });
}
