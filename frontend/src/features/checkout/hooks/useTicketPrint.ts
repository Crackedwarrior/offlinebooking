/**
 * useTicketPrint Hook
 * Handles ticket printing logic (web and Electron)
 */

import { useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import printerService, { TicketData } from '@/services/printerService';
import { ElectronPrinterService } from '@/services/electronPrinterService';
import { getTheaterConfig } from '@/config/theaterConfig';
import { getClassFromSeatId, formatSeatNumbers, type Seat, type TicketGroup } from '@/utils/ticketGrouping';

/**
 * Save booking to backend
 */
async function saveBookingToBackend(bookingData: any) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });
    return await response.json();
  } catch (error) {
    console.error('[ERROR] Error saving booking:', error);
    return null;
  }
}

export const useTicketPrint = (
  selectedSeats: Seat[],
  selectedDate: string,
  groups: TicketGroup[],
  decoupledSeatIds: string[]
) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasCompletedBooking, setHasCompletedBooking] = useState(false);
  
  const selectedShow = useBookingStore(state => state.selectedShow);
  const toggleSeatStatus = useBookingStore(state => state.toggleSeatStatus);
  const { getMovieForShow, getShowTimes, getPriceForClass } = useSettingsStore();

  const handlePrint = async (onBookingComplete?: () => void) => {
    // Prevent multiple concurrent print operations
    if (isPrinting) {
      console.log('[PRINT] Print operation already in progress, ignoring duplicate click');
      return;
    }
    
    setIsPrinting(true);
    
    try {
      console.log('[PRINT] Starting print process...');

      // Get movie for current show from settings
      const currentMovie = getMovieForShow(selectedShow);
      
      if (!currentMovie) {
        console.error('[ERROR] No movie found for show:', selectedShow);
        return;
      }

      // Get show time details
      const showTimes = getShowTimes();
      const currentShowTime = showTimes.find(show => show.key === selectedShow);
      
      if (!currentShowTime) {
        console.error('[ERROR] No show time found for:', selectedShow);
        return;
      }

      const showtime = currentShowTime.startTime;

      // Get printer configuration
      const printerInstance = printerService.getInstance();
      const printerConfig = printerInstance.getPrinterConfig();
      
      if (!printerConfig || !printerConfig.name) {
        console.error('[ERROR] No printer configured');
        return;
      }

      // Check if we're in web or Electron environment
      const isWebEnvironment = typeof window !== 'undefined' && !window.electronAPI;
      
      if (isWebEnvironment) {
        // Web environment - use PDF generation via backend
        const ticketData = selectedSeats.map(seat => {
          const theaterConfig = getTheaterConfig();
          const classLabel = getClassFromSeatId(seat.id);
          const price = getPriceForClass(classLabel);
          
          const gstRate = 0.18;
          const cgstRate = 0.09;
          const sgstRate = 0.09;
          const netAmount = price / (1 + gstRate);
          const cgst = netAmount * cgstRate;
          const sgst = netAmount * sgstRate;
          const mc = 0;
          const totalAmount = price;
          
          return {
            theaterName: printerConfig.theaterName || theaterConfig.name,
            location: printerConfig.location || theaterConfig.location,
            date: selectedDate,
            film: currentMovie.name,
            class: classLabel,
            row: seat.row,
            seatNumber: seat.number,
            showtime: showtime,
            show: selectedShow,
            movieLanguage: currentMovie.language,
            netAmount: netAmount,
            cgst: cgst,
            sgst: sgst,
            mc: mc,
            totalAmount: totalAmount,
            transactionId: 'TXN' + Date.now()
          };
        });
        
        const printSuccess = await printerInstance.printTickets(ticketData);
        
        if (!printSuccess) {
          console.error('[ERROR] Failed to generate PDF tickets');
          return;
        }
      } else {
        // Electron environment - use native printing
        const electronPrinterService = ElectronPrinterService.getInstance();
        
        const ticketGroups = groups.map(group => ({
          theaterName: printerConfig.theaterName || getTheaterConfig().name,
          location: printerConfig.location || getTheaterConfig().location,
          date: selectedDate,
          showTime: showtime,
          showKey: selectedShow,
          movieName: currentMovie.name,
          movieLanguage: currentMovie.language,
          classLabel: group.classLabel,
          row: group.row,
          seatRange: formatSeatNumbers(group.seats),
          seatCount: group.seats.length,
          individualPrice: group.price / group.seats.length,
          totalPrice: group.price,
          isDecoupled: group.seatIds.some(id => decoupledSeatIds.includes(id)),
          seatIds: group.seatIds,
          transactionId: 'TXN' + Date.now()
        }));

        let allPrinted = true;
        for (const ticketGroup of ticketGroups) {
          const formattedTicket = electronPrinterService.formatTicketForThermal(ticketGroup);
          const printSuccess = await electronPrinterService.printTicket(formattedTicket, printerConfig.name, currentMovie);
          
          if (!printSuccess) {
            console.error('[ERROR] Failed to print ticket group:', ticketGroup.seatRange);
            allPrinted = false;
            break;
          }
        }
        
        if (!allPrinted) {
          console.error('[ERROR] Failed to print all tickets');
          return;
        }
      }

      // Save booking to backend
      const tickets = selectedSeats.map(seat => ({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        classLabel: seat.classLabel,
        price: seat.price,
      }));
      
      const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
      const totalTickets = selectedSeats.length;

      const bookingData = {
        tickets: tickets,
        total: total,
        totalTickets: totalTickets,
        timestamp: new Date().toISOString(),
        show: selectedShow.toUpperCase(),
        screen: currentMovie.screen,
        movie: currentMovie.name,
        movieLanguage: currentMovie.language || 'HINDI',
        date: selectedDate,
        source: 'LOCAL'
      };
      
      const response = await saveBookingToBackend(bookingData);
      
      if (response && response.success) {
        selectedSeats.forEach(seat => toggleSeatStatus(seat.id, 'BOOKED'));
        setHasCompletedBooking(true);
        
        setTimeout(() => {
          if (onBookingComplete) onBookingComplete();
        }, 100);
      } else {
        console.error('[ERROR] Failed to save booking to backend');
      }
    } catch (error) {
      console.error('[ERROR] Error in handlePrint:', error);
      alert('Failed to generate PDF ticket. Please check the console for details.');
    } finally {
      setIsPrinting(false);
    }
  };

  return {
    isPrinting,
    hasCompletedBooking,
    setHasCompletedBooking,
    handlePrint
  };
};

