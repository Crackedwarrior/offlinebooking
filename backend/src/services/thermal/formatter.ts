/**
 * Thermal Ticket Formatter Module
 * Handles ticket data formatting and content generation
 */

import { getTheaterConfig } from '../../config/theaterConfig';
import ticketIdService from '../../ticketIdService';
import { Logger } from '../../utils/logger';

const logger = Logger.withContext('services/thermal/formatter');

export interface TicketData {
  theaterName?: string;
  location?: string;
  gstin?: string;
  movieName?: string;
  date?: string;
  showTime?: string;
  screen?: string;
  seats?: any[];
  totalAmount?: number;
  row?: string;
  seatRange?: string;
  classLabel?: string;
  seatCount?: number;
  individualPrice?: number;
  net?: string;
  cgst?: string;
  sgst?: string;
  mc?: string;
}

/**
 * Helper function to calculate end time (3 hours after start time)
 */
export function getEndTime(startTime: string): string {
  const timeMap: { [key: string]: string } = {
    '02:45PM': '05:45PM',
    '06:00PM': '09:00PM', 
    '09:30PM': '12:30AM'
  };
  return timeMap[startTime] || '09:00PM';
}

/**
 * Helper function to get show class from time
 */
export function getShowClass(showTime: string): string {
  if (!showTime) {
    return 'UNKNOWN SHOW\nSHOWTIME : UNKNOWN';
  }
  
  // Extract time from showTime and format it
  const timeMatch = showTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (timeMatch) {
    const [, hour, minute, period] = timeMatch;
    return `SHOW\nSHOWTIME : ${hour}:${minute}${period.toUpperCase()}`;
  }
  
  return `SHOW\nSHOWTIME : ${showTime}`;
}

/**
 * Format ticket data for printing - Map frontend data to correct format
 */
export function formatTicket(ticketData: any): TicketData {
  logger.debug('Raw ticket data received', { ticketData });
  
  // Handle different data structures from frontend
  let movieName = 'Movie';
  let showTime = 'Show Time';
  let date = new Date().toLocaleDateString();
  let totalAmount = 0;
  let seats = [];
  
  // Extract data from frontend format
  if (ticketData.movie) {
    movieName = ticketData.movie;
  } else if (ticketData.movieName) {
    movieName = ticketData.movieName;
  }
  
  if (ticketData.showTime) {
    showTime = ticketData.showTime;
  } else if (ticketData.show) {
    showTime = ticketData.show;
  }
  
  if (ticketData.date) {
    date = ticketData.date;
  }
  
  if (ticketData.price) {
    totalAmount = ticketData.price;
  } else if (ticketData.total) {
    totalAmount = ticketData.total;
  } else if (ticketData.totalAmount) {
    totalAmount = ticketData.totalAmount;
  }
  
  // Handle seats data
  if (ticketData.seatRange) {
    seats = [{
      row: ticketData.row || 'A',
      number: ticketData.seatRange,
      classLabel: ticketData.classLabel
    }];
    
    if (ticketData.totalPrice) {
      totalAmount = ticketData.totalPrice;
    }
  } else if (ticketData.seatId) {
    const seatId = ticketData.seatId;
    const parts = seatId.split('-');
    seats = [{
      row: parts[0] || 'A',
      number: parts[1] || '1',
      classLabel: ticketData.class
    }];
  } else if (ticketData.tickets && Array.isArray(ticketData.tickets)) {
    seats = ticketData.tickets.map((ticket: any) => ({
      row: ticket.row || 'A',
      number: ticket.number || '1',
      classLabel: ticket.classLabel
    }));
  } else if (ticketData.seats && Array.isArray(ticketData.seats)) {
    seats = ticketData.seats;
  } else if (ticketData.seatIds && Array.isArray(ticketData.seatIds)) {
    seats = ticketData.seatIds.map((seatId: string) => {
      const parts = seatId.split('-');
      return {
        row: parts[0] || 'A',
        number: parts[1] || '1',
        classLabel: 'UNKNOWN'
      };
    });
  }
  
  const formattedData: TicketData = {
    theaterName: ticketData.theaterName || getTheaterConfig().name,
    location: ticketData.location || getTheaterConfig().location,
    gstin: ticketData.gstin || getTheaterConfig().gstin,
    movieName: movieName,
    date: date,
    showTime: showTime,
    screen: ticketData.screen || 'Screen 1',
    seats: seats,
    totalAmount: totalAmount,
    row: ticketData.row,
    seatRange: ticketData.seatRange,
    classLabel: ticketData.classLabel,
    seatCount: ticketData.seatCount,
    individualPrice: ticketData.individualPrice
  };
  
  logger.debug('Formatted ticket data', { formattedData });
  return formattedData;
}

/**
 * Create formatted ticket content - Exact format matching user specification
 */
export function createTicketContent(ticketData: TicketData): string {
  // Use tax values from frontend if available, otherwise use defaults
  const net = ticketData.net || getTheaterConfig().defaultTaxValues.net;
  const cgst = ticketData.cgst || getTheaterConfig().defaultTaxValues.cgst;
  const sgst = ticketData.sgst || getTheaterConfig().defaultTaxValues.sgst;
  const mc = ticketData.mc || getTheaterConfig().defaultTaxValues.mc;
  
  // Format date and time
  const ticketDate = ticketData.date || new Date().toLocaleDateString('en-GB');
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  
  // Generate ticket ID
  const ticketId = ticketIdService.getNextTicketId();
  
  // Get seat and class information
  const seatRow = ticketData.row || 'A';
  const seatNumber = ticketData.seatRange || '1';
  const seatClass = ticketData.classLabel;
  
  // Format movie name
  const movieName = ticketData.movieName || 'Movie';
  const formattedMovieName = movieName.length > 19 ? movieName.substring(0, 19) : movieName;
  
  // Check if this is a grouped ticket
  const seatCount = ticketData.seatCount || 1;
  const individualPrice = ticketData.individualPrice || (parseFloat(String(ticketData.totalAmount || '0')) || 0) / seatCount;
  
  // Format ticket cost
  const ticketCost = `₹${individualPrice.toFixed(2)}`;
  
  // Final format matching the exact user specification
  const lines = [
    '╔═════════════════════╗',
    `║  ${getTheaterConfig().name}  ║`,
    `║     ${getTheaterConfig().location}     ║`,
    `║GSTIN:${getTheaterConfig().gstin}║`,
    '╚═════════════════════╝',
    `DATE:${ticketDate}`,
    ...getShowClass(ticketData.showTime || '02:45PM').split('\n'),
    `FILM:${formattedMovieName}`,
    '┌─────────────────────┐',
    `│${`CLASS:${seatClass}`.padEnd(21)}│`,
    `│${`SEAT:${seatRow.replace('SC-', '').replace('CB-', '').replace('FC-', '').replace('BOX-', '')} ${seatNumber.replace(' - ', '-')} (${seatCount})`.padEnd(21)}│`,
    '└─────────────────────┘',
    ` [NET :${net}]`,
    ` [CGST:${cgst}]┌────────┐`,
    ` [SGST:${sgst}]│₹${individualPrice.toFixed(2).padEnd(7)}│`,
    ` [MC  :${mc}] └────────┘`,
    ` [TICKET COST: ${ticketCost}]`,
    '',
    ` ${ticketId}     ${currentTime.replace(' ', '')}`
  ];
  
  return lines.join('\n');
}

