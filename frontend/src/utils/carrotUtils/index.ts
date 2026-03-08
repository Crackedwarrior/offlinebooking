/**
 * Carrot utilities - Main export file
 * Maintains backward compatibility with original carrotUtils.ts
 * Extracted and optimized for performance
 */

// Re-export types
export type { Seat } from './types';

// Re-export selection functions
export { startCarrotAtCenter, findAdjacentToBooked } from './selection';
export { getRowCenter, clearRowCenterCache } from './scoring';

// Re-export growth functions
export { growCarrotIncrementally, growCarrotHorizontally, growCarrotVertically } from './growth';

// Re-export expansion functions
export { hasHitBaseLine, widenCarrotHorizontally, expandIntoPenaltyZone } from './expansion';

// Re-export positioning functions
export { findBestCarrotPosition } from './positioning';

// Re-export scoring functions (for internal use)
export { calculateCarrotScore } from './scoring';

