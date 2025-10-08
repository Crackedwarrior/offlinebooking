/**
 * Custom hook for ticket operations extracted from Checkout.tsx
 * Industry standard: Custom hooks for complex stateful logic
 */

import { useState, useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getSeatClassByRow } from '@/lib/config';

export const useTicketOperations = () => {
  const { seats, selectedDate, selectedShow, toggleSeatStatus, syncSeatStatus } = useBookingStore();
  const { getPriceForClass, getMovieForShow } = useSettingsStore();
  
  // State for decoupled seat IDs
  const [decoupledSeatIds, setDecoupledSeatIds] = useState<string[]>([]);
  // State to track if booking was just completed
  const [bookingCompleted, setBookingCompleted] = useState(false);

  /**
   * Handle ticket deletion
   */
  const handleDeleteTickets = useCallback(async (seatIds: string[]) => {
    console.log('🔧 handleDeleteTickets called with seatIds:', seatIds);
    
    if (!seatIds || seatIds.length === 0) {
      console.warn('⚠️ No seat IDs provided for deletion');
      return;
    }
    
    try {
      // Prepare seat updates for backend
      const seatUpdates = seatIds.map(seatId => ({
        seatId,
        status: 'AVAILABLE'
      }));
      
      // Update backend first
      const { updateSeatStatus } = await import('@/services/api');
      await updateSeatStatus(seatUpdates, selectedDate, selectedShow);
      
      // Then update frontend state
      seatIds.forEach(id => {
        toggleSeatStatus(id, 'AVAILABLE');
      });
      
      // Remove from decoupled list if present
      setDecoupledSeatIds(prev => prev.filter(id => !seatIds.includes(id)));
      
      console.log('✅ Tickets deleted from database and frontend:', seatIds);
      
    } catch (error) {
      console.error('❌ Failed to delete tickets:', error);
      // Revert frontend changes if backend update failed
      seatIds.forEach(id => {
        toggleSeatStatus(id, 'SELECTED');
      });
    }
  }, [selectedDate, selectedShow, toggleSeatStatus]);

  /**
   * Handle ticket decoupling
   */
  const handleDecoupleTickets = useCallback((seatIds: string[]) => {
    // Add these seat IDs to the decoupled list
    setDecoupledSeatIds(prev => [...prev, ...seatIds]);
  }, []);

  /**
   * Handle booking completion
   */
  const handleBookingComplete = useCallback((onBookingComplete?: (bookingData: any) => void) => {
    const selectedSeats = seats.filter(seat => seat.status === 'SELECTED');
    
    // Mark selected seats as booked first
    selectedSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'BOOKED');
    });
    
    // Set booking completed state
    setBookingCompleted(true);
    
    // Prepare booking data for confirmation
    const movieMeta = getMovieForShow(selectedShow) || { name: 'KALANK', screen: 'Screen 1' } as any;
    const bookingData = {
      date: selectedDate,
      show: selectedShow,
      movie: movieMeta.name,
      screen: movieMeta.screen,
      seats: selectedSeats.map(seat => ({
        id: seat.id,
        classLabel: getSeatClassByRow(seat.row)?.label || 'UNKNOWN',
        price: getPriceForClass(getSeatClassByRow(seat.row)?.label || 'UNKNOWN')
      })),
      totalAmount: selectedSeats.reduce((sum, seat) => {
        const classLabel = getSeatClassByRow(seat.row)?.label || 'UNKNOWN';
        return sum + getPriceForClass(classLabel);
      }, 0),
      totalTickets: selectedSeats.length,
      timestamp: new Date().toISOString()
    };

    // Call the parent's onBookingComplete callback
    if (onBookingComplete) {
      onBookingComplete(bookingData);
    }
  }, [seats, selectedShow, selectedDate, toggleSeatStatus, getMovieForShow, getPriceForClass]);

  /**
   * Handle reset for new booking
   */
  const handleResetForNewBooking = useCallback(async (onClearCheckoutData?: () => void) => {
    const selectedSeats = seats.filter(seat => seat.status === 'SELECTED');
    
    try {
      // Prepare seat updates for backend
      const seatUpdates = selectedSeats.map(seat => ({
        seatId: seat.id,
        status: 'AVAILABLE'
      }));
      
      // Update backend first
      const { updateSeatStatus } = await import('@/services/api');
      await updateSeatStatus(seatUpdates, selectedDate, selectedShow);
      
      // Then update frontend state
      selectedSeats.forEach(seat => toggleSeatStatus(seat.id, 'AVAILABLE'));
      setDecoupledSeatIds([]);
      
      // Clear checkoutData to force re-evaluation of selectedSeats
      if (onClearCheckoutData) {
        onClearCheckoutData();
        console.log('🔄 checkoutData cleared');
      }
      
      console.log('✅ All tickets reset from database and frontend:', selectedSeats.length);
      
      // Force refresh the seat status to ensure sync
      setTimeout(async () => {
        try {
          const { getSeatStatus } = await import('@/services/api');
          const response = await getSeatStatus({ date: selectedDate, show: selectedShow });
          if (response.success && response.data) {
            const { bookedSeats, bmsSeats, selectedSeats: backendSelectedSeats } = response.data as any;
            const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
            const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
            const selectedSeatIds = backendSelectedSeats ? backendSelectedSeats.map((seat: any) => seat.seatId) : [];
            syncSeatStatus(bookedSeatIds, bmsSeatIds, selectedSeatIds);
            console.log('🔄 Seat status refreshed after reset');
          }
        } catch (error) {
          console.error('❌ Failed to refresh seat status after reset:', error);
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Failed to reset tickets:', error);
      // Don't revert frontend changes if backend update failed - let user try again
    }
  }, [seats, selectedDate, selectedShow, toggleSeatStatus, syncSeatStatus]);

  /**
   * Handle confirm booking (mark as booked)
   */
  const handleConfirmBooking = useCallback(() => {
    const selectedSeats = seats.filter(seat => seat.status === 'SELECTED');
    // Mark selected seats as booked
    selectedSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'BOOKED');
    });
  }, [seats, toggleSeatStatus]);

  return {
    decoupledSeatIds,
    setDecoupledSeatIds,
    bookingCompleted,
    setBookingCompleted,
    handleDeleteTickets,
    handleDecoupleTickets,
    handleBookingComplete,
    handleResetForNewBooking,
    handleConfirmBooking
  };
};
