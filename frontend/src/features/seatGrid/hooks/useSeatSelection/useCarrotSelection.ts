/**
 * Carrot selection utilities for useSeatSelection
 * Extracted and optimized
 */

import { useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { getBaseRowForClass } from '../../utils/seatUtils';
import { 
  startCarrotAtCenter as startCarrotAtCenterUtil,
  findAdjacentToBooked as findAdjacentToBookedUtil,
  growCarrotIncrementally as growCarrotIncrementallyUtil,
  growCarrotHorizontally as growCarrotHorizontallyUtil,
  growCarrotVertically as growCarrotVerticallyUtil,
  widenCarrotHorizontally as widenCarrotHorizontallyUtil,
  expandIntoPenaltyZone as expandIntoPenaltyZoneUtil,
  findBestCarrotPosition as findBestCarrotPositionUtil,
  type Seat
} from '@/utils/carrotUtils';

/**
 * Carrot selection logic
 * Optimized: Memoized callbacks, reduced re-renders
 */
export const useCarrotSelection = () => {
  const { seats } = useBookingStore();

  /**
   * Incremental carrot growth (+1 seat per click) with outward expansion priority
   * Optimized: Removed console.logs, early exits
   */
  const growCarrotInRow = useCallback((row: string, selectedSeatsInRow: any[], newCount: number) => {
    try {
      if (!selectedSeatsInRow || selectedSeatsInRow.length === 0) return null;
      
      // Convert to Seat format for carrotUtils
      const currentCarrot: Seat[] = selectedSeatsInRow.map(seat => ({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        status: seat.status
      }));
      
      const availableSeats: Seat[] = seats
        .filter(s => s.row === row && s.status === 'AVAILABLE')
        .map(seat => ({
          id: seat.id,
          row: seat.row,
          number: seat.number,
          status: seat.status
        }));
      
      // Use the new incremental growth function
      const grownCarrot = growCarrotIncrementallyUtil(currentCarrot, availableSeats);
      
      if (grownCarrot && grownCarrot.length === newCount) {
        // Convert back to original format
        const result = grownCarrot.map(seat => 
          seats.find(s => s.id === seat.id)
        ).filter(Boolean);
        
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('[ERROR] growCarrotInRow error:', error);
      return null;
    }
  }, [seats]);

  /**
   * Start carrot at center of a row
   */
  const startCarrotAtCenter = useCallback((row: string, count: number): Seat[] | null => {
    const availableSeats = seats.filter(seat => seat.row === row && seat.status === 'AVAILABLE');
    return startCarrotAtCenterUtil(row, count, availableSeats);
  }, [seats]);

  /**
   * Find seats adjacent to booked seats, prefer center side
   * Optimized: Removed console.logs
   */
  const findAdjacentToBooked = useCallback((cls: any, count: number): Seat[] | null => {
    // Sort rows by priority (A, B, C, D, E, F, G, H) - TOP ROWS FIRST, G and H have LOWEST priority
    const sortedRows = [...cls.rows].sort((a: string, b: string) => {
      const priorities = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 999, 'H': 999 };
      return (priorities[a as keyof typeof priorities] || 999) - (priorities[b as keyof typeof priorities] || 999);
    });
    
    for (const row of sortedRows) {
      const availableSeats = seats.filter(seat => seat.row === row && seat.status === 'AVAILABLE');
      const bookedSeats = seats.filter(seat => seat.row === row && (seat.status === 'BOOKED' || seat.status === 'BMS_BOOKED'));
      
      if (bookedSeats.length > 0) {
        const adjacentSeats = findAdjacentToBookedUtil(row, count, availableSeats, bookedSeats);
        if (adjacentSeats) {
          return adjacentSeats;
        }
      }
    }
    
    return null;
  }, [seats]);

  /**
   * Grow carrot shape (horizontal first, then vertical)
   */
  const growCarrotShape = useCallback((currentCarrot: Seat[], newCount: number, cls?: any): Seat[] | null => {
    const row = currentCarrot[0].row;
    const availableSeats = seats.filter(seat => seat.row === row && seat.status === 'AVAILABLE');
    
    // Try horizontal growth first
    const horizontalGrowth = growCarrotHorizontallyUtil(currentCarrot, newCount, availableSeats);
    if (horizontalGrowth) return horizontalGrowth;
    
    // Try vertical growth if class provided
    if (cls) {
      const verticalGrowth = growCarrotVerticallyUtil(currentCarrot, newCount, availableSeats, cls);
      return verticalGrowth;
    }
    
    return null;
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
  const findBestCarrotPosition = useCallback((cls: any, count: number, selectedSeats: Seat[], currentRow?: string): Seat[] | null => {
    const availableSeats = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'AVAILABLE');
    return findBestCarrotPositionUtil(cls, count, availableSeats, selectedSeats, currentRow);
  }, [seats]);

  return {
    growCarrotInRow,
    startCarrotAtCenter,
    findAdjacentToBooked,
    growCarrotShape,
    widenCarrotHorizontally,
    expandIntoPenaltyZone,
    findBestCarrotPosition
  };
};

