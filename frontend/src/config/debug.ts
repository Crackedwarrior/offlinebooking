// Debug configuration for the application
export const DEBUG_CONFIG = {
  // Enable/disable different types of logging
  LOGGING: {
    SEAT_SELECTION: false,    // Seat selection and deselection logs
    AUTO_UPDATE: false,       // Auto-update show selection logs
    SEAT_STATISTICS: false,   // Seat grid statistics logs
    CHECKOUT: false,          // Checkout process logs
    PRINTER: true,           // Printer service logs (keep enabled for debugging)
    API: true,               // API call logs (keep enabled for debugging)
    TAURI: false,            // Tauri availability logs (disabled to reduce noise)
  },
  
  // Development mode detection
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Helper function to log conditionally
  log: (category: keyof typeof DEBUG_CONFIG.LOGGING, message: string, data?: any) => {
    if (DEBUG_CONFIG.LOGGING[category] && DEBUG_CONFIG.isDevelopment) {
      console.log(message, data);
    }
  },
  
  // Helper function to warn conditionally
  warn: (category: keyof typeof DEBUG_CONFIG.LOGGING, message: string, data?: any) => {
    if (DEBUG_CONFIG.LOGGING[category] && DEBUG_CONFIG.isDevelopment) {
      console.warn(message, data);
    }
  },
  
  // Helper function to error conditionally (always log errors)
  error: (message: string, data?: any) => {
    console.error(message, data);
  }
};
