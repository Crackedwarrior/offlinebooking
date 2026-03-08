/**
 * Custom hook for Box vs Online Report data fetching
 * Extracted from BoxVsOnlineReport.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { getBookings, getSeatStatus } from '@/services/api';
import type { Show } from '@/types/api';
import { SalesData } from '@/types/report';
import { processBookingsWithBMSSeats } from '../utils/reportDataProcessor';
import { usePricing } from '@/hooks/use-pricing';

/**
 * Hook for fetching and managing Box vs Online Report data
 */
export const useBoxVsOnlineReport = (selectedDate: Date) => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(false);
  const { pricingVersion } = usePricing();
  
  const reportDate = selectedDate.toISOString().split('T')[0];

  // Fetch sales data
  const fetchSalesData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      // Fetch bookings for each show to get different movie names
      const shows: Show[] = ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'];
      console.log('[REPORT] Fetching bookings for shows:', shows);
      
      const bookingPromises = shows.map(show => 
        getBookings({ date, show }).catch(error => {
          console.warn(`[WARN] Failed to fetch bookings for ${show}:`, error);
          return { success: false, data: null };
        })
      );
      
      const bookingResponses = await Promise.all(bookingPromises);
      let allBookings: any[] = [];
      
      bookingResponses.forEach((response, index) => {
        console.log(`[REPORT] Bookings for ${shows[index]}:`, response);
        if (response.success && response.data) {
          console.log(`[REPORT] Found ${response.data.length} bookings for ${shows[index]}:`, response.data);
          allBookings = allBookings.concat(response.data);
        } else {
          console.log(`[REPORT] No bookings found for ${shows[index]}`);
        }
      });
      
      console.log('[REPORT] Total bookings found:', allBookings);
      
      // Fetch seat status for all shows to get BMS seats with show information
      const seatStatusPromises = shows.map(show => 
        getSeatStatus({ date, show }).catch(error => {
          console.warn(`[WARN] Failed to fetch seat status for ${show}:`, error);
          return { success: false, data: null };
        })
      );
      
      const seatStatusResponses = await Promise.all(seatStatusPromises);
      let allBmsSeats: any[] = [];
      
      seatStatusResponses.forEach((response, index) => {
        console.log(`[REPORT] Seat status for ${shows[index]}:`, response);
        if (response.success && response.data && response.data.bmsSeats) {
          // Add show information to each BMS seat
          const bmsSeatsWithShow = response.data.bmsSeats.map((bmsSeat: any) => ({
            ...bmsSeat,
            show: shows[index] // Associate the show with each BMS seat
          }));
          console.log(`[REPORT] Found ${bmsSeatsWithShow.length} BMS seats for ${shows[index]}:`, bmsSeatsWithShow);
          allBmsSeats = allBmsSeats.concat(bmsSeatsWithShow);
        } else {
          console.log(`[REPORT] No BMS seats found for ${shows[index]}`);
        }
      });
      
      console.log('[REPORT] Total BMS seats found:', allBmsSeats);
        
      // Process bookings and BMS seat data
      const processedData = processBookingsWithBMSSeats(allBookings, allBmsSeats, date);
      console.log('[REPORT] Processed data:', processedData);
      setSalesData(processedData);
    } catch (error) {
      console.error('[ERROR] Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch data when pricing changes
  useEffect(() => {
    if (pricingVersion > 0) {
      console.log('[PRICE] Pricing changed, refetching sales data...');
      fetchSalesData(reportDate);
    }
  }, [pricingVersion, reportDate, fetchSalesData]);

  // Load data on component mount and date change
  useEffect(() => {
    fetchSalesData(reportDate);
  }, [reportDate, fetchSalesData]);

  return {
    salesData,
    loading,
    fetchSalesData: () => fetchSalesData(reportDate),
  };
};

