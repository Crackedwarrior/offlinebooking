/**
 * Carrot expansion utilities
 * Extracted from carrotUtils.ts
 */

import { getBaseRowForClass } from '@/utils/seatUtils';
import type { Seat } from './types';

/**
 * Check if carrot has hit the base line
 * @param currentCarrot - Current selected seats
 * @param cls - Class object
 * @returns True if at or past base line
 */
export const hasHitBaseLine = (currentCarrot: Seat[], cls: any): boolean => {
  if (currentCarrot.length === 0) return false;
  
  const currentRow = currentCarrot[0].row;
  const baseRow = getBaseRowForClass(cls);
  const currentIndex = cls.rows.indexOf(currentRow);
  const baseIndex = cls.rows.indexOf(baseRow);
  
  return currentIndex >= baseIndex;
};

/**
 * Widen carrot horizontally (fill entire rows above base line)
 * @param carrotRows - Array of row identifiers
 * @param baseRow - Base row identifier
 * @param availableSeats - Array of available seats
 * @returns Widened seats or null
 */
export const widenCarrotHorizontally = (carrotRows: string[], baseRow: string, availableSeats: Seat[]): Seat[] | null => {
  const baseIndex = carrotRows.indexOf(baseRow);
  const rowsAboveBase = carrotRows.slice(0, baseIndex);
  
  const widenedSeats: Seat[] = [];
  
  for (const row of rowsAboveBase) {
    const rowSeats = availableSeats.filter(seat => seat.row === row);
    widenedSeats.push(...rowSeats);
  }
  
  return widenedSeats.length > 0 ? widenedSeats : null;
};

/**
 * Expand into penalty zone (fill entire class below base line)
 * @param classRows - Array of row identifiers for the class
 * @param baseRow - Base row identifier
 * @param availableSeats - Array of available seats
 * @returns Expanded seats or null
 */
export const expandIntoPenaltyZone = (classRows: string[], baseRow: string, availableSeats: Seat[]): Seat[] | null => {
  const baseIndex = classRows.indexOf(baseRow);
  const penaltyRows = classRows.slice(baseIndex);
  const expandedSeats: Seat[] = [];
  
  for (const row of penaltyRows) {
    const rowSeats = availableSeats.filter(seat => seat.row === row);
    expandedSeats.push(...rowSeats);
  }
  
  return expandedSeats.length > 0 ? expandedSeats : null;
};

