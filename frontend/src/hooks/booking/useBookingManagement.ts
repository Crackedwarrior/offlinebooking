/**
 * useBookingManagement Hook
 * Handles booking management operations
 */

import { useState, useCallback, useEffect } from 'react';
import { getBookings, deleteBooking, getCurrentTicketId, resetTicketId } from '@/services/api';
import { useBookingStore } from '@/store/bookingStore';

export interface BookingData {
  id: string;
  date: string;
  show: string;
  screen: string;
  movie: string;
  movieLanguage: string;
  bookedSeats: string[];
  seatCount: number;
  classLabel: string;
  pricePerSeat: number;
  totalPrice: number;
  status: string;
  source: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  createdAt: string;
  updatedAt: string;
  bookedAt: string;
  printedAt?: string;
}

export const useBookingManagement = () => {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [localSelectedDate, setLocalSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [localSelectedShow, setLocalSelectedShow] = useState<string>('MORNING');
  const [currentTicketId, setCurrentTicketId] = useState<string>('');
  const [ticketIdLoading, setTicketIdLoading] = useState(false);
  const [resetTicketIdValue, setResetTicketIdValue] = useState<string>('');
  const [resettingTicketId, setResettingTicketId] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getBookings({ 
        date: localSelectedDate, 
        show: localSelectedShow 
      });
      
      if (response.success) {
        setBookings(response.data || []);
        setIsLoaded(true);
      } else {
        throw new Error('Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [localSelectedDate, localSelectedShow]);

  const handleDelete = useCallback(async (booking: BookingData) => {
    if (!window.confirm(`Are you sure you want to delete this booking? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await deleteBooking(booking.id);
      if (response.success) {
        setBookings(prev => prev.filter(b => b.id !== booking.id));
        
        // Force refresh the seat grid
        setTimeout(() => {
          useBookingStore.getState().setSelectedDate(localSelectedDate);
          useBookingStore.getState().setSelectedShow(localSelectedShow as any);
        }, 100);
      } else {
        throw new Error('Failed to delete booking');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  }, [localSelectedDate, localSelectedShow]);

  const loadCurrentTicketId = useCallback(async () => {
    setTicketIdLoading(true);
    try {
      const response = await getCurrentTicketId();
      if (response.success && response.data) {
        setCurrentTicketId(response.data.currentTicketId);
      }
    } catch (error) {
      console.error('Error loading current ticket ID:', error);
    } finally {
      setTicketIdLoading(false);
    }
  }, []);

  const handleResetTicketId = useCallback(async () => {
    const newId = parseInt(resetTicketIdValue);
    if (isNaN(newId) || newId < 0) {
      alert('Please enter a valid positive number');
      return;
    }

    if (!window.confirm(`Are you sure you want to reset the ticket ID to ${newId}? This action cannot be undone.`)) {
      return;
    }

    setResettingTicketId(true);
    try {
      const response = await resetTicketId(newId);
      if (response.success && response.data) {
        setCurrentTicketId(response.data.currentTicketId);
        setResetTicketIdValue('');
        alert(`Ticket ID successfully reset to ${response.data.currentTicketId}`);
      } else {
        throw new Error('Failed to reset ticket ID');
      }
    } catch (error) {
      console.error('Error resetting ticket ID:', error);
      alert('Failed to reset ticket ID. Please try again.');
    } finally {
      setResettingTicketId(false);
    }
  }, [resetTicketIdValue]);

  useEffect(() => {
    loadCurrentTicketId();
  }, [loadCurrentTicketId]);

  return {
    bookings,
    loading,
    isLoaded,
    localSelectedDate,
    localSelectedShow,
    currentTicketId,
    ticketIdLoading,
    resetTicketIdValue,
    resettingTicketId,
    setLocalSelectedDate,
    setLocalSelectedShow,
    setResetTicketIdValue,
    loadBookings,
    handleDelete,
    loadCurrentTicketId,
    handleResetTicketId
  };
};

