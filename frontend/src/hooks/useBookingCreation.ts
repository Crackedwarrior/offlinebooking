/**
 * Hook for booking creation logic
 * Extracted from Index.tsx
 */

import { useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { createBooking } from '@/services/api';
import { getSeatClassByRow } from '@/lib/config';

export const useBookingCreation = (setCheckoutData: (data: any) => void) => {
  const handleBookingComplete = useCallback(async (bookingData: any) => {
    try {
      const { getPriceForClass, getMovieForShow } = useSettingsStore.getState();
      
      // Enhance seats with class and price information
      const enhancedSeats = bookingData.seats.map((seat: any) => {
        const seatClass = getSeatClassByRow(seat.row);
        const classLabel = seatClass?.label || 'UNKNOWN';
        const price = getPriceForClass(classLabel);
        
        return {
          id: seat.id,
          row: seat.row,
          number: seat.number,
          classLabel,
          price,
        };
      });
      
      // Get movie language from settings store
      const currentMovie = getMovieForShow(bookingData.show);
      const movieLanguage = currentMovie?.language || 'HINDI';
      
      const response = await createBooking({
        tickets: enhancedSeats,
        total: bookingData.totalAmount,
        totalTickets: bookingData.totalTickets,
        timestamp: bookingData.timestamp,
        show: bookingData.show,
        screen: bookingData.screen,
        movie: bookingData.movie,
        movieLanguage: movieLanguage,
        date: bookingData.date,
        source: 'LOCAL'
      });

      if (response.success) {
        // Mark the booked seats as booked in the store (don't reset all seats)
        const toggleSeatStatus = useBookingStore.getState().toggleSeatStatus;
        bookingData.seats.forEach((seat: any) => {
          toggleSeatStatus(seat.id, 'BOOKED');
        });
        
        // Clear checkout data completely after booking to avoid infinite loops
        setCheckoutData(null);
      } else {
        throw new Error(response.error?.message || 'Failed to save booking');
      }
    } catch (error) {
      console.error('Error saving booking:', error);
    }
  }, [setCheckoutData]);

  return {
    handleBookingComplete
  };
};

