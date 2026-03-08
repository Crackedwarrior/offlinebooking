/**
 * Custom hook for BookingHistory data fetching
 * Extracted from BookingHistory.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { getBookings, getSeatStatus } from '@/services/api';
import { SHOW_TIMES } from '@/lib/config';
import type { ShowTime } from '@/store/bookingStore';
import type { ShowInfo } from '@/types/bookingHistory';

const showOrder: ShowInfo[] = SHOW_TIMES.map(show => ({
  key: show.enumValue,
  label: show.label
}));

/**
 * Hook for fetching and managing BookingHistory data
 */
export const useBookingHistory = (selectedDate: string) => {
  const [databaseBookings, setDatabaseBookings] = useState<any[]>([]);
  const [seatStatusData, setSeatStatusData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  // Fetch bookings and seat status data
  const fetchBookings = useCallback(async (date: string) => {
    setLoading(true);
    try {
      // Fetch bookings
      const bookingsResponse = await getBookings({ date });
      if (bookingsResponse.success) {
        setDatabaseBookings(bookingsResponse.data || []);
      }

      // Fetch seat status for all shows
      const seatStatusPromises = showOrder.map(async (show) => {
        try {
          const response = await getSeatStatus({ date, show: show.key });
          return { show: show.key, data: response.success ? response.data : null };
        } catch (error) {
          return { show: show.key, data: null };
        }
      });

      const seatStatusResults = await Promise.all(seatStatusPromises);
      const seatStatusMap: Record<string, any> = {};
      seatStatusResults.forEach(({ show, data }) => {
        if (data) {
          seatStatusMap[show] = data;
        }
      });
      setSeatStatusData(seatStatusMap);

    } catch (error) {
      console.error('[ERROR] Error fetching data:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to connect to database.',
      //   variant: 'destructive',
      // });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch bookings when date changes
  useEffect(() => {
    fetchBookings(selectedDate);
  }, [selectedDate, fetchBookings]);

  return {
    databaseBookings,
    seatStatusData,
    loading,
    refetch: () => fetchBookings(selectedDate)
  };
};

