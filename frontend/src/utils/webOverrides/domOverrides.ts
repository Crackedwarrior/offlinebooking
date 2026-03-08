/**
 * Web Overrides DOM Manipulation
 * Applies web-specific DOM overrides for layout and styling
 * Only runs in web environment (not Electron)
 */

import { isElectron } from '../electronDetection';

/**
 * Apply browser zoom (80% for web browsers)
 * Uses CSS zoom for Chromium, transform scale for Firefox
 */
function applyZoom(): void {
  if (isElectron() || typeof document === 'undefined' || typeof navigator === 'undefined') {
    return;
  }

  try {
    const ua = navigator.userAgent.toLowerCase();
    const isFirefox = ua.includes('firefox');
    console.log('[WEB] Detected browser UA:', ua);

    if (!isFirefox) {
      // Apply zoom to body instead of html to avoid viewport calculation issues
      (document.body as HTMLElement).style.zoom = '0.8';
      console.log('[WEB] Applied css zoom 0.8 on <body> (Chromium)');
    } else {
      // Firefox fallback using transform scaling
      const style = document.createElement('style');
      style.textContent = `
        html, body { overflow-x: hidden; }
        body { transform: scale(0.8); transform-origin: top left; width: 125%; }
      `;
      document.head.appendChild(style);
      console.log('[WEB] Applied Firefox transform scale fallback');
    }
  } catch (error) {
    console.warn('[WEB] Failed to apply zoom:', error);
  }
}

/**
 * Force checkout card dimensions to match Electron layout
 */
function forceCheckoutCardSizes(): void {
  if (isElectron() || typeof document === 'undefined') {
    return;
  }

  try {
    // Force movie card dimensions
    const movieCard = document.querySelector(
      '.flex.flex-col.border.border-gray-200.bg-white.w-\\[250px\\].min-h-\\[120px\\].px-6.py-2.relative.select-none.rounded-l-xl.shadow-md.cursor-pointer.hover\\:bg-gray-50'
    ) as HTMLElement | null;

    if (movieCard) {
      movieCard.style.width = '312.5px';
      movieCard.style.height = '150px';
      movieCard.style.maxHeight = '150px';
      movieCard.style.minHeight = '120px';
      movieCard.style.overflow = 'hidden';
      movieCard.style.boxSizing = 'border-box';
    }

    // Force class card dimensions
    document.querySelectorAll('.class-card').forEach((el) => {
      const card = el as HTMLElement;
      card.style.width = '198.5px';
      card.style.height = '150px';
      card.style.maxHeight = '150px';
      card.style.overflow = 'hidden';
      card.style.boxSizing = 'border-box';
    });

    // Make sure the last class card (SECOND CLASS) uses 219.5px
    const classCards = document.querySelectorAll('.class-card');
    if (classCards.length > 0) {
      const last = classCards[classCards.length - 1] as HTMLElement;
      last.style.width = '219.5px';
    }

    // Force SeatGridPreview dimensions (Electron match)
    const seatGridPreview = document.querySelector(
      '.bg-gradient-to-br.from-gray-50.to-gray-100.p-3.rounded-lg.border.border-gray-200.shadow-inner'
    );

    if (seatGridPreview) {
      const card = seatGridPreview as HTMLElement;
      card.style.width = '1024px';
      card.style.minWidth = '1024px';
      card.style.maxWidth = '1024px';
      card.style.height = '540px';
      card.style.minHeight = '540px';
      card.style.maxHeight = '540px';
      card.style.marginLeft = '0';
      card.style.marginRight = '0';
      card.style.boxSizing = 'border-box';

      // Force ALL buttons to be 24px x 24px
      const allButtons = card.querySelectorAll('button');
      allButtons.forEach((btn) => {
        const button = btn as HTMLElement;
        button.style.width = '24px';
        button.style.height = '24px';
        button.style.minWidth = '24px';
        button.style.minHeight = '24px';
        button.style.fontSize = '13px';
        button.style.borderRadius = '4px';
        button.style.border = '1px solid #9ca3af';
        button.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
        button.style.padding = '0';
        button.style.marginRight = '0';
        button.style.marginBottom = '0';
        button.style.display = 'inline-flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
      });

      // Force w-5 h-5 elements to be 20px
      const w5Elements = card.querySelectorAll('.w-5, .h-5');
      w5Elements.forEach((el) => {
        const element = el as HTMLElement;
        element.style.width = '20px';
        element.style.height = '20px';
        element.style.minWidth = '20px';
        element.style.minHeight = '20px';
      });

      // Container padding reduction
      card.style.padding = '8px';

      // Force row spacing - Match Electron space-y-2 (8px)
      const spaceY2 = card.querySelectorAll('.space-y-2 > *');
      spaceY2.forEach((el, index) => {
        if (index > 0) {
          const element = el as HTMLElement;
          element.style.marginTop = '8px';
        }
      });

      // Force section spacing - Match Electron space-y-4 (16px)
      const spaceY4 = card.querySelectorAll('.space-y-4 > *');
      spaceY4.forEach((el, index) => {
        if (index > 0) {
          const element = el as HTMLElement;
          element.style.marginTop = '16px';
        }
      });

      // Force section separators
      const separators = card.querySelectorAll('.border-b.border-gray-200.my-4');
      separators.forEach((sep) => {
        const separator = sep as HTMLElement;
        separator.style.marginTop = '16px';
        separator.style.marginBottom = '16px';
        separator.style.borderBottom = '1px solid #e5e7eb';
      });

      // Force row labels - Match Electron w-16 (64px)
      const rowLabels = card.querySelectorAll('.w-16');
      rowLabels.forEach((label) => {
        const labelEl = label as HTMLElement;
        labelEl.style.width = '64px';
      });

      // Force full width usage
      const flexElements = card.querySelectorAll(
        '.flex.justify-center.w-full, .flex.flex-row.items-center.w-full'
      );
      flexElements.forEach((el) => {
        const element = el as HTMLElement;
        element.style.width = '100%';
        element.style.justifyContent = 'flex-start';
      });

      // Force content area to fill container
      const spaceY4Container = card.querySelector('.space-y-4') as HTMLElement;
      if (spaceY4Container) {
        spaceY4Container.style.width = '100%';
        spaceY4Container.style.maxWidth = 'none';
      }

      console.log('[WEB DEBUG] SeatGridPreview visuals applied:', {
        container: '1024px x 540px with 8px padding',
        buttons: `${allButtons.length} buttons set to 24px x 24px`,
        rows: `${spaceY2.length} rows with 8px spacing`,
        sections: `${spaceY4.length} sections with 16px spacing`,
        separators: `${separators.length} section separators`,
        rowLabels: `${rowLabels.length} row labels (64px)`,
      });
    }
  } catch (error) {
    console.warn('[WEB] Failed to force card sizes:', error);
  }
}

/**
 * Setup layout observer to reapply card sizes on DOM changes
 */
function setupLayoutObserver(): void {
  if (isElectron() || typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  try {
    // Initial apply + retry while content renders
    forceCheckoutCardSizes();
    let retries = 20;
    const intervalId = window.setInterval(() => {
      forceCheckoutCardSizes();
      retries -= 1;
      if (retries <= 0) {
        window.clearInterval(intervalId);
      }
    }, 200);

    // Reapply on DOM changes (route changes, list updates)
    const observer = new MutationObserver(() => {
      forceCheckoutCardSizes();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } catch (error) {
    console.warn('[WEB] Failed to setup layout observer:', error);
  }
}

/**
 * Debug logging for layout dimensions (development only)
 */
function debugLayoutDimensions(): void {
  if (isElectron() || typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  // Only run in development
  if (import.meta.env.PROD) {
    return;
  }

  setTimeout(() => {
    try {
      const selectors = [
        '.flex.flex-row.w-full.max-w-full.lg\\:max-w-5xl',
        '.flex.flex-row.w-full.max-w-full',
        '.lg\\:max-w-5xl',
        '.flex.flex-row',
        '[class*="flex-row"]',
        '[class*="max-w-5xl"]',
      ];

      let container: Element | null = null;
      let foundSelector = '';

      for (const selector of selectors) {
        container = document.querySelector(selector);
        if (container) {
          foundSelector = selector;
          break;
        }
      }

      if (container) {
        const computedStyle = window.getComputedStyle(container);
        console.log('[WEB DEBUG] Container found with selector:', foundSelector);
        console.log('[WEB DEBUG] Container dimensions:', {
          element: container,
          classes: container.className,
          computedWidth: computedStyle.width,
          computedHeight: computedStyle.height,
          computedMaxHeight: computedStyle.maxHeight,
          computedMinHeight: computedStyle.minHeight,
          computedGap: computedStyle.gap,
          computedAlignItems: computedStyle.alignItems,
          computedFlexShrink: computedStyle.flexShrink,
          computedOverflow: computedStyle.overflow,
          computedBoxSizing: computedStyle.boxSizing,
          clientWidth: container.clientWidth,
          clientHeight: container.clientHeight,
          offsetWidth: (container as HTMLElement).offsetWidth,
          offsetHeight: (container as HTMLElement).offsetHeight,
        });

        // Check children
        const children = Array.from(container.children);
        children.forEach((child, index) => {
          const childElement = child as HTMLElement;
          const childStyle = window.getComputedStyle(childElement);
          console.log(`[WEB DEBUG] Child ${index}:`, {
            element: childElement,
            classes: childElement.className,
            computedWidth: childStyle.width,
            computedHeight: childStyle.height,
            computedMaxHeight: childStyle.maxHeight,
            computedMinHeight: childStyle.minHeight,
            computedFlexShrink: childStyle.flexShrink,
            computedOverflow: childStyle.overflow,
            computedBoxSizing: childStyle.boxSizing,
            clientWidth: childElement.clientWidth,
            clientHeight: childElement.clientHeight,
            offsetWidth: childElement.offsetWidth,
            offsetHeight: childElement.offsetHeight,
          });
        });
      } else {
        console.log('[WEB DEBUG] Container not found with any selector!');
      }
    } catch (error) {
      console.warn('[WEB DEBUG] Failed to debug layout dimensions:', error);
    }
  }, 1000);
}

/**
 * Apply all web DOM overrides
 * Orchestrates zoom, card sizes, observer, and debug logging
 * Uses requestIdleCallback to avoid blocking render
 */
export function applyWebOverrides(): void {
  if (isElectron() || typeof window === 'undefined') {
    return;
  }

  const applyOverrides = () => {
    applyZoom();
    setupLayoutObserver();
    debugLayoutDimensions();
  };

  // Defer DOM manipulation using requestIdleCallback or setTimeout
  if ('requestIdleCallback' in window) {
    requestIdleCallback(applyOverrides, { timeout: 2000 });
  } else {
    setTimeout(applyOverrides, 100);
  }
}

