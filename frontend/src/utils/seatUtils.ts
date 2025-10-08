/**
 * Seat utility functions extracted from Checkout.tsx
 * Industry standard: Pure functions in separate utility files
 */

import { seatsByRow } from '@/lib/seatMatrix';

/**
 * Helper function to check if a row has aisles/gaps
 * @param row - Row identifier
 * @returns True if row has aisles/gaps
 */
export const hasAisles = (row: string): boolean => {
  const seatArray = seatsByRow[row];
  if (!seatArray) return false;
  return seatArray.includes('');
};

/**
 * Helper function to find the center gap position in a row
 * @param row - Row identifier
 * @returns Center gap position or -1 if no gaps
 */
export const findCenterGapPosition = (row: string): number => {
  const seatArray = seatsByRow[row];
  if (!seatArray) return -1;
  
  // Find all gaps in the row
  const gapIndices = seatArray.reduce((indices, seat, index) => {
    if (seat === '') indices.push(index);
    return indices;
  }, [] as number[]);
  
  if (gapIndices.length === 0) return -1;
  
  // If there's only one gap, return it
  if (gapIndices.length === 1) return gapIndices[0];
  
  // If there are multiple gaps, find the one closest to the center of the row
  const rowCenter = Math.floor(seatArray.length / 2);
  const centerGap = gapIndices.reduce((closest, current) => {
    return Math.abs(current - rowCenter) < Math.abs(closest - rowCenter) ? current : closest;
  }, gapIndices[0]);
  
  return centerGap;
};

/**
 * Strict contiguity check using row layout (no crossing aisles, indices must be adjacent)
 * @param row - Row identifier
 * @param seatsList - Array of seat objects
 * @returns True if seats are strictly contiguous
 */
export const isStrictlyContiguous = (row: string, seatsList: any[]): boolean => {
  if (!seatsList || seatsList.length <= 1) return true;
  const layout: any[] = seatsByRow[row] || [];
  // Map each seat number to its index in the row layout
  const indices = seatsList
    .map(s => layout.indexOf(s.number))
    .filter(idx => idx !== -1)
    .sort((a, b) => a - b);
  if (indices.length !== seatsList.length) return false;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  return true;
};

/**
 * Helper: get base row for the class (container base)
 * @param cls - Class object with label and rows
 * @returns Base row identifier
 */
export const getBaseRowForClass = (cls: any): string => {
  const label = (cls.label || '').toUpperCase();
  if (label.includes('CLASSIC')) return 'G';
  if (label.includes('FIRST')) return 'F';
  // default: last row in the class
  return cls.rows[cls.rows.length - 1];
};

/**
 * Helper function to get row priority (A=1, B=2, etc.)
 * @param row - Row identifier
 * @returns Priority number (lower = higher priority)
 */
export const getRowPriority = (row: string): number => {
  if (row === 'A') return 1;
  if (row === 'B') return 2;
  if (row === 'C') return 3;
  if (row === 'D') return 4;
  if (row === 'E') return 5;
  if (row === 'F') return 6;
  if (row === 'G') return 7;
  if (row === 'H') return 8;
  return 99;
};
