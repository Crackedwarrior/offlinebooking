// Check if we're running in a Tauri environment
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

// Placeholder for Tauri APIs
let shellOpen: any = null;

// Initialize Tauri APIs if available
const initTauriApis = async () => {
  if (!isTauri) {
    console.log('Not running in Tauri environment');
    return false;
  }
  
  try {
    // Use a more compatible approach
    if ((window as any).__TAURI__) {
      const tauriApp = (window as any).__TAURI__;
      
      // Try to access the shell.open API
      shellOpen = async (url: string) => {
        // If we have access to the shell API
        if (tauriApp.shell && tauriApp.shell.open) {
          return tauriApp.shell.open(url);
        } else {
          // Fallback to window.open
          window.open(url, '_blank');
        }
      };
    }
    
    return true;
  } catch (error) {
    console.error('Failed to access Tauri shell API:', error);
    return false;
  }
};

/**
 * Utility functions for Tauri integration
 */
export const tauriUtils = {
  /**
   * Opens a URL in the appropriate way based on the environment
   * In Tauri, uses the shell.open API
   * In browser, uses window.open
   * 
   * @param url The URL to open
   * @param target The target for browser window.open (ignored in Tauri)
   */
  openUrl: async (url: string, target: string = '_blank'): Promise<void> => {
    try {
      // Check if we're running in Tauri
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        console.log('Opening URL in Tauri app:', url);
        
        // Initialize Tauri APIs if not already initialized
        if (!shellOpen) {
          await initTauriApis();
        }
        
        // For external URLs, use the shell.open API
        if (url.startsWith('http') && shellOpen) {
          await shellOpen(url);
        } else if (!shellOpen) {
          console.warn('Tauri shell.open API not available, falling back to browser');
          window.open(url, target);
        }
      } else {
        // Fallback to browser behavior
        console.log('Opening URL in browser:', url);
        window.open(url, target);
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  }
};

export default tauriUtils;