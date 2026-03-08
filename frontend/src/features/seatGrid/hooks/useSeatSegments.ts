import { useMemo } from 'react';
import { SEAT_CLASSES } from '@/lib/config';

/**
 * Hook for creating memoized seat segments
 * Extracted from SeatGrid for reusability
 */
export const useSeatSegments = () => {
  const seatSegments = useMemo(() => {
    return SEAT_CLASSES.map(cls => ({
      label: cls.label,
      rows: cls.rows
    }));
  }, []);

  return { seatSegments };
};

