/**
 * Main useSeatSelection hook
 * Orchestrates extracted selection modules
 * Optimized: Reduced re-renders, memoized callbacks
 */

import { useState, useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { isStrictlyContiguous } from '../../utils/seatUtils';
import { getBaseRowForClass } from '../../utils/seatUtils';
import { seatsByRow } from '@/lib/seatMatrix';
import { useSeatScoring } from './useSeatScoring';
import { useBlockSelection } from './useBlockSelection';
import { useCarrotSelection } from './useCarrotSelection';

export const useSeatSelection = () => {
  const { seats } = useBookingStore();
  const [growToggle, setGrowToggle] = useState(true); // alternate L/R when perfectly symmetric

  // Extract scoring logic
  const { calculateCarrotContainerScore } = useSeatScoring();

  // Extract block selection logic
  const {
    findBestBlockTopDownStrict,
    getCenterFirstSeats,
    findContiguousBlock,
    findBlockAdjacentToBooked,
    findBestBlockAcrossRows
  } = useBlockSelection(growToggle, setGrowToggle);

  // Extract carrot selection logic
  const {
    growCarrotInRow,
    startCarrotAtCenter,
    findAdjacentToBooked,
    growCarrotShape,
    widenCarrotHorizontally,
    expandIntoPenaltyZone,
    findBestCarrotPosition
  } = useCarrotSelection();

  /**
   * Strict contiguity check using row layout (no crossing aisles, indices must be adjacent)
   * Memoized to prevent recreation
   */
  const isStrictlyContiguousCheck = useCallback((row: string, seatsList: any[]): boolean => {
    return isStrictlyContiguous(row, seatsList);
  }, []);

  /**
   * Helper: get base row for the class (container base)
   * Memoized to prevent recreation
   */
  const getBaseRowForClassHelper = useCallback((cls: any): string => {
    return getBaseRowForClass(cls);
  }, []);

  return {
    calculateCarrotContainerScore,
    findBestBlockTopDownStrict,
    getCenterFirstSeats,
    findContiguousBlock,
    growCarrotInRow,
    findBlockAdjacentToBooked,
    isStrictlyContiguous: isStrictlyContiguousCheck,
    getBaseRowForClass: getBaseRowForClassHelper,
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

