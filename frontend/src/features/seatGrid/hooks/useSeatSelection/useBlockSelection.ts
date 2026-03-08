/**
 * Block selection utilities for useSeatSelection
 * Extracted and optimized
 */

import { useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { seatsByRow } from '@/lib/seatMatrix';
import { hasAisles, findCenterGapPosition, isStrictlyContiguous } from '../../utils/seatUtils';
import { getRowCenter, startCarrotAtCenter } from '@/utils/carrotUtils';

/**
 * Block selection logic
 * Optimized: Memoized calculations, early exits
 */
export const useBlockSelection = (growToggle: boolean, setGrowToggle: (value: boolean | ((prev: boolean) => boolean)) => void) => {
  const { seats } = useBookingStore();

  /**
   * Strict top→down: pick first row that can satisfy, choose the block closest to the ROW CENTER
   * Optimized: Uses memoized getRowCenter, early exits
   */
  const findBestBlockTopDownStrict = useCallback((cls: any, newCount: number) => {
    for (const row of cls.rows) {
      // Filter and sort once
      const available = seats
        .filter(seat => seat.row === row && seat.status === 'AVAILABLE')
        .sort((a, b) => a.number - b.number);

      if (available.length < newCount) continue;

      const rowCenter = getRowCenter(row);
      let best: any[] | null = null;
      let bestDist = Infinity;

      for (let i = 0; i <= available.length - newCount; i++) {
        const block = available.slice(i, i + newCount);
        
        // Early exit if not contiguous
        if (!isStrictlyContiguous(row, block)) continue;

        const blockCenter = (block[0].number + block[block.length - 1].number) / 2;
        const dist = Math.abs(blockCenter - rowCenter);

        // Early exit if perfect match
        if (dist < 0.1) {
          setGrowToggle(prev => !prev);
          return { row, seats: block };
        }

        if (dist < bestDist || (Math.abs(dist - bestDist) < 1e-6 && (growToggle ? block[0].number < (best?.[0]?.number ?? Infinity) : block[0].number > (best?.[0]?.number ?? -Infinity)))) {
          bestDist = dist;
          best = block;
        }
      }

      if (best) {
        setGrowToggle(prev => !prev);
        return { row, seats: best };
      }
    }
    return null;
  }, [seats, growToggle, setGrowToggle]);

  /**
   * Get center-first seat selection for rows with aisles
   * Optimized: Removed console.logs, early exits
   */
  const getCenterFirstSeats = useCallback((rowSeats: any[], count: number, row: string) => {
    if (!hasAisles(row)) {
      return null;
    }
    
    const gapPosition = findCenterGapPosition(row);
    if (gapPosition === -1) {
      return null;
    }
    
    // Get available seats sorted by seat number
    const availableSeats = rowSeats.filter(seat => seat.status === 'AVAILABLE').sort((a, b) => a.number - b.number);
    
    if (availableSeats.length < count) {
      return null;
    }
    
    let bestBlock = null;
    let bestScore = -1;

    // Try all possible starting positions
    for (let startIndex = 0; startIndex <= availableSeats.length - count; startIndex++) {
      const candidate = availableSeats.slice(startIndex, startIndex + count);
      
      // Check if block is contiguous
      const isContiguous = candidate.every((seat, index) => {
        if (index === 0) return true;
        return seat.number === candidate[index - 1].number + 1;
      });

      if (isContiguous) {
        let score = 0;
        
        // Factor 1: Distance to center gap
        const blockCenter = (candidate[0].number + candidate[candidate.length - 1].number) / 2;
        const gapDistance = Math.abs(blockCenter - gapPosition);
        const centerScore = (availableSeats.length - gapDistance) / availableSeats.length * 4;
        score += centerScore;

        // Factor 2: Buffer seats on both sides
        const hasLeftBuffer = startIndex > 0;
        const hasRightBuffer = startIndex + count < availableSeats.length;
        if (hasLeftBuffer) score += 2;
        if (hasRightBuffer) score += 2;

        // Factor 3: Avoid breaking potential family blocks
        const remainingLeft = availableSeats.slice(0, startIndex);
        const remainingRight = availableSeats.slice(startIndex + count);
        if (remainingLeft.length >= 3) score += 1;
        if (remainingRight.length >= 3) score += 1;
        
        if (score > bestScore) {
          bestScore = score;
          bestBlock = candidate;
        }
      }
    }
    
    return bestBlock;
  }, []);

  /**
   * Find the best contiguous block for family seating
   * Optimized: Removed console.logs, early exits
   */
  const findContiguousBlock = useCallback((rowSeats: any[], count: number, startFromIndex: number = 0) => {
    if (rowSeats.length < count) {
      return null;
    }
    
    let bestBlock = null;
    let bestScore = -1;

    // Try all possible starting positions from startFromIndex
    for (let i = startFromIndex; i <= rowSeats.length - count; i++) {
      const candidate = rowSeats.slice(i, i + count);
      
      // Check if block is contiguous
      const isContiguous = candidate.every((s: any, j: number) => {
        if (j === 0) return true;
        return s.number === candidate[j - 1].number + 1;
      });

      if (isContiguous) {
        // Score the block based on multiple factors
        let score = 0;
        
        // Factor 1: Buffer seats - prefer blocks with empty seats on both sides
        const hasLeftBuffer = i > 0;
        const hasRightBuffer = i + count < rowSeats.length;
        if (hasLeftBuffer) score += 2;
        if (hasRightBuffer) score += 2;

        // Factor 2: Center alignment - prefer blocks closer to center
        const rowCenter = Math.floor(rowSeats.length / 2);
        const blockCenter = i + Math.floor(count / 2);
        const centerDistance = Math.abs(blockCenter - rowCenter);
        const centerScore = (rowSeats.length - centerDistance) / rowSeats.length * 3;
        score += centerScore;

        // Factor 3: Prefer blocks that don't break up other potential family blocks
        const remainingLeft = rowSeats.slice(0, i);
        const remainingRight = rowSeats.slice(i + count);
        if (remainingLeft.length >= 3) score += 1;
        if (remainingRight.length >= 3) score += 1;
        
        if (score > bestScore) {
          bestScore = score;
          bestBlock = candidate;
        }
      }
    }
    
    return bestBlock;
  }, []);

  /**
   * Find a contiguous block that is directly adjacent to a BOOKED/BMS seat
   * Optimized: Uses Set for O(1) lookups, early exits
   */
  const findBlockAdjacentToBooked = useCallback((cls: any, newCount: number) => {
    type Cand = { row: string; seats: any[]; dist: number; };
    const candidates: Cand[] = [];

    for (const row of cls.rows) {
      const rowLayout = seatsByRow[row];
      if (!rowLayout) continue;

      // Use Set for O(1) lookups
      const bookedNums = new Set(
        seats
          .filter(s => s.row === row && (s.status === 'BOOKED' || s.status === 'BMS_BOOKED'))
          .map(s => s.number)
      );
      
      if (bookedNums.size === 0) continue;

      const availSeats = seats
        .filter(s => s.row === row && s.status === 'AVAILABLE')
        .sort((a, b) => a.number - b.number);
      
      if (availSeats.length < newCount) continue;

      const center = getRowCenter(row);

      for (let i = 0; i <= availSeats.length - newCount; i++) {
        const block = availSeats.slice(i, i + newCount);
        
        if (!isStrictlyContiguous(row, block)) continue;

        const leftNum = block[0].number - 1;
        const rightNum = block[block.length - 1].number + 1;
        const leftNeighborIdx = rowLayout.indexOf(leftNum as any);
        const rightNeighborIdx = rowLayout.indexOf(rightNum as any);

        const leftIsBooked = leftNeighborIdx !== -1 && bookedNums.has(leftNum);
        const rightIsBooked = rightNeighborIdx !== -1 && bookedNums.has(rightNum);

        if (leftIsBooked || rightIsBooked) {
          const blockCenter = (block[0].number + block[block.length - 1].number) / 2;
          const dist = Math.abs(blockCenter - center);
          candidates.push({ row, seats: block, dist });
        }
      }
    }

    if (candidates.length === 0) return null;
    
    // Prefer closest to center; tie-break by row order (earlier = higher priority)
    candidates.sort((a, b) => {
      if (a.dist !== b.dist) return a.dist - b.dist;
      // Left-bias when distance to center ties: prefer block whose left edge is nearer to center
      const aLeft = a.seats[0].number;
      const bLeft = b.seats[0].number;
      if (aLeft !== bLeft) return aLeft < bLeft ? -1 : 1;
      const ia = cls.rows.indexOf(a.row);
      const ib = cls.rows.indexOf(b.row);
      return ia - ib;
    });
    
    return { row: candidates[0].row, seats: candidates[0].seats };
  }, [seats]);

  /**
   * Find best block across rows with priority system
   * Optimized: Removed console.logs, early exits
   */
  const findBestBlockAcrossRows = useCallback((cls: any, count: number, currentRow?: string, selectedSeats?: any[]): any => {
    // Sort rows by priority (A, B, C, D, E, F, G, H) - TOP ROWS FIRST, G and H have LOWEST priority
    const sortedRows = [...cls.rows].sort((a: string, b: string) => {
      const priorities = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 999, 'H': 999 };
      return (priorities[a as keyof typeof priorities] || 999) - (priorities[b as keyof typeof priorities] || 999);
    });
    
    let bestBlock: any = null;
    let bestScore = -Infinity;
    
    for (const row of sortedRows) {
      const availableSeats = seats.filter(seat => seat.row === row && seat.status === 'AVAILABLE');
      
      if (availableSeats.length >= count) {
        const centerBlock = startCarrotAtCenter(row, count, availableSeats);
        if (centerBlock && centerBlock.length === count) {
          // Calculate score based on row priority and center alignment
          const rowPriority = sortedRows.indexOf(row);
          const score = 1000 - rowPriority; // Higher score for higher priority rows
          
          if (score > bestScore) {
            bestScore = score;
            bestBlock = { row, seats: centerBlock };
          }
        }
      }
    }
    
    return bestBlock;
  }, [seats]);

  return {
    findBestBlockTopDownStrict,
    getCenterFirstSeats,
    findContiguousBlock,
    findBlockAdjacentToBooked,
    findBestBlockAcrossRows
  };
};

