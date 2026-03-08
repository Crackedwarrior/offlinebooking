/**
 * Carrot growth utilities
 * Extracted from carrotUtils.ts with optimizations
 */

import { isStrictlyContiguous } from '@/utils/seatUtils';
import { getRowCenter, startCarrotAtCenter } from './selection';
import { getBaseRowForClass } from '@/utils/seatUtils';
import type { Seat } from './types';

/**
 * Grow carrot incrementally (+1 seat per click) with outward expansion priority
 * Optimized: Use Set for O(1) lookups, early exits
 * @param currentCarrot - Current selected seats
 * @param availableSeats - Array of available seats
 * @returns Grown carrot or null
 */
export const growCarrotIncrementally = (currentCarrot: Seat[], availableSeats: Seat[]): Seat[] | null => {
  if (currentCarrot.length === 0) return null;
  
  const row = currentCarrot[0].row;
  const rowCenter = getRowCenter(row);
  
  // Sort once
  const sortedCarrot = [...currentCarrot].sort((a, b) => a.number - b.number);
  
  // Create Set for O(1) lookups
  const availableSet = new Map<number, Seat>();
  availableSeats.forEach(seat => {
    availableSet.set(seat.number, seat);
  });
  
  const minCarrot = sortedCarrot[0].number;
  const maxCarrot = sortedCarrot[sortedCarrot.length - 1].number;
  const currentBlockCenter = (minCarrot + maxCarrot) / 2;
  
  // Find left and right expansion options (only +1 seat)
  const leftCandidate = availableSet.get(minCarrot - 1);
  const rightCandidate = availableSet.get(maxCarrot + 1);
  
  // OUTWARD EXPANSION RULE: Prefer expansion away from center
  let bestCandidate: Seat | null = null;
  
  if (leftCandidate && rightCandidate) {
    // Both options available - choose based on outward expansion
    const leftNewCenter = (leftCandidate.number + maxCarrot) / 2;
    const rightNewCenter = (minCarrot + rightCandidate.number) / 2;
    
    const leftDistanceFromCenter = Math.abs(leftNewCenter - rowCenter);
    const rightDistanceFromCenter = Math.abs(rightNewCenter - rowCenter);
    
    // Prefer the option that moves the block center AWAY from row center
    if (leftDistanceFromCenter > rightDistanceFromCenter) {
      bestCandidate = leftCandidate;
    } else if (rightDistanceFromCenter > leftDistanceFromCenter) {
      bestCandidate = rightCandidate;
    } else {
      // Equidistant - prefer the one that keeps block more centered
      bestCandidate = currentBlockCenter < rowCenter ? rightCandidate : leftCandidate;
    }
  } else if (leftCandidate) {
    bestCandidate = leftCandidate;
  } else if (rightCandidate) {
    bestCandidate = rightCandidate;
  }
  
  if (bestCandidate) {
    const newCarrot = [...sortedCarrot, bestCandidate].sort((a, b) => a.number - b.number);
    if (isStrictlyContiguous(row, newCarrot)) {
      return newCarrot;
    }
  }
  
  return null;
};

/**
 * Grow carrot horizontally
 * Optimized: Use Set for O(1) lookups, early exits
 * @param currentCarrot - Current selected seats
 * @param newCount - Target number of seats
 * @param availableSeats - Array of available seats
 * @returns Grown carrot or null
 */
export const growCarrotHorizontally = (currentCarrot: Seat[], newCount: number, availableSeats: Seat[]): Seat[] | null => {
  if (currentCarrot.length === 0 || availableSeats.length < newCount) return null;
  
  const row = currentCarrot[0].row;
  const sortedCarrot = [...currentCarrot].sort((a, b) => a.number - b.number);
  
  // Create Set for O(1) lookups
  const availableSet = new Map<number, Seat>();
  availableSeats.forEach(seat => {
    availableSet.set(seat.number, seat);
  });
  
  const minCarrot = sortedCarrot[0].number;
  const maxCarrot = sortedCarrot[sortedCarrot.length - 1].number;
  const needed = newCount - currentCarrot.length;
  
  const leftExpansion: Seat[] = [];
  const rightExpansion: Seat[] = [];
  
  // Collect left expansion seats
  for (let num = minCarrot - 1; num >= minCarrot - needed && leftExpansion.length < needed; num--) {
    const seat = availableSet.get(num);
    if (seat) {
      leftExpansion.unshift(seat);
    } else {
      break; // Early exit if gap found
    }
  }
  
  // Collect right expansion seats
  for (let num = maxCarrot + 1; num <= maxCarrot + needed && rightExpansion.length < needed; num++) {
    const seat = availableSet.get(num);
    if (seat) {
      rightExpansion.push(seat);
    } else {
      break; // Early exit if gap found
    }
  }
  
  // Try left expansion first
  if (leftExpansion.length === needed) {
    const expandedBlock = [...leftExpansion, ...sortedCarrot];
    if (isStrictlyContiguous(row, expandedBlock)) {
      return expandedBlock;
    }
  }
  
  // Try right expansion
  if (rightExpansion.length === needed) {
    const expandedBlock = [...sortedCarrot, ...rightExpansion];
    if (isStrictlyContiguous(row, expandedBlock)) {
      return expandedBlock;
    }
  }
  
  return null;
};

/**
 * Grow carrot vertically
 * @param currentCarrot - Current selected seats
 * @param newCount - Target number of seats
 * @param availableSeats - Array of available seats
 * @param cls - Class object
 * @returns Grown carrot or null
 */
export const growCarrotVertically = (currentCarrot: Seat[], newCount: number, availableSeats: Seat[], cls: any): Seat[] | null => {
  if (currentCarrot.length === 0) return null;
  
  const currentRow = currentCarrot[0].row;
  const currentRowIndex = cls.rows.indexOf(currentRow);
  const baseRow = getBaseRowForClass(cls);
  const baseIndex = cls.rows.indexOf(baseRow);
  
  if (currentRowIndex >= baseIndex) return null;
  
  const nextRowIndex = currentRowIndex + 1;
  if (nextRowIndex >= cls.rows.length) return null;
  
  const nextRow = cls.rows[nextRowIndex];
  const nextRowSeats = availableSeats.filter(seat => seat.row === nextRow);
  
  if (nextRowSeats.length < newCount) return null;
  
  const centerBlock = startCarrotAtCenter(nextRow, newCount, nextRowSeats);
  return centerBlock;
};

