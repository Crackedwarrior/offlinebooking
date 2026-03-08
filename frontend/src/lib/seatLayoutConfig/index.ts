// Main index file for seat layout configuration
// Re-exports all types, functions, and instances for backward compatibility

// Export types
export type {
  SeatLayout,
  TheaterSection,
  TheaterRow,
  SeatPosition
} from './types';

// Export default layout
export { createDefaultLayout, getDefaultLayout } from './defaultLayout';

// Export alternative layouts
export { getAlternativeLayouts, getTheaterLayouts } from './alternativeLayouts';

// Export manager class and instance
export { SeatLayoutManager, seatLayoutManager } from './manager';

// Export sections (for advanced usage)
export { boxSection } from './sections/boxSection';
export { starClassSection } from './sections/starClassSection';
export { classicBalconySection } from './sections/classicBalconySection';
export { firstClassSection } from './sections/firstClassSection';
export { secondClassSection } from './sections/secondClassSection';

// Lazy-loaded default layout (for backward compatibility)
let _defaultLayout: typeof import('./defaultLayout').SeatLayout | null = null;

export function getDEFAULT_THEATER_LAYOUT() {
  if (!_defaultLayout) {
    _defaultLayout = require('./defaultLayout').getDefaultLayout();
  }
  return _defaultLayout;
}

// Lazy-loaded theater layouts (for backward compatibility)
let _theaterLayouts: typeof import('./alternativeLayouts').SeatLayout[] | null = null;

export function getTHEATER_LAYOUTS() {
  if (!_theaterLayouts) {
    _theaterLayouts = require('./alternativeLayouts').getTheaterLayouts();
  }
  return _theaterLayouts;
}

// Lazy-loaded seatsByRow (generated on first access)
let _seatsByRow: Record<string, (number | string)[]> | null = null;

export function getSeatsByRow(): Record<string, (number | string)[]> {
  if (!_seatsByRow) {
    const { seatLayoutManager } = require('./manager');
    _seatsByRow = seatLayoutManager.generateSeatMatrix();
  }
  return _seatsByRow;
}

