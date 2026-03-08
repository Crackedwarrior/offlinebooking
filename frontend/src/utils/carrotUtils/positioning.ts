/**
 * Carrot positioning utilities
 * Extracted from carrotUtils.ts with optimizations
 */

import { isStrictlyContiguous } from '@/utils/seatUtils';
import { startCarrotAtCenter } from './selection';
import { calculateCarrotScore } from './scoring';
import type { Seat } from './types';

/**
 * Find best carrot position using scoring system
 * Optimized: Early exits, cached calculations
 * @param cls - Class object
 * @param count - Number of seats needed
 * @param availableSeats - Array of available seats
 * @param selectedSeats - Array of already selected seats
 * @param currentRow - Optional current row for priority bonus
 * @returns Best seat block or null
 */
export const findBestCarrotPosition = (
  cls: any, 
  count: number, 
  availableSeats: Seat[], 
  selectedSeats: Seat[], 
  currentRow?: string
): Seat[] | null => {
  const searchableSeats = [...availableSeats, ...selectedSeats];
  
  let bestBlock: Seat[] | null = null;
  let bestScore = -Infinity;
  
  const rowsToSearch = currentRow ? [currentRow, ...cls.rows.filter(r => r !== currentRow)] : cls.rows;
  
  for (const row of rowsToSearch) {
    const rowSeats = searchableSeats.filter(seat => seat.row === row);
    if (rowSeats.length < count) continue;
    
    // Sort once per row
    const sortedRowSeats = [...rowSeats].sort((a, b) => a.number - b.number);
    
    for (let i = 0; i <= sortedRowSeats.length - count; i++) {
      const block = sortedRowSeats.slice(i, i + count);
      
      if (isStrictlyContiguous(row, block)) {
        const score = calculateCarrotScore(block, row, cls, currentRow);
        
        // Early exit optimization: if we find a perfect score, return immediately
        if (score > 1500) { // Perfect score threshold
          return block;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestBlock = block;
        }
      }
    }
  }
  
  return bestBlock;
};

