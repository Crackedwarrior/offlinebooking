"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProductionReadiness = exports.validateSecurityConfig = exports.validateConfig = exports.isTest = exports.isProduction = exports.isDevelopment = exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables only in development
if (process.env.NODE_ENV !== 'production') {
    dotenv_1.default.config();
}
// Environment variable validation schema
const envSchema = zod_1.z.object({
    // Database
    DATABASE_URL: zod_1.z.string().default(() => {
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
        .min(32, 'JWT_SECRET must be at least 32 characters for security')
        .default('2dff666cd28b63d3e7164d3bb33d28306c6908bacaaef551a4f2562b48e98ed7cb8397d62fad8cbedb87419fe3d8b68e2e79d4b61d5314df4d16294e8948031a'),
    BCRYPT_ROUNDS: zod_1.z.string().transform(Number).default('10'),
    // Feature Flags
    ENABLE_SYNC_FEATURE: zod_1.z.string().transform((val) => val === 'true').default('false'),
    ENABLE_ANALYTICS: zod_1.z.string().transform((val) => val === 'true').default('false'),
    // External Services (optional)
    BMS_API_URL: zod_1.z.string().optional(),
    BMS_API_KEY: zod_1.z.string().optional(),
    EMAIL_SERVICE_URL: zod_1.z.string().optional(),
    // Theater Configuration
    THEATER_NAME: zod_1.z.string().default('SREELEKHA THEATER'),
    THEATER_LOCATION: zod_1.z.string().default('Chikmagalur'),
    THEATER_GSTIN: zod_1.z.string().default('29AAVFS7423E120'),
    // Default Tax Values (fallbacks)
    DEFAULT_NET: zod_1.z.string().default('125.12'),
    DEFAULT_CGST: zod_1.z.string().default('11.44'),
    DEFAULT_SGST: zod_1.z.string().default('11.44'),
    DEFAULT_MC: zod_1.z.string().default('2.00'),
    DEFAULT_TOTAL: zod_1.z.string().default('150.00'),
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
        console.warn('⚠️ Missing environment variables:', missingFields);
        // Don't exit, just warn
    }
    // Additional production-specific validations
    if (exports.config.server.isProduction) {
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
        if (exports.config.database.url.includes('dev.db')) {
            console.warn('⚠️ Production environment detected but using development database');
            // Don't exit, just warn
        }
        if (exports.config.api.corsOrigin === '*') {
            console.warn('⚠️ Production environment detected but CORS is set to allow all origins');
            // Don't exit, just warn
        }
    }
    return true; // Always return true to allow startup
};
exports.validateConfig = validateConfig;
// Security validation
const validateSecurityConfig = () => {
    const warnings = [];
    // Check JWT secret strength
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
    // Check BCRYPT rounds
    if (exports.config.security.bcryptRounds < 10) {
        warnings.push('⚠️ WARNING: BCRYPT_ROUNDS is too low for production!');
    }
    // Check database path security
    if (exports.config.server.isProduction && exports.config.database.url.includes('dev.db')) {
        warnings.push('⚠️ WARNING: Using development database in production!');
    }
    // Log warnings
    if (warnings.length > 0) {
        console.warn('🔒 Security Configuration Warnings:');
        warnings.forEach(warning => console.warn(warning));
    }
    // In production, exit on critical security issues
    if (exports.config.server.isProduction && warnings.length > 0) {
        console.error('❌ Critical security issues detected in production. Exiting...');
        process.exit(1);
    }
    return warnings.length === 0;
};
exports.validateSecurityConfig = validateSecurityConfig;
// Production readiness validation
const validateProductionReadiness = () => {
    const issues = [];
    // Check environment
    if (!exports.config.server.isProduction) {
        issues.push('Not running in production mode');
    }
    // Check security configuration
    if (exports.config.security.jwtSecret === 'dev-secret-key-change-in-production') {
        issues.push('Using default JWT secret');
    }
    if (exports.config.security.jwtSecret.length < 32) {
        issues.push('JWT secret too short');
    }
    if (exports.config.security.bcryptRounds < 10) {
        issues.push('BCRYPT rounds too low');
    }
    // Check database configuration
    if (exports.config.database.url.includes('dev.db')) {
        issues.push('Using development database');
    }
    // Check CORS configuration
    if (exports.config.api.corsOrigin === '*') {
        issues.push('CORS allows all origins');
    }
    // Check theater configuration
    if (exports.config.theater.name === 'SREELEKHA THEATER' && exports.config.server.isProduction) {
        issues.push('Using default theater name in production');
    }
    if (exports.config.theater.location === 'Chikmagalur' && exports.config.server.isProduction) {
        issues.push('Using default theater location in production');
    }
    // Check logging configuration
    if (exports.config.logging.enableRequestLogging && exports.config.server.isProduction) {
        issues.push('Request logging enabled in production (may impact performance)');
    }
    return {
        ready: issues.length === 0,
        issues
    };
};
exports.validateProductionReadiness = validateProductionReadiness;
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
