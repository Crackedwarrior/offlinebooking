/**
 * Custom hook for seat selection logic extracted from Checkout.tsx
 * Industry standard: Custom hooks for complex stateful logic
 */

import { useState, useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { seatsByRow } from '@/lib/seatMatrix';
import { hasAisles, findCenterGapPosition, isStrictlyContiguous, getBaseRowForClass } from '@/utils/seatUtils';
import { 
  startCarrotAtCenter as startCarrotAtCenterUtil, 
  findAdjacentToBooked as findAdjacentToBookedUtil, 
  growCarrotIncrementally as growCarrotIncrementallyUtil,
  growCarrotHorizontally as growCarrotHorizontallyUtil, 
  growCarrotVertically as growCarrotVerticallyUtil, 
  hasHitBaseLine, 
  widenCarrotHorizontally as widenCarrotHorizontallyUtil, 
  expandIntoPenaltyZone as expandIntoPenaltyZoneUtil, 
  findBestCarrotPosition as findBestCarrotPositionUtil,
  type Seat 
} from '@/utils/carrotUtils';

export const useSeatSelection = () => {
  const { seats, selectMultipleSeats, atomicSeatReplacement } = useBookingStore();
  const [growToggle, setGrowToggle] = useState(true); // alternate L/R when perfectly symmetric

  /**
   * Carrot scoring – hoisted as a function so it can be used above
   */
  const calculateCarrotContainerScore = useCallback((block: any[], row: string, cls: any): number => {
    const blockCenter = (block[0].number + block[block.length - 1].number) / 2;
    const layout = seatsByRow[row] || [];
    const nums = layout.filter((n: any) => n !== '' && typeof n === 'number');
    const rowCenter = nums.length > 0 ? (nums[0] + nums[nums.length - 1]) / 2 : 12.5;
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
    const leftBuffer = block[0].number - 1;
    const rightBuffer = (nums[nums.length - 1] || 26) - block[block.length - 1].number;
    const bufferScore = Math.min(leftBuffer, rightBuffer) * 2;

    const containerScore = hasAisles(row) ? 5 : 0;
    const total = centerScore + topBias + bottomPenalty + bufferScore + containerScore;
    return total;
  }, []);

  /**
   * Strict top→down: pick first row that can satisfy, choose the block closest to the ROW CENTER (not leftmost)
   */
  const findBestBlockTopDownStrict = useCallback((cls: any, newCount: number) => {
    const getRowCenter = (row: string): number => {
      const layout = seatsByRow[row] || [];
      // Prefer explicit center-gap position if available
      const gap = typeof (findCenterGapPosition) === 'function' ? (findCenterGapPosition as any)(row) : -1;
      if (gap !== -1) return gap;
      // Fallback to numeric midpoint of first/last seat numbers in the row layout
      const nums = layout.filter((n: any) => n !== '' && typeof n === 'number');
      if (nums.length === 0) return 0;
      return (nums[0] + nums[nums.length - 1]) / 2;
    };

    for (const row of cls.rows) {
      const available = seats
        .filter(seat => seat.row === row && seat.status === 'AVAILABLE')
        .sort((a, b) => a.number - b.number);

      if (available.length < newCount) continue;

      const rowCenter = getRowCenter(row);
      let best: any[] | null = null;
      let bestDist = Infinity;

      for (let i = 0; i <= available.length - newCount; i++) {
        const block = available.slice(i, i + newCount);
        const contiguous = isStrictlyContiguous(row, block);
        if (!contiguous) continue;

        const blockCenter = (block[0].number + block[block.length - 1].number) / 2;
        const dist = Math.abs(blockCenter - rowCenter);

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
  }, [seats, growToggle]);

  /**
   * Helper function to get center-first seat selection for rows with aisles
   */
  const getCenterFirstSeats = useCallback((rowSeats: any[], count: number, row: string) => {
    console.log(`[SEAT] getCenterFirstSeats called for row ${row}, requesting ${count} seats`);
    
    if (!hasAisles(row)) {
      console.log(`[SEAT] Row ${row} doesn't have aisles, returning null`);
      return null;
    }
    
    const gapPosition = findCenterGapPosition(row);
    if (gapPosition === -1) {
      console.log(`[SEAT] No gap position found for row ${row}, returning null`);
      return null;
    }
    
    console.log(`[SEAT] Gap position for row ${row}: ${gapPosition}`);
    
    // Get available seats sorted by seat number
    const availableSeats = rowSeats.filter(seat => seat.status === 'AVAILABLE').sort((a, b) => a.number - b.number);
    
    console.log(`[SEAT] Available seats in row ${row}: ${availableSeats.length}`);
    if (availableSeats.length > 0) {
      console.log(`[SEAT] First available seat: ${availableSeats[0].id}, Last available seat: ${availableSeats[availableSeats.length - 1].id}`);
    }
    
    if (availableSeats.length < count) {
      console.log(`[SEAT] Not enough available seats (${availableSeats.length}) for requested count (${count}), returning null`);
      return null;
    }
    
    let bestBlock = null;
    let bestScore = -1;
    let candidatesChecked = 0;
    let contiguousCandidates = 0;

    // Try all possible starting positions
    for (let startIndex = 0; startIndex <= availableSeats.length - count; startIndex++) {
      const candidate = availableSeats.slice(startIndex, startIndex + count);
      candidatesChecked++;
      
      // Check if block is contiguous
      const isContiguous = candidate.every((seat, index) => {
        if (index === 0) return true;
        return seat.number === candidate[index - 1].number + 1;
      });

      if (isContiguous) {
        contiguousCandidates++;
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

        console.log(`[SEAT] Candidate at index ${startIndex}: score=${score.toFixed(2)}, blockCenter=${blockCenter}, gapDistance=${gapDistance.toFixed(2)}, centerScore=${centerScore.toFixed(2)}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestBlock = candidate;
          console.log(`[SEAT] New best block found at index ${startIndex} with score ${score.toFixed(2)}`);
        }
      }
    }
    
    console.log(`[SEAT] Checked ${candidatesChecked} candidates, found ${contiguousCandidates} contiguous blocks`);
    if (bestBlock) {
      console.log(`[SEAT] Best block found with score ${bestScore.toFixed(2)}: ${bestBlock.map(s => s.id).join(', ')}`);
    } else {
      console.log(`[SEAT] No suitable block found in row ${row}`);
    }
    
    return bestBlock;
  }, []);

  /**
   * Helper function to find the best contiguous block for family seating
   */
  const findContiguousBlock = useCallback((rowSeats: any[], count: number, startFromIndex: number = 0) => {
    console.log(`[SEAT] findContiguousBlock called, requesting ${count} seats, starting from index ${startFromIndex}`);
    
    if (rowSeats.length < count) {
      console.log(`[SEAT] Not enough seats in row (${rowSeats.length}) for requested count (${count}), returning null`);
      return null;
    }
    
    let bestBlock = null;
    let bestScore = -1;
    let candidatesChecked = 0;
    let contiguousCandidates = 0;

    // Try all possible starting positions from startFromIndex
    for (let i = startFromIndex; i <= rowSeats.length - count; i++) {
      const candidate = rowSeats.slice(i, i + count);
      candidatesChecked++;
      
      // Check if block is contiguous
      const isContiguous = candidate.every((s: any, j: number) => {
        if (j === 0) return true;
        return s.number === candidate[j - 1].number + 1;
      });

      if (isContiguous) {
        contiguousCandidates++;
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

        console.log(`[SEAT] Candidate at index ${i}: score=${score.toFixed(2)}, blockCenter=${blockCenter}, centerDistance=${centerDistance}, centerScore=${centerScore.toFixed(2)}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestBlock = candidate;
          console.log(`[SEAT] New best block found at index ${i} with score ${score.toFixed(2)}`);
        }
      }
    }
    
    console.log(`[SEAT] Checked ${candidatesChecked} candidates, found ${contiguousCandidates} contiguous blocks`);
    if (bestBlock) {
      console.log(`[SEAT] Best block found with score ${bestScore.toFixed(2)}: ${bestBlock.map(s => s.id).join(', ')}`);
    } else {
      console.log(`[SEAT] No suitable block found`);
    }
    
    return bestBlock;
  }, []);

  /**
   * NEW: Incremental carrot growth (+1 seat per click) with outward expansion priority
   */
  const growCarrotInRow = useCallback((row: string, selectedSeatsInRow: any[], newCount: number) => {
    console.log(`[SEAT] growCarrotInRow called: row=${row}, selectedSeatsInRow.length=${selectedSeatsInRow.length}, newCount=${newCount}`);
    
    try {
      if (!selectedSeatsInRow || selectedSeatsInRow.length === 0) return null;
      
      // Convert to Seat format for carrotUtils
      const currentCarrot: Seat[] = selectedSeatsInRow.map(seat => ({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        status: seat.status
      }));
      
      console.log(`[SEAT] currentCarrot:`, currentCarrot);
      
      const availableSeats: Seat[] = seats
        .filter(s => s.row === row && s.status === 'AVAILABLE')
        .map(seat => ({
          id: seat.id,
          row: seat.row,
          number: seat.number,
          status: seat.status
        }));
      
      console.log(`[SEAT] availableSeats in row ${row}:`, availableSeats);
      
      // Use the new incremental growth function
      const grownCarrot = growCarrotIncrementallyUtil(currentCarrot, availableSeats);
      
      console.log(`[SEAT] grownCarrot result:`, grownCarrot);
      
      if (grownCarrot && grownCarrot.length === newCount) {
        // Convert back to original format
        const result = grownCarrot.map(seat => 
          seats.find(s => s.id === seat.id)
        ).filter(Boolean);
        
        console.log(`[SEAT] growCarrotInRow returning:`, result);
        return result;
      }
      
      console.log(`[SEAT] growCarrotInRow returning null - no valid growth found`);
      return null;
    } catch (error) {
      console.log(`[ERROR] growCarrotInRow error:`, error);
      return null;
    }
  }, [seats, growCarrotIncrementallyUtil]);

  /**
   * Find a contiguous block that is directly adjacent to a BOOKED/BMS seat
   */
  const findBlockAdjacentToBooked = useCallback((cls: any, newCount: number) => {
    type Cand = { row: string; seats: any[]; dist: number; };
    const candidates: Cand[] = [];

    const getRowCenter = (row: string): number => {
      const seatArray = seatsByRow[row] || [];
      const gap = typeof (findCenterGapPosition) === 'function' ? (findCenterGapPosition as any)(row) : -1;
      if (gap !== -1) return gap;
      const nums = seatArray.filter((n: any) => n !== '' && typeof n === 'number');
      if (nums.length === 0) return 0;
      return (nums[0] + nums[nums.length - 1]) / 2;
    };

    for (const row of cls.rows) {
      const rowLayout = seatsByRow[row];
      if (!rowLayout) continue;

      const bookedNums = seats
        .filter(s => s.row === row && (s.status === 'BOOKED' || s.status === 'BMS_BOOKED'))
        .map(s => s.number);
      if (bookedNums.length === 0) continue;

      const availSeats = seats
        .filter(s => s.row === row && s.status === 'AVAILABLE')
        .sort((a, b) => a.number - b.number);
      if (availSeats.length < newCount) continue;

      const center = getRowCenter(row);

      for (let i = 0; i <= availSeats.length - newCount; i++) {
        const block = availSeats.slice(i, i + newCount);
        const contiguous = isStrictlyContiguous(row, block);
        if (!contiguous) continue;

        const leftNum = block[0].number - 1;
        const rightNum = block[block.length - 1].number + 1;
        const leftNeighborIdx = rowLayout.indexOf(leftNum as any);
        const rightNeighborIdx = rowLayout.indexOf(rightNum as any);

        const leftIsBooked = leftNeighborIdx !== -1 && bookedNums.includes(leftNum);
        const rightIsBooked = rightNeighborIdx !== -1 && bookedNums.includes(rightNum);

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
   * Strict contiguity check using row layout (no crossing aisles, indices must be adjacent)
   */
  const isStrictlyContiguous = useCallback((row: string, seatsList: any[]): boolean => {
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
  }, []);

  /**
   * Helper: get base row for the class (container base)
   */
  const getBaseRowForClass = useCallback((cls: any): string => {
    const label = (cls.label || '').toUpperCase();
    if (label.includes('CLASSIC')) return 'G';
    if (label.includes('FIRST')) return 'F';
    // default: last row in the class
    return cls.rows[cls.rows.length - 1];
  }, []);

  // NEW CARROT ALGORITHM FUNCTIONS
  /**
   * Start carrot at center of a row
   */
  const startCarrotAtCenter = useCallback((row: string, count: number): Seat[] | null => {
    const availableSeats = seats.filter(seat => seat.row === row && seat.status === 'AVAILABLE');
    return startCarrotAtCenterUtil(row, count, availableSeats);
  }, [seats]);

  /**
   * Find seats adjacent to booked seats, prefer center side
   */
  const findAdjacentToBooked = useCallback((cls: any, count: number): Seat[] | null => {
    // Sort rows by priority (A, B, C, D, E, F, G, H) - TOP ROWS FIRST, G and H have LOWEST priority
    const sortedRows = cls.rows.sort((a: string, b: string) => {
      const priorities = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 999, 'H': 999 };
      return (priorities[a as keyof typeof priorities] || 999) - (priorities[b as keyof typeof priorities] || 999);
    });
    
    console.log(`[SEAT] findAdjacentToBooked: Searching rows in priority order:`, sortedRows);
    
    for (const row of sortedRows) {
      const availableSeats = seats.filter(seat => seat.row === row && seat.status === 'AVAILABLE');
      const bookedSeats = seats.filter(seat => seat.row === row && (seat.status === 'BOOKED' || seat.status === 'BMS_BOOKED'));
      
      console.log(`[SEAT] Checking row ${row}: ${availableSeats.length} available, ${bookedSeats.length} booked`);
      
      if (bookedSeats.length > 0) {
        const adjacentSeats = findAdjacentToBookedUtil(row, count, availableSeats, bookedSeats);
        if (adjacentSeats) {
          console.log(`[SEAT] Found adjacent seats in row ${row}:`, adjacentSeats);
          return adjacentSeats;
        }
      }
    }
    
    console.log(`[SEAT] No adjacent seats found in any row`);
    return null;
  }, [seats]);

  /**
   * Find best block across rows with priority system - THE CORRECT ONE FOR 5-PHASE ALGORITHM
   */
  const findBestBlockAcrossRows = useCallback((cls: any, count: number, currentRow?: string, selectedSeats?: any[]): any => {
    console.log(`[SEAT] findBestBlockAcrossRows called: count=${count}, currentRow=${currentRow}`);
    
    // Sort rows by priority (A, B, C, D, E, F, G, H) - TOP ROWS FIRST, G and H have LOWEST priority
    const sortedRows = cls.rows.sort((a: string, b: string) => {
      const priorities = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 999, 'H': 999 };
      return (priorities[a as keyof typeof priorities] || 999) - (priorities[b as keyof typeof priorities] || 999);
    });
    
    console.log(`[SEAT] Searching rows in priority order:`, sortedRows);
    
    let bestBlock: any = null;
    let bestScore = -Infinity;
    
    for (const row of sortedRows) {
      const availableSeats = seats.filter(seat => seat.row === row && seat.status === 'AVAILABLE');
      console.log(`[SEAT] Row ${row}: ${availableSeats.length} available seats`);
      
      if (availableSeats.length >= count) {
        const centerBlock = startCarrotAtCenterUtil(row, count, availableSeats);
        if (centerBlock && centerBlock.length === count) {
          // Calculate score based on row priority and center alignment
          const rowPriority = sortedRows.indexOf(row);
          const score = 1000 - rowPriority; // Higher score for higher priority rows
          
          console.log(`[SEAT] Row ${row} block found with score ${score}`);
          
          if (score > bestScore) {
            bestScore = score;
            bestBlock = { row, seats: centerBlock };
          }
        }
      }
    }
    
    console.log(`[SEAT] Best block found:`, bestBlock ? `${bestBlock.row} with ${bestBlock.seats.length} seats` : 'none');
    return bestBlock;
  }, [seats]);

  /**
   * Grow carrot shape (horizontal first, then vertical)
   */
  const growCarrotShape = useCallback((currentCarrot: Seat[], newCount: number): Seat[] | null => {
    const row = currentCarrot[0].row;
    const availableSeats = seats.filter(seat => seat.row === row && seat.status === 'AVAILABLE');
    
    // Try horizontal growth first
    const horizontalGrowth = growCarrotHorizontallyUtil(currentCarrot, newCount, availableSeats);
    if (horizontalGrowth) return horizontalGrowth;
    
    // Try vertical growth
    const cls = { rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] }; // This should come from the class parameter
    const verticalGrowth = growCarrotVerticallyUtil(currentCarrot, newCount, availableSeats, cls);
    return verticalGrowth;
  }, [seats]);

  /**
   * Widen carrot horizontally (fill entire rows above base line)
   */
  const widenCarrotHorizontally = useCallback((cls: any, baseRow: string): Seat[] | null => {
    const availableSeats = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'AVAILABLE');
    return widenCarrotHorizontallyUtil(cls.rows, baseRow, availableSeats);
  }, [seats]);

  /**
   * Expand into penalty zone (fill entire class)
   */
  const expandIntoPenaltyZone = useCallback((cls: any, baseRow: string): Seat[] | null => {
    const availableSeats = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'AVAILABLE');
    return expandIntoPenaltyZoneUtil(cls.rows, baseRow, availableSeats);
  }, [seats]);

  /**
   * Find best carrot position using N+1 technique
   */
  const findBestCarrotPosition = useCallback((cls: any, count: number, selectedSeats: Seat[]): Seat[] | null => {
    const availableSeats = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'AVAILABLE');
    return findBestCarrotPositionUtil(cls, count, availableSeats, selectedSeats);
  }, [seats]);

  return {
    calculateCarrotContainerScore,
    findBestBlockTopDownStrict,
    getCenterFirstSeats,
    findContiguousBlock,
    growCarrotInRow,
    findBlockAdjacentToBooked,
    isStrictlyContiguous,
    getBaseRowForClass,
    // NEW CARROT FUNCTIONS
    startCarrotAtCenter,
    findAdjacentToBooked,
    growCarrotShape,
    widenCarrotHorizontally,
    expandIntoPenaltyZone,
    findBestCarrotPosition,
    findBestBlockAcrossRows,
    growToggle,
    setGrowToggle
  };
};