import { useState, useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { getSeatStatus } from '@/services/api';

interface UseSeatStatusProps {
  selectedDate?: string;
  selectedShow?: string;
}

/**
 * Hook for fetching and syncing seat status from the API
 * Extracted from SeatGrid for reusability
 */
export const useSeatStatus = ({ selectedDate, selectedShow }: UseSeatStatusProps) => {
  const [loadingSeats, setLoadingSeats] = useState(false);
  const { seats, syncSeatStatus } = useBookingStore();

  // Fetch seat status from API
  // OPTIMIZED: Removed 'seats' from dependencies to prevent unnecessary re-creation
  // The seats check is only for logging warnings, not critical for the fetch operation
  const fetchSeatStatus = useCallback(async () => {
    if (!selectedDate || !selectedShow) return;
    
    setLoadingSeats(true);
    try {
      const response = await getSeatStatus({ date: selectedDate, show: selectedShow });
      
      if (response.success && response.data) {
        const data: any = response.data;
        const bookedSeats = data.bookedSeats || [];
        const bmsSeats = data.bmsSeats || [];
        const selectedSeats = (data.selectedSeats || []) as Array<{ seatId: string }>;
        const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
        const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
        const selectedSeatIds = selectedSeats.map((seat: any) => seat.seatId);
        syncSeatStatus(bookedSeatIds, bmsSeatIds, selectedSeatIds);
        
        // Check if any seat IDs weren't found (using current seats from store)
        // This is only for logging, so we get it fresh from the store
        const currentSeats = useBookingStore.getState().seats;
        if (currentSeats.length > 0) {
          const allSeatIds = currentSeats.map(s => s.id);
          const notFoundBookedSeats = bookedSeatIds.filter(id => !allSeatIds.includes(id as string));
          const notFoundBmsSeats = bmsSeatIds.filter(id => !allSeatIds.includes(id as string));
          
          if (notFoundBookedSeats.length > 0) {
            console.warn('[WARN] Some booked seat IDs from API not found in seat matrix:', notFoundBookedSeats);
          }
          if (notFoundBmsSeats.length > 0) {
            console.warn('[WARN] Some BMS seat IDs from API not found in seat matrix:', notFoundBmsSeats);
          }
        }
      }
    } catch (error) {
      console.error('[ERROR] Error fetching seat status:', error);
    } finally {
      setLoadingSeats(false);
    }
  }, [selectedDate, selectedShow, syncSeatStatus]);

  return {
    fetchSeatStatus,
    loadingSeats
  };
};

