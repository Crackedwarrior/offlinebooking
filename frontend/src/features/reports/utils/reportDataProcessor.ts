/**
 * Data processing logic for Box vs Online Report
 * Extracted from BoxVsOnlineReport.tsx
 */

import { SalesData, ShowSummary, GrandTotal } from '@/types/report';
import { extractClassFromSeatId, getMovieNameForShow, getShowLabel, getPriceForClass } from './reportHelpers';

/**
 * Process bookings and BMS seats into sales data
 */
export const processBookingsWithBMSSeats = (
  bookings: any[],
  bmsSeats: any[],
  date: string
): SalesData[] => {
  console.log('[REPORT] Processing bookings:', bookings);
  console.log('[REPORT] Processing BMS seats:', bmsSeats);
  
  const salesDataMap = new Map<string, SalesData>();
  
  // Initialize all possible show-class combinations with zero values
  const allShows = ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'];
  // Use CLASSIC instead of CLASSIC BALCONY to match server.ts implementation
  const allClasses = ['BOX', 'STAR CLASS', 'CLASSIC', 'FIRST CLASS', 'SECOND CLASS'];
  
  allShows.forEach(show => {
    allClasses.forEach(classLabel => {
      const key = `${show}-${classLabel}`;
      const newEntry: SalesData = {
        movie_date: date,
        movie: getMovieNameForShow(show), // Pull from settings - that's where movies are assigned to shows
        show: show,
        show_label: getShowLabel(show),
        classLabel: classLabel,
        online_qty: 0,
        bms_pos_qty: 0,
        counter_qty: 0,
        total_qty: 0,
        online_amt: 0,
        bms_pos_amt: 0,
        counter_amt: 0,
        total_amt: 0
      };
      salesDataMap.set(key, newEntry);
    });
  });
  
  // Process regular bookings - derive class per seat to avoid misclassification
  bookings.forEach(booking => {
    console.log('[REPORT] Processing booking:', booking);
    const showKey = booking.show;
    const movieName = booking.movie || getMovieNameForShow(showKey);
    const seatIds: string[] = Array.isArray(booking.bookedSeats) ? booking.bookedSeats : [];
    const pricePerSeat = (booking.totalPrice || 0) / (seatIds.length || 1);

    seatIds.forEach(seatId => {
      const classLabel = extractClassFromSeatId(seatId);
      if (!classLabel) return;
      const key = `${showKey}-${classLabel}`;
      const existing = salesDataMap.get(key);
      if (existing) {
        existing.movie = movieName;
        existing.counter_qty += 1;
        existing.counter_amt += pricePerSeat;
        existing.total_qty = existing.online_qty + existing.bms_pos_qty + existing.counter_qty;
        existing.total_amt = existing.online_amt + existing.bms_pos_amt + existing.counter_amt;
      }
    });
  });
  
  // Process BMS seats - use actual BMS data with show information
  // Group BMS seats by class for debugging
  const bmsSeatsByClass: Record<string, Record<string, string[]>> = {};
  
  bmsSeats.forEach(bmsSeat => {
    console.log('[REPORT] Processing BMS seat:', bmsSeat);
    
    // Use the show information that was added during data fetching
    const show = bmsSeat.show;
    
    // Use the class from the BMS seat data if available, otherwise determine from seat ID
    const classLabel = bmsSeat.class || extractClassFromSeatId(bmsSeat.seatId);
    const key = `${show}-${classLabel}`;
    console.log('[REPORT] BMS seat key:', key, 'show:', show, 'class:', classLabel);
    
    // Track seats by class for debugging
    if (!bmsSeatsByClass[show]) {
      bmsSeatsByClass[show] = {};
    }
    if (!bmsSeatsByClass[show][classLabel]) {
      bmsSeatsByClass[show][classLabel] = [];
    }
    bmsSeatsByClass[show][classLabel].push(bmsSeat.seatId);
    
    if (key && classLabel) {
      const existing = salesDataMap.get(key);
      const price = getPriceForClass(classLabel);
      
      if (existing) {
        console.log('[REPORT] Updating existing entry for BMS:', key);
        existing.bms_pos_qty += 1;
        existing.bms_pos_amt += price;
        existing.total_qty = existing.online_qty + existing.bms_pos_qty + existing.counter_qty;
        existing.total_amt = existing.online_amt + existing.bms_pos_amt + existing.counter_amt;
        
        // If this is a BMS booking, set movie name if not already set
        if (!existing.movie || existing.movie === 'No Movie Assigned') {
          existing.movie = getMovieNameForShow(show);
        }
      }
    }
  });
  
  // Debug log BMS seats by class
  console.log('[PRICE] BMS seats by class for income calculation:', bmsSeatsByClass);
  
  // Calculate total BMS income for debugging
  const totalBmsIncome = bmsSeats.reduce((sum, bmsSeat) => {
    const classLabel = bmsSeat.class || extractClassFromSeatId(bmsSeat.seatId);
    return sum + (classLabel ? getPriceForClass(classLabel) : 0);
  }, 0);
  
  console.log('[PRICE] Total BMS income calculated:', totalBmsIncome);
  
  const result = Array.from(salesDataMap.values());
  console.log('[REPORT] Final processed data:', result);
  return result;
};

/**
 * Calculate show summaries from sales data
 */
export const calculateShowSummaries = (salesData: SalesData[]): ShowSummary[] => {
  // Initialize all possible shows with zero values
  const allShows = ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'];
  const summaryMap = new Map<string, ShowSummary>();
  
  // Initialize all shows first
  allShows.forEach(show => {
    summaryMap.set(show, {
      show: show,
      show_label: getShowLabel(show),
      online_qty: 0,
      bms_pos_qty: 0,
      counter_qty: 0,
      total_qty: 0,
      online_amt: 0,
      bms_pos_amt: 0,
      counter_amt: 0,
      total_amt: 0,
      classBreakdown: []
    });
  });
  
  // Populate with actual data
  salesData.forEach(item => {
    const existing = summaryMap.get(item.show);
    if (existing) {
      existing.online_qty += item.online_qty;
      existing.bms_pos_qty += item.bms_pos_qty;
      existing.counter_qty += item.counter_qty;
      existing.total_qty += item.total_qty;
      existing.online_amt += item.online_amt;
      existing.bms_pos_amt += item.bms_pos_amt;
      existing.counter_amt += item.counter_amt;
      existing.total_amt += item.total_amt;
      existing.classBreakdown.push(item);
    }
  });
  
  // Sort classBreakdown within each show by movie name, then by class order
  const classOrder = ['BOX', 'STAR CLASS', 'CLASSIC', 'FIRST CLASS', 'SECOND CLASS'];
  summaryMap.forEach(summary => {
    summary.classBreakdown.sort((a, b) => {
      // First sort by movie name
      const movieCompare = a.movie.localeCompare(b.movie);
      if (movieCompare !== 0) return movieCompare;
      // If same movie, sort by class order
      return classOrder.indexOf(a.classLabel) - classOrder.indexOf(b.classLabel);
    });
  });
  
  // Sort shows chronologically: MORNING, MATINEE, EVENING, NIGHT
  const showOrder = ['MORNING', 'MATINEE', 'EVENING', 'NIGHT'];
  const sortedSummaries = Array.from(summaryMap.values()).sort((a, b) => {
    return showOrder.indexOf(a.show) - showOrder.indexOf(b.show);
  });
  
  return sortedSummaries;
};

/**
 * Calculate grand total from show summaries
 */
export const calculateGrandTotal = (showSummaries: ShowSummary[]): GrandTotal => {
  return showSummaries.reduce((total, summary) => ({
    online_qty: total.online_qty + summary.online_qty,
    bms_pos_qty: total.bms_pos_qty + summary.bms_pos_qty,
    counter_qty: total.counter_qty + summary.counter_qty,
    total_qty: total.total_qty + summary.total_qty,
    online_amt: total.online_amt + summary.online_amt,
    bms_pos_amt: total.bms_pos_amt + summary.bms_pos_amt,
    counter_amt: total.counter_amt + summary.counter_amt,
    total_amt: total.total_amt + summary.total_amt,
  }), {
    online_qty: 0,
    bms_pos_qty: 0,
    counter_qty: 0,
    total_qty: 0,
    online_amt: 0,
    bms_pos_amt: 0,
    counter_amt: 0,
    total_amt: 0,
  });
};

