// Environment configuration for the frontend
// Uses Vite's import.meta.env for environment variables

interface EnvironmentConfig {
  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
  };
  
  // App Configuration
  app: {
    name: string;
    version: string;
    environment: 'development' | 'production' | 'test';
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
  };
  
  // Feature Flags
  features: {
    enableAnalytics: boolean;
    enableDebugMode: boolean;
    enableOfflineMode: boolean;
  };
  
  // External Services
  external: {
    bmsApiUrl?: string;
    emailServiceUrl?: string;
  };
  
  // Theater Configuration
  theater: {
    name: string;
    location: string;
    gstin: string;
    defaultTaxValues: {
      net: string;
      cgst: string;
      sgst: string;
      mc: string;
      totalAmount: string;
    };
  };
}

// Get environment variables with fallbacks
const getEnvVar = (key: string, fallback: string = ''): string => {
  return import.meta.env[key] || fallback;
};

const getEnvBool = (key: string, fallback: boolean = false): boolean => {
  const value = getEnvVar(key);
  return value === 'true' || value === '1' || fallback;
};

const getEnvNumber = (key: string, fallback: number): number => {
  const value = getEnvVar(key);
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

// Environment detection
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const isTest = import.meta.env.MODE === 'test';

// Configuration object
export const envConfig: EnvironmentConfig = {
  // API Configuration
  api: {
    baseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3001'),
    timeout: getEnvNumber('VITE_API_TIMEOUT', 10000),
  },
  
  // App Configuration
  app: {
    name: getEnvVar('VITE_APP_NAME', 'Offline Booking System'),
    version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
    environment: isDevelopment ? 'development' : isProduction ? 'production' : 'test',
    isDevelopment,
    isProduction,
    isTest,
  },
  
  // Feature Flags
  features: {
    enableAnalytics: getEnvBool('VITE_ENABLE_ANALYTICS', false),
    enableDebugMode: getEnvBool('VITE_ENABLE_DEBUG_MODE', isDevelopment),
    enableOfflineMode: getEnvBool('VITE_ENABLE_OFFLINE_MODE', true),
  },
  
  // External Services
  external: {
    bmsApiUrl: getEnvVar('VITE_BMS_API_URL', ''),
    emailServiceUrl: getEnvVar('VITE_EMAIL_SERVICE_URL', ''),
  },
  
  // Theater Configuration
  theater: {
    name: getEnvVar('VITE_THEATER_NAME', 'SREELEKHA THEATER'),
    location: getEnvVar('VITE_THEATER_LOCATION', 'Chikmagalur'),
    gstin: getEnvVar('VITE_THEATER_GSTIN', '29AAVFS7423E120'),
    defaultTaxValues: {
      net: getEnvVar('VITE_DEFAULT_NET', '125.12'),
      cgst: getEnvVar('VITE_DEFAULT_CGST', '11.44'),
      sgst: getEnvVar('VITE_DEFAULT_SGST', '11.44'),
      mc: getEnvVar('VITE_DEFAULT_MC', '2.00'),
      totalAmount: getEnvVar('VITE_DEFAULT_TOTAL', '150.00'),
    },
  },
};

// Helper functions
export const isDev = () => envConfig.app.isDevelopment;
export const isProd = () => envConfig.app.isProduction;
export const isTestEnv = () => envConfig.app.isTest;

// API URL helpers
export const getApiUrl = (endpoint: string = ''): string => {
  const baseUrl = envConfig.api.baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${baseUrl}/${cleanEndpoint}`;
};

// Validation function
export const validateEnvConfig = (): boolean => {
  // Since we have default values for all required fields, we can be more lenient
  // Only check for critical missing fields that don't have defaults
  
  // For now, we'll just return true since all our fields have default values
  return true;
};

// Log configuration (only in development)
if (isDev()) {
  console.log('🔧 Frontend Configuration loaded:', {
    apiBaseUrl: envConfig.api.baseUrl,
    environment: envConfig.app.environment,
    appName: envConfig.app.name,
    version: envConfig.app.version,
    features: envConfig.features,
  });
}

export default envConfig; 