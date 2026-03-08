/**
 * Seat selection utilities for carrot algorithm
 * Extracted from carrotUtils.ts with optimizations
 */

import { isStrictlyContiguous } from '@/utils/seatUtils';
import { getRowCenter } from './scoring';
import type { Seat } from './types';

// Re-export getRowCenter for backward compatibility
export { getRowCenter };

/**
 * Start carrot at center of a row
 * Optimized: Early exit, cached row center
 * @param row - Row identifier
 * @param count - Number of seats needed
 * @param availableSeats - Array of available seats
 * @returns Selected seats or null
 */
export const startCarrotAtCenter = (row: string, count: number, availableSeats: Seat[]): Seat[] | null => {
  if (availableSeats.length < count) return null;
  
  const rowCenter = getRowCenter(row);
  
  // Sort once and reuse
  const sortedSeats = [...availableSeats].sort((a, b) => a.number - b.number);
  
  let bestBlock: Seat[] | null = null;
  let bestDistance = Infinity;
  
  // Early exit optimization: stop if we find a perfect match (distance = 0)
  for (let i = 0; i <= sortedSeats.length - count; i++) {
    const block = sortedSeats.slice(i, i + count);
    
    // Quick check: if block is not contiguous, skip
    if (!isStrictlyContiguous(row, block)) continue;
    
    const blockCenter = (block[0].number + block[block.length - 1].number) / 2;
    const distance = Math.abs(blockCenter - rowCenter);
    
    // Early exit if perfect match
    if (distance < 0.1) {
      return block;
    }
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestBlock = block;
    }
  }
  
  return bestBlock;
};

/**
 * Find single adjacent seat to booked seats
 * Optimized: Use Set for O(1) lookups
 * @param row - Row identifier
 * @param availableSeats - Array of available seats
 * @param bookedSeats - Array of booked seats
 * @returns Best adjacent seat or null
 */
const findSingleAdjacentSeat = (row: string, availableSeats: Seat[], bookedSeats: Seat[]): Seat | null => {
  const rowCenter = getRowCenter(row);
  
  // Create Set for O(1) lookups
  const availableSet = new Map<number, Seat>();
  availableSeats.forEach(seat => {
    availableSet.set(seat.number, seat);
  });
  
  const bookedNumbers = new Set(bookedSeats.map(s => s.number));
  
  let bestAdjacentSeat: Seat | null = null;
  let bestDistance = Infinity;
  
  // Check all booked seats for adjacent available seats
  for (const bookedNumber of bookedNumbers) {
    // Check left adjacent
    const leftNumber = bookedNumber - 1;
    const leftSeat = availableSet.get(leftNumber);
    if (leftSeat) {
      const distance = Math.abs(leftSeat.number - rowCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAdjacentSeat = leftSeat;
      }
    }
    
    // Check right adjacent
    const rightNumber = bookedNumber + 1;
    const rightSeat = availableSet.get(rightNumber);
    if (rightSeat) {
      const distance = Math.abs(rightSeat.number - rowCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestAdjacentSeat = rightSeat;
      }
    }
  }
  
  return bestAdjacentSeat;
};

/**
 * Grow from an adjacent seat
 * Optimized: Use Set for O(1) lookups
 * @param adjacentSeat - Starting adjacent seat
 * @param count - Number of seats needed
 * @param availableSeats - Array of available seats
 * @returns Grown seat block or null
 */
const growFromAdjacentSeat = (adjacentSeat: Seat, count: number, availableSeats: Seat[]): Seat[] | null => {
  const row = adjacentSeat.row;
  const rowCenter = getRowCenter(row);
  
  // Create Set for O(1) lookups
  const availableSet = new Map<number, Seat>();
  availableSeats.forEach(seat => {
    availableSet.set(seat.number, seat);
  });
  
  // Determine growth direction
  const shouldGrowLeft = adjacentSeat.number < rowCenter;
  
  let result = [adjacentSeat];
  
  for (let i = 1; i < count; i++) {
    const nextNumber = shouldGrowLeft ? adjacentSeat.number - i : adjacentSeat.number + i;
    const nextSeat = availableSet.get(nextNumber);
    
    if (nextSeat) {
      if (shouldGrowLeft) {
        result.unshift(nextSeat);
      } else {
        result.push(nextSeat);
      }
    } else {
      break;
    }
  }
  
  if (result.length === count && isStrictlyContiguous(row, result)) {
    return result;
  }
  
  return null;
};

/**
 * Find seats adjacent to booked seats, prefer center side
 * Optimized: Removed console.logs for production performance
 * @param row - Row identifier
 * @param count - Number of seats needed
 * @param availableSeats - Array of available seats
 * @param bookedSeats - Array of booked seats
 * @returns Selected seats or null
 */
export const findAdjacentToBooked = (row: string, count: number, availableSeats: Seat[], bookedSeats: Seat[]): Seat[] | null => {
  if (availableSeats.length < count || bookedSeats.length === 0) {
    return null;
  }
  
  // Find the best adjacent seat (closest to center)
  const adjacentSeat = findSingleAdjacentSeat(row, availableSeats, bookedSeats);
  
  if (!adjacentSeat) {
    return null;
  }
  
  // Grow from that adjacent seat toward center
  return growFromAdjacentSeat(adjacentSeat, count, availableSeats);
};

