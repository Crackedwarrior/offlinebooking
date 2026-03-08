/**
 * Helper functions for BookingHistory component
 * Extracted from BookingHistory.tsx
 */

/**
 * Maps seat IDs to class labels based on row prefix
 * @param seatId - Seat ID (e.g., "SC-D1", "BOX-A1")
 * @returns Class label or null if not found
 */
export const getClassFromSeatId = (seatId: string): string | null => {
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
  
  console.warn(`Could not determine class for seat ID: ${seatId}`);
  // Do not misclassify unknown rows into STAR CLASS. Return null so caller can ignore.
  return null;
};

/**
 * Returns CSS class name for date picker highlighting
 * @param date - Date to check
 * @param datesWithBookings - Set of dates that have bookings
 * @returns CSS class name or empty string
 */
export const dayClassName = (date: Date, datesWithBookings: Set<string>): string => {
  const dateString = date.toISOString().split('T')[0];
  return datesWithBookings.has(dateString) ? 'has-bookings' : '';
};

/**
 * Gets dates with bookings from a list of bookings
 * @param bookings - Array of booking objects
 * @returns Set of date strings (YYYY-MM-DD format)
 */
export const getDatesWithBookings = (bookings: any[]): Set<string> => {
  const dates = new Set<string>();
  if (bookings && bookings.length > 0) {
    bookings.forEach(booking => {
      const bookingDate = new Date(booking.date).toISOString().split('T')[0];
      dates.add(bookingDate);
    });
  }
  return dates;
};

