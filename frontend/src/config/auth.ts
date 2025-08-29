// Authentication configuration
export const AUTH_CONFIG = {
  // Default PIN - change this to your desired PIN
  DEFAULT_PIN: '2003',
  
  // Security settings
  MAX_ATTEMPTS: 3,
  LOCK_DURATION: 30, // seconds
  
  // Session settings - Disabled for theater use case
  SESSION_TIMEOUT: 0, // No automatic timeout
  AUTO_LOGOUT: false, // Manual logout only
};

// PIN validation rules
export const PIN_RULES = {
  MIN_LENGTH: 4,
  MAX_LENGTH: 4,
  ALLOWED_CHARS: /^\d+$/, // Only numbers
};

// Helper function to validate PIN format
export const validatePinFormat = (pin: string): boolean => {
  return PIN_RULES.ALLOWED_CHARS.test(pin) && 
         pin.length >= PIN_RULES.MIN_LENGTH && 
         pin.length <= PIN_RULES.MAX_LENGTH;
};

// Helper function to get PIN from environment or use default
export const getPin = (): string => {
  // You can change this to read from environment variables or settings
  return AUTH_CONFIG.DEFAULT_PIN;
}; 