/**
 * Web Overrides Main Module
 * Orchestrates CSS and DOM overrides for web environment
 * Only loads in web environment (not Electron)
 */

import { isElectron } from '../electronDetection';
import { injectWebOverridesCSS, loadWebOverridesCSS } from './cssLoader';
import { applyWebOverrides } from './domOverrides';

/**
 * Initialize all web overrides
 * Only runs in web environment (not Electron)
 * Lazy loads after React initializes to avoid blocking render
 */
export function initializeWebOverrides(): void {
  if (isElectron()) {
    return;
  }

  // Inject CSS link immediately (non-blocking)
  injectWebOverridesCSS();

  // Load CSS as backup (async, non-blocking)
  loadWebOverridesCSS().catch(() => {
    // Silently fail - CSS link injection is the primary method
  });

  // Apply DOM overrides (deferred, uses requestIdleCallback)
  applyWebOverrides();
}

