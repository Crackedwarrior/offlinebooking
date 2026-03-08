/**
 * Electron Detection Utility
 * Detects if the app is running in Electron environment
 */

/**
 * Check if the app is running in Electron
 * Uses multiple detection methods for reliability
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Method 1: Check user agent
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes(' electron/')) {
    return true;
  }

  // Method 2: Check for electronAPI
  if (!!(window as any).electronAPI) {
    return true;
  }

  // Method 3: Check for process.versions.electron
  if (!!(window as any).process?.versions?.electron) {
    return true;
  }

  return false;
}

