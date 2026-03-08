/**
 * Scoring utilities for carrot algorithm
 * Extracted from carrotUtils.ts with memoization
 */

import { seatsByRow } from '@/lib/seatMatrix';
import { hasAisles, findCenterGapPosition, getBaseRowForClass } from '@/utils/seatUtils';
import type { Seat } from './types';

// Memoization cache for row center calculations
const rowCenterCache = new Map<string, number>();

/**
 * Get row center with memoization
 * @param row - Row identifier
 * @returns Row center position
 */
export const getRowCenter = (row: string): number => {
  // Check cache first
  if (rowCenterCache.has(row)) {
    return rowCenterCache.get(row)!;
  }

  const layout = seatsByRow[row] || [];
  const gap = findCenterGapPosition(row);
  if (gap !== -1) {
    rowCenterCache.set(row, gap);
    return gap;
  }
  
  const nums = layout.filter((n: any) => n !== '' && typeof n === 'number');
  const center = nums.length > 0 ? (nums[0] + nums[nums.length - 1]) / 2 : 0;
  rowCenterCache.set(row, center);
  return center;
};

/**
 * Clear row center cache (useful for testing or when layout changes)
 */
export const clearRowCenterCache = () => {
  rowCenterCache.clear();
};

/**
 * Calculate carrot score for a block of seats
 * @param block - Array of seats
 * @param row - Row identifier
 * @param cls - Class object
 * @param currentRow - Optional current row for priority bonus
 * @returns Score value
 */
export const calculateCarrotScore = (block: Seat[], row: string, cls: any, currentRow?: string): number => {
  const blockCenter = (block[0].number + block[block.length - 1].number) / 2;
  const rowCenter = getRowCenter(row);
  const centerDistance = Math.abs(blockCenter - rowCenter);
  
  // Center weight (~60%)
  const centerScore = Math.max(0, 100 - centerDistance * 8);
  
  // ROW PRIORITY BONUS - Fixed priority system
  let rowPriorityBonus = 0;
  if (currentRow && row === currentRow) {
    rowPriorityBonus = 1000; // MASSIVE bonus to stay in current row
  } else {
    // Fixed row priority system - G and H have LOWEST priority (1 point)
    const rowIdx = cls.rows.indexOf(row);
    const rowPriorities = [500, 400, 300, 200, 100, 50, 1, 1]; // A, B, C, D, E, F, G, H
    rowPriorityBonus = rowPriorities[rowIdx] || 0;
  }
  
  // Heavy penalty for rows at/after base (G/H for CLASSIC; F/G for FIRST)
  const baseRow = getBaseRowForClass(cls);
  const baseIdx = cls.rows.indexOf(baseRow);
  const rowIdx = cls.rows.indexOf(row);
  let bottomPenalty = 0;
  if (rowIdx >= baseIdx) bottomPenalty = -500 - (rowIdx - baseIdx) * 100;
  
  // Avoid orphans
  const layout = seatsByRow[row] || [];
  const nums = layout.filter((n: any) => n !== '' && typeof n === 'number');
  const leftBuffer = block[0].number - 1;
  const rightBuffer = (nums[nums.length - 1] || 26) - block[block.length - 1].number;
  const bufferScore = Math.min(leftBuffer, rightBuffer) * 2;
  
  const containerScore = hasAisles(row) ? 5 : 0;
  const total = centerScore + rowPriorityBonus + bottomPenalty + bufferScore + containerScore;
  
  return total;
};

