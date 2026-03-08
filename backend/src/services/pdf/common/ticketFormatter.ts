/**
 * Common ticket formatting utilities
 * Extracted from kannadaPdfKitService.ts and pdfPrintService.ts
 */

import ticketIdService from '../../../ticketIdService';
import { getTheaterConfig } from '../../../config/theaterConfig';
import { calculateTax } from './layoutUtils';
import type { TicketData, FormattedTicket } from './types';

/**
 * Format time to 12-hour format (HH:MM AM/PM)
 * Ensures consistency across all systems
 */
export function formatTime(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Format date from YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDate(dateString: string): string {
  const dateParts = dateString.split('-');
  if (dateParts.length === 3) {
    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // DD/MM/YYYY
  }
  return dateString; // Fallback to original format
}

/**
 * Extract movie information from ticket data
 */
export function extractMovieInfo(ticketData: TicketData): string {
  let movieName = 'Movie';
  
  if (ticketData.movie) {
    movieName = ticketData.movie;
  } else if (ticketData.movieName) {
    movieName = ticketData.movieName;
  }
  
  // Add language to movie name if available
  if (ticketData.movieLanguage) {
    movieName = `${movieName} (${ticketData.movieLanguage})`;
  }
  
  return movieName;
}

/**
 * Translate English show label to Kannada
 */
export function translateShowToKannada(showLabel: string): string {
  const upperLabel = showLabel.toUpperCase();
  
  if (upperLabel.includes('MORNING')) {
    return 'ಮಾರ್ನಿಂಗ್ ಶೋ';
  } else if (upperLabel.includes('MATINEE') || upperLabel.includes('AFTERNOON')) {
    return 'ಮ್ಯಾಟಿನೀ ಶೋ';
  } else if (upperLabel.includes('EVENING')) {
    return 'ಈವ್ನಿಂಗ್ ಶೋ';
  } else if (upperLabel.includes('NIGHT')) {
    return 'ನೈಟ್ ಶೋ';
  } else {
    // If it's already in Kannada or unknown, use as is
    return upperLabel.includes('ಶೋ') ? showLabel : `${showLabel} ಶೋ`;
  }
}

/**
 * Determine show class from time (fallback method)
 */
export function getShowClassFromTime(showTime: string, isKannada: boolean = false): string {
  const m = showTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return isKannada ? 'UNKNOWN SHOW' : 'UNKNOWN SHOW';
  
  let hour = parseInt(m[1], 10);
  const period = m[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  if (isKannada) {
    if (hour < 12) return 'ಮಾರ್ನಿಂಗ್ ಶೋ';
    else if (hour < 17) return 'ಮ್ಯಾಟಿನೀ ಶೋ';
    else if (hour < 21) return 'ಈವ್ನಿಂಗ್ ಶೋ';
    else return 'ನೈಟ್ ಶೋ';
  } else {
    if (hour < 12) return 'MORNING SHOW';
    else if (hour < 17) return 'MATINEE SHOW';
    else if (hour < 21) return 'EVENING SHOW';
    else return 'NIGHT SHOW';
  }
}

/**
 * Extract show information from ticket data
 */
export function extractShowInfo(ticketData: TicketData, isKannada: boolean = false): { showClass: string; showTime: string } {
  let showTime = '02:45PM';
  let showClass = 'UNKNOWN SHOW';
  
  // Extract showTime first (if available)
  if (ticketData.showTime) {
    showTime = ticketData.showTime;
    console.log('[TIME] Using showTime from frontend:', showTime);
  }
  
  // Use show label from frontend FIRST
  if (ticketData.show) {
    if (isKannada) {
      showClass = translateShowToKannada(ticketData.show);
    } else {
      showClass = `${ticketData.show} SHOW`;
    }
    console.log('[PRINT] Using show from frontend:', ticketData.show, '->', showClass);
  } else if (showTime) {
    // Fallback to hardcoded time ranges ONLY if no show label provided
    showClass = getShowClassFromTime(showTime, isKannada);
    console.log('[TIME] Using hardcoded time range for showTime:', showTime, '->', showClass);
  }
  
  return { showClass, showTime };
}

/**
 * Extract seat information from ticket data
 */
export function extractSeatInfo(ticketData: TicketData): { seatClass: string; seatInfo: string } {
  let seatClass = 'UNKNOWN';
  let seatInfo = 'A 1';
  
  console.log('[PRINT] Seat data extraction:', {
    seatInfo: ticketData.seatInfo,
    seatClass: ticketData.seatClass,
    seatRange: ticketData.seatRange,
    classLabel: ticketData.classLabel,
    row: ticketData.row
  });
  
  // Prefer structured data (row + seatRange) to enforce range formatting
  if (ticketData.seatRange) {
    // Grouped ticket data
    seatClass = ticketData.classLabel || 'UNKNOWN';
    // Extract row letter from row information (e.g., "BOX-A" -> "A")
    let rowLetter = 'A';
    if (ticketData.row) {
      const rowParts = ticketData.row.split('-');
      rowLetter = rowParts[rowParts.length - 1] || 'A'; // Get the last part after dash
    }
    
    // Format seat info - seatRange is already formatted like "1, 2, 3"
    if (ticketData.seatCount && ticketData.seatCount > 1) {
      // For multiple seats, show the formatted range (English adds count in parentheses)
      seatInfo = `${rowLetter} ${ticketData.seatRange}`;
    } else {
      // For single seat, just show the seat number
      seatInfo = `${rowLetter} ${ticketData.seatRange}`;
    }
  } else if (ticketData.seatInfo) {
    // Direct seat info from Electron (fallback)
    console.log('[PRINT] Using direct seatInfo (fallback):', ticketData.seatInfo);
    seatInfo = ticketData.seatInfo;
    seatClass = ticketData.seatClass || 'UNKNOWN';
  } else if (ticketData.seatId) {
    // Individual ticket data
    const seatId = ticketData.seatId;
    const parts = seatId.split('-');
    seatInfo = `${parts[0] || 'A'} ${parts[1] || '1'}`;
    seatClass = ticketData.class || 'UNKNOWN';
  } else if (ticketData.seats && Array.isArray(ticketData.seats) && ticketData.seats.length > 0) {
    // Multiple seats
    const firstSeat = ticketData.seats[0];
    seatInfo = `${firstSeat.row || 'A'} ${firstSeat.number || '1'}`;
    seatClass = firstSeat.classLabel || 'UNKNOWN';
  } else if (ticketData.seat) {
    // Direct seat data
    seatInfo = ticketData.seat;
    seatClass = ticketData.class || 'UNKNOWN';
  }
  
  return { seatClass, seatInfo };
}

/**
 * Extract total amount from ticket data
 */
export function extractTotalAmount(ticketData: TicketData): number {
  if (ticketData.price) {
    return ticketData.price;
  } else if (ticketData.total) {
    return ticketData.total;
  } else if (ticketData.totalAmount) {
    return ticketData.totalAmount;
  } else if (ticketData.totalPrice) {
    return ticketData.totalPrice;
  }
  return 0;
}

/**
 * Format ticket data for printing
 * @param ticketData - Raw ticket data from frontend
 * @param isKannada - Whether to use Kannada translations
 * @param returnNumbersAsStrings - Whether to return tax values as strings (English) or numbers (Kannada)
 */
export function formatTicketData(
  ticketData: TicketData,
  isKannada: boolean = false,
  returnNumbersAsStrings: boolean = false
): FormattedTicket {
  console.log('[PRINT] Raw ticket data received:', JSON.stringify(ticketData, null, 2));
  
  // Extract basic information
  const movieName = extractMovieInfo(ticketData);
  const { showClass, showTime } = extractShowInfo(ticketData, isKannada);
  const date = ticketData.date ? formatDate(ticketData.date) : new Date().toLocaleDateString();
  const totalAmount = extractTotalAmount(ticketData);
  const { seatClass, seatInfo } = extractSeatInfo(ticketData);
  const currentTime = formatTime();
  
  // Calculate individual ticket price
  const individualTicketPrice = ticketData.individualAmount || (totalAmount / (ticketData.seatCount || 1));
  
  console.log('[PRICE] TICKET COST DEBUG:');
  console.log('[PRICE] Raw ticketData.individualAmount:', ticketData.individualAmount);
  console.log('[PRICE] Raw ticketData.totalAmount:', ticketData.totalAmount);
  console.log('[PRICE] Raw ticketData.totalPrice:', ticketData.totalPrice);
  console.log('[PRICE] Raw ticketData.seatCount:', ticketData.seatCount);
  console.log('[PRICE] Calculated totalAmount variable:', totalAmount);
  console.log('[PRICE] Calculated individualTicketPrice:', individualTicketPrice);
  console.log('[PRICE] Final value used for TICKET COST:', individualTicketPrice);
  
  // Calculate tax breakdown
  const mcAmount = ticketData.mc || parseFloat(getTheaterConfig().defaultTaxValues.mc);
  const taxBreakdown = calculateTax(individualTicketPrice, mcAmount);
  
  // Use frontend tax values if available, otherwise use calculated values
  let net: number | string = ticketData.net !== undefined ? ticketData.net : taxBreakdown.net;
  let cgst: number | string = ticketData.cgst !== undefined ? ticketData.cgst : taxBreakdown.cgst;
  let sgst: number | string = ticketData.sgst !== undefined ? ticketData.sgst : taxBreakdown.sgst;
  const mc: number | string = ticketData.mc !== undefined ? ticketData.mc : taxBreakdown.mc;
  
  // Convert to strings if needed (English service uses strings)
  if (returnNumbersAsStrings) {
    net = typeof net === 'number' ? net.toFixed(2) : net;
    cgst = typeof cgst === 'number' ? cgst.toFixed(2) : cgst;
    sgst = typeof sgst === 'number' ? sgst.toFixed(2) : sgst;
  }
  
  console.log('[PRICE] Tax calculation results:');
  console.log('[PRICE] individualTicketPrice:', individualTicketPrice);
  console.log('[PRICE] mcAmount:', mcAmount);
  console.log('[PRICE] net:', net);
  console.log('[PRICE] cgst:', cgst);
  console.log('[PRICE] sgst:', sgst);
  console.log('[PRICE] mc:', mc);
  
  // Generate ticket ID
  const ticketId = ticketIdService.getNextTicketId();
  
  // Format return values
  const formatted: FormattedTicket = {
    theaterName: getTheaterConfig().name,
    location: getTheaterConfig().location,
    gstin: getTheaterConfig().gstin,
    date,
    showTime,
    showClass,
    movieName,
    seatClass,
    seatInfo,
    totalAmount: returnNumbersAsStrings ? totalAmount.toString() : totalAmount,
    individualTicketPrice: returnNumbersAsStrings ? individualTicketPrice.toFixed(2) : individualTicketPrice,
    seatCount: ticketData.seatCount || 1,
    net,
    cgst,
    sgst,
    mc,
    ticketId,
    currentTime
  };
  
  return formatted;
}

