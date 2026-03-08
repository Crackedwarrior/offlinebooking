/**
 * Helper functions for Box vs Online Report
 * Extracted from BoxVsOnlineReport.tsx
 */

import { useSettingsStore } from '@/store/settingsStore';

/**
 * Extract class label from seat ID
 */
export const extractClassFromSeatId = (seatId: string): string | null => {
  // Extract row prefix from seat ID (e.g., "SC-D1" -> "SC")
  const rowPrefix = seatId.split('-')[0];
  
  // Map row prefixes to class labels - match with server.ts implementation
  const classMapping: Record<string, string> = {
    'BOX': 'BOX',
    'SC': 'STAR CLASS',
    'CB': 'CLASSIC',  // CLASSIC instead of CLASSIC BALCONY to match server.ts
    'FC': 'FIRST CLASS',
    'SC2': 'SECOND CLASS'  // SC2 instead of SEC to match server.ts
  };
  
  // Check for exact match first
  if (classMapping[rowPrefix]) {
    return classMapping[rowPrefix];
  }
  
  // If no exact match, check for prefix match (for cases like SC2-A1)
  for (const [prefix, classLabel] of Object.entries(classMapping)) {
    if (rowPrefix.startsWith(prefix)) {
      return classLabel;
    }
  }
  
  // Log warning for unrecognized seat IDs
  console.warn(`Unrecognized seat ID prefix: ${rowPrefix} in ${seatId}`);

  // No fallback misclassification in reports
  return null;
};

/**
 * Extract show from seat ID (fallback function)
 */
export const extractShowFromSeatId = (seatId: string): string => {
  // This is a fallback function - BMS seats should have show info in the data
  // For now, we'll use a simple mapping based on seat patterns
  if (seatId.includes('MORNING') || seatId.includes('AM')) return 'MORNING';
  if (seatId.includes('MATINEE') || seatId.includes('PM1')) return 'MATINEE';
  if (seatId.includes('EVENING') || seatId.includes('PM2')) return 'EVENING';
  if (seatId.includes('NIGHT') || seatId.includes('PM3')) return 'NIGHT';
  
  // Default fallback - this should be improved based on actual seat ID patterns
  return 'EVENING';
};

/**
 * Get movie name for a show
 */
export const getMovieNameForShow = (show: string): string => {
  const movie = useSettingsStore.getState().getMovieForShow(show);
  return movie ? movie.name : 'No Movie Assigned';
};

/**
 * Get show label (time) for a show
 */
export const getShowLabel = (show: string): string => {
  // Get dynamic show times from settings store
  const showTimes = useSettingsStore.getState().showTimes;
  const showTime = showTimes.find(st => st.key === show);
  
  if (showTime && showTime.enabled) {
    // Times are now stored in 12-hour format, so use them directly
    return showTime.startTime;
  }
  
  // Fallback to hardcoded timings if settings not available
  const showLabels: Record<string, string> = {
    'MORNING': '11:45 am',
    'MATINEE': '2:45 pm',
    'EVENING': '6:00 pm',
    'NIGHT': '9:30 pm'
  };
  return showLabels[show] || show;
};

/**
 * Get price for a class
 */
export const getPriceForClass = (classLabel: string): number => {
  // Use dynamic pricing from settings store
  try {
    const { getPriceForClass: getPriceFromStore } = useSettingsStore.getState();
    const price = getPriceFromStore(classLabel);
    console.log(`[PRICE] BoxVsOnlineReport: Price for ${classLabel} = ₹${price}`);
    return price;
  } catch {
    console.warn('[WARN] Settings store not available, using fallback price');
    return 150;
  }
};

