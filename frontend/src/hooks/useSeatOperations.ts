/**
 * Hook for seat operations
 * Extracted from Index.tsx
 */

import { useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getSeatClassByRow } from '@/lib/config';

export const useSeatOperations = (
  selectedDate: string,
  selectedShow: string,
  checkoutData: any,
  setCheckoutData: (data: any) => void
) => {
  const { getPriceForClass } = useSettingsStore();

  /**
   * Refresh seat status from backend
   */
  const refreshSeatStatus = useCallback(async () => {
    try {
      const { getSeatStatus } = await import('@/services/api');
      const response = await getSeatStatus({ date: selectedDate, show: selectedShow });
      
      if (response.success && response.data) {
        const { bookedSeats, bmsSeats, selectedSeats } = response.data as any;
        const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
        const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
        const selectedSeatIds = selectedSeats ? selectedSeats.map((seat: any) => seat.seatId) : [];
        
        // Use the syncSeatStatus function from the store
        const { syncSeatStatus } = useBookingStore.getState();
        syncSeatStatus(bookedSeatIds, bmsSeatIds, selectedSeatIds);
        
        console.log('[SEAT] Seat status refreshed successfully');
      }
    } catch (error) {
      console.error('[ERROR] Failed to refresh seat status:', error);
    }
  }, [selectedDate, selectedShow]);

  /**
   * Deselect seats
   */
  const deselectSeats = useCallback((seatsToDeselect: any[]) => {
    const toggleSeatStatus = useBookingStore.getState().toggleSeatStatus;
    seatsToDeselect.forEach(seat => {
      toggleSeatStatus(seat.id, 'AVAILABLE');
    });
    
    // Update checkout data by removing the deselected seats
    if (checkoutData) {
      const updatedSelectedSeats = checkoutData.selectedSeats.filter(
        seat => !seatsToDeselect.some(deselected => deselected.id === seat.id)
      );
      
      // Recalculate total amount
      const totalAmount = updatedSelectedSeats.reduce((total, seat) => {
        const seatClass = getSeatClassByRow(seat.row);
        const price = seatClass ? getPriceForClass(seatClass.label) : 0;
        return total + price;
      }, 0);
      
      setCheckoutData({
        ...checkoutData,
        selectedSeats: updatedSelectedSeats,
        totalAmount
      });
    }
  }, [checkoutData, getPriceForClass, setCheckoutData]);

  /**
   * Decouple tickets (remove grouped and add back as individual)
   */
  const decoupleTickets = useCallback(async (seatsToDecouple: any[]) => {
    const toggleSeatStatus = useBookingStore.getState().toggleSeatStatus;
    // Set all to available
    seatsToDecouple.forEach(seat => {
      toggleSeatStatus(seat.id, 'AVAILABLE');
    });
    // Wait for state to update
    await new Promise(res => setTimeout(res, 50));
    // Set all to booked (individually)
    seatsToDecouple.forEach(seat => {
      toggleSeatStatus(seat.id, 'BOOKED');
    });
  }, []);

  /**
   * Reset all seats to available
   */
  const handleResetSeats = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all seats to available? This action cannot be undone.')) {
      const { initializeSeats } = useBookingStore.getState();
      initializeSeats();
    }
  }, []);

  return {
    refreshSeatStatus,
    deselectSeats,
    decoupleTickets,
    handleResetSeats
  };
};

