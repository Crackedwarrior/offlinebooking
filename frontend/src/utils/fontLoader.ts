/**
 * Font Loader Utility
 * Lazy loads fonts after initial render to improve startup performance
 */

/**
 * Load Noto Sans Kannada fonts asynchronously
 * Uses requestIdleCallback to avoid blocking initial render
 */
export function loadFonts(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const loadFontsAsync = () => {
    import('@fontsource/noto-sans-kannada/400.css').catch(err => {
      console.warn('[FONTS] Failed to load font 400:', err);
    });
    import('@fontsource/noto-sans-kannada/700.css').catch(err => {
      console.warn('[FONTS] Failed to load font 700:', err);
    });
  };

  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadFontsAsync, { timeout: 1000 });
  } else {
    setTimeout(loadFontsAsync, 0);
  }
}

