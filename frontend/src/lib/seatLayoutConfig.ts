// Configurable seat layout system
// This replaces the hardcoded seatMatrix.ts with a flexible configuration system
// 
// Refactored: Extracted into modular structure for better performance and maintainability
// See: frontend/src/lib/seatLayoutConfig/ for the new structure

// Re-export types
export type {
  SeatLayout,
  TheaterSection,
  TheaterRow,
  SeatPosition
} from './seatLayoutConfig/types';

// Re-export manager and instance
export { SeatLayoutManager, seatLayoutManager } from './seatLayoutConfig/manager';

// Re-export default layout functions
export { createDefaultLayout, getDefaultLayout } from './seatLayoutConfig/defaultLayout';

// Re-export alternative layouts
export { getAlternativeLayouts, getTheaterLayouts } from './seatLayoutConfig/alternativeLayouts';

// Backward compatibility: Export DEFAULT_THEATER_LAYOUT
// Import lazily to avoid loading in initial bundle
import { getDefaultLayout } from './seatLayoutConfig/defaultLayout';
export const DEFAULT_THEATER_LAYOUT = getDefaultLayout();

// Backward compatibility: Export THEATER_LAYOUTS
import { getTheaterLayouts } from './seatLayoutConfig/alternativeLayouts';
export const THEATER_LAYOUTS = getTheaterLayouts();

// Backward compatibility: Export seatsByRow (generated from manager)
import { seatLayoutManager } from './seatLayoutConfig/manager';
export const seatsByRow = seatLayoutManager.generateSeatMatrix();
