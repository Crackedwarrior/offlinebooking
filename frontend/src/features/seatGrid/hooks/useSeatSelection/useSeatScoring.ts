/**
 * Seat scoring utilities for useSeatSelection
 * Extracted and optimized with memoization
 */

import { useMemo, useCallback } from 'react';
import { seatsByRow } from '@/lib/seatMatrix';
import { hasAisles, getBaseRowForClass } from '../../utils/seatUtils';
import { getRowCenter } from '@/utils/carrotUtils';

/**
 * Calculate carrot container score
 * Optimized: Uses memoized getRowCenter
 */
export const useSeatScoring = () => {
  const calculateCarrotContainerScore = useCallback((block: any[], row: string, cls: any): number => {
    const blockCenter = (block[0].number + block[block.length - 1].number) / 2;
    const rowCenter = getRowCenter(row);
    const centerDistance = Math.abs(blockCenter - rowCenter);

    // Center weight (~70%)
    const centerScore = Math.max(0, 100 - centerDistance * 8);

    // Top-row bias (~25%) across rows (A highest)
    const rowIdx = cls.rows.indexOf(row);
    const topBias = Math.max(0, (cls.rows.length - rowIdx)) * 25 / cls.rows.length * 10;

    // Heavy penalty for rows at/after base (G/H for CLASSIC; F/G for FIRST)
    const baseRow = getBaseRowForClass(cls);
    const baseIdx = cls.rows.indexOf(baseRow);
    let bottomPenalty = 0;
    if (rowIdx >= baseIdx) bottomPenalty = -500 - (rowIdx - baseIdx) * 100;

    // Avoid orphans
    const layout = seatsByRow[row] || [];
    const nums = layout.filter((n: any) => n !== '' && typeof n === 'number');
    const leftBuffer = block[0].number - 1;
    const rightBuffer = (nums[nums.length - 1] || 26) - block[block.length - 1].number;
    const bufferScore = Math.min(leftBuffer, rightBuffer) * 2;

    const containerScore = hasAisles(row) ? 5 : 0;
    const total = centerScore + topBias + bottomPenalty + bufferScore + containerScore;
    return total;
  }, []);

  return {
    calculateCarrotContainerScore
  };
};

