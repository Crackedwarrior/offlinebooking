import { useMemo } from 'react';
import { Seat } from '@/store/bookingStore';
import { getSeatClassByRow } from '@/lib/config';

interface UseSeatStatisticsProps {
  seats: Seat[];
  getPriceForClass: (classLabel: string) => number;
}

/**
 * Hook for calculating seat statistics and selected seats information
 * Extracted from SeatGrid for reusability
 */
export const useSeatStatistics = ({ seats, getPriceForClass }: UseSeatStatisticsProps) => {
  // Get selected seats and calculate total amount - OPTIMIZED: Memoized to prevent recalculation on every render
  const selectedSeats = useMemo(() => 
    seats.filter(seat => seat.status === 'SELECTED'), 
    [seats]
  );
  
  const totalAmount = useMemo(() => 
    selectedSeats.reduce((total, seat) => {
      const seatClass = getSeatClassByRow(seat.row);
      const price = seatClass ? getPriceForClass(seatClass.label) : 0;
      return total + price;
    }, 0),
    [selectedSeats, getPriceForClass]
  );

  // Calculate seat statistics - make them reactive
  const availableCount = useMemo(() => seats.filter(seat => seat.status === 'AVAILABLE').length, [seats]);
  const bookedCount = useMemo(() => seats.filter(seat => seat.status === 'BOOKED').length, [seats]);
  const blockedCount = useMemo(() => seats.filter(seat => seat.status === 'BLOCKED').length, [seats]);
  const bmsBookedCount = useMemo(() => seats.filter(seat => seat.status === 'BMS_BOOKED').length, [seats]);

  return {
    selectedSeats,
    totalAmount,
    availableCount,
    bookedCount,
    blockedCount,
    bmsBookedCount
  };
};

