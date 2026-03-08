/**
 * Seat calculation utilities
 * Extracted from Settings.tsx
 */

import { SEAT_CLASSES } from '@/lib/config';
import { seatsByRow } from '@/lib/seatMatrix';

/**
 * Calculate seat counts per class
 */
export function calculateSeatCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  
  SEAT_CLASSES.forEach(seatClass => {
    let totalSeats = 0;
    seatClass.rows.forEach(row => {
      const rowSeats = seatsByRow[row];
      if (rowSeats) {
        totalSeats += rowSeats.filter(seat => typeof seat === 'number').length;
      }
    });
    counts[seatClass.label] = totalSeats;
  });
  
  return counts;
}

/**
 * Calculate total seats across all classes
 */
export function calculateTotalSeats(seatCounts: Record<string, number>): number {
  return Object.values(seatCounts).reduce((sum, count) => sum + count, 0);
}

