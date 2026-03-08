import { useMemo } from 'react';
import { Seat } from '@/store/bookingStore';

/**
 * Hook for creating a memoized seat map for quick seat lookups
 * Extracted from SeatGrid for reusability
 */
export const useSeatMap = (seats: Seat[]) => {
  const seatMap = useMemo(() => {
    const map = seats.reduce((acc, seat) => {
      acc[`${seat.row}${seat.number}`] = seat;
      return acc;
    }, {} as Record<string, Seat>);
    return map;
  }, [seats]);

  return { seatMap };
};

