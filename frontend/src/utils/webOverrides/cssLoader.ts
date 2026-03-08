/**
 * Web Overrides CSS Loader
 * Loads web-only CSS overrides (never in Electron)
 */

import { isElectron } from '../electronDetection';

/**
 * Inject CSS link for web-overrides.css
 * Only runs in web environment (not Electron)
 */
export function injectWebOverridesCSS(): void {
  if (isElectron() || typeof document === 'undefined') {
    return;
  }

  try {
    const href = new URL('../../web-overrides.css', import.meta.url).href;
    const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(
      l => (l as HTMLLinkElement).href === href
    );

    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  } catch (error) {
    console.warn('[WEB OVERRIDES] Failed to inject CSS link:', error);
  }
}

/**
 * Dynamically import web-overrides.css
 * Only runs in web environment (not Electron)
 * Used as a backup if link injection fails
 */
export async function loadWebOverridesCSS(): Promise<void> {
  if (isElectron()) {
    return;
  }

  try {
    await import('../../web-overrides.css');
  } catch (error) {
    console.warn('[WEB OVERRIDES] Failed to load CSS:', error);
  }
}

