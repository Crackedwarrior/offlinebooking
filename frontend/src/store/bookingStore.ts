import { create } from 'zustand';
import { seatsByRow } from '@/lib/seatMatrix';

// Debug the import
console.log('[SEAT] seatsByRow imported:', Object.keys(seatsByRow).length, 'rows');

export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'BMS_BOOKED' | 'SELECTED';
export type ShowTime = 'MORNING' | 'MATINEE' | 'EVENING' | 'NIGHT';

export interface Seat {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
}

export interface BookingState {
  selectedDate: string;
  selectedShow: ShowTime;
  seats: Seat[];
  bookingHistory: Array<{
    date: string;
    show: ShowTime;
    seats: Seat[];
    timestamp: string;
  }>;
  
  // Actions
  setSelectedDate: (date: string) => void;
  setSelectedShow: (show: ShowTime) => void;
  toggleSeatStatus: (seatId: string, newStatus: SeatStatus) => void;
  // NEW PROFESSIONAL BATCH OPERATIONS
  selectMultipleSeats: (seatIds: string[]) => void;
  deselectMultipleSeats: (seatIds: string[]) => void;
  atomicSeatReplacement: (deselectIds: string[], selectIds: string[]) => void;
  saveBooking: () => void;
  loadBookingForDate: (date: string, show: ShowTime) => void;
  initializeSeats: () => void;
  syncSeatStatus: (bookedSeatIds: string[], bmsSeatIds: string[], selectedSeatIds?: string[]) => void;
  getBookingStats: () => {
    total: number;
    available: number;
    booked: number;
    blocked: number;
    bmsBooked: number;
  };
}

// Initialize seat layout from seatsByRow
const createInitialSeats = (): Seat[] => {
  console.log('[SEAT] createInitialSeats called');
  console.log('[SEAT] seatsByRow keys:', Object.keys(seatsByRow));
  const seats: Seat[] = [];
  Object.entries(seatsByRow).forEach(([row, numbers]) => {
    console.log(`[SEAT] Processing row ${row}:`, numbers);
    numbers.forEach((num, idx) => {
      if (typeof num === 'number') {
        seats.push({
          id: `${row}${num}`,
          row,
          number: num,
          status: 'AVAILABLE',
        });
      }
    });
  });
  console.log('[SEAT] createInitialSeats created', seats.length, 'seats');
  console.log('[SEAT] First few seats:', seats.slice(0, 5));
  return seats;
};

export const useBookingStore = create<BookingState>((set, get) => {
  // Helper to ensure seats are initialized (lazy initialization)
  // Optimized: Only update state if seats are actually empty to prevent unnecessary re-renders
  const ensureSeatsInitialized = (): void => {
    const state = get();
    if (state.seats.length === 0) {
      console.log('[SEAT] Lazy initializing seats...');
      const newSeats = createInitialSeats();
      // Only set if still empty (prevent race conditions)
      const currentState = get();
      if (currentState.seats.length === 0) {
        set({ seats: newSeats });
      }
    }
  };

  return {
  selectedDate: new Date().toISOString().split('T')[0],
  selectedShow: 'EVENING',
  seats: [], // Lazy initialization - seats will be created on first access
  bookingHistory: [],

  setSelectedDate: (date) => set({ selectedDate: date }),
  
  setSelectedShow: (show) => set({ selectedShow: show }),
  
  toggleSeatStatus: (seatId, newStatus) => {
    ensureSeatsInitialized();
    console.log('[SEAT] toggleSeatStatus called:', { seatId, newStatus });
    set((state) => {
      const updatedSeats = state.seats.map(seat =>
        seat.id === seatId ? { ...seat, status: newStatus } : seat
      );
      console.log('[SEAT] Updated seats:', updatedSeats.filter(s => s.id === seatId));
      console.log('[SEAT] Total selected seats after update:', updatedSeats.filter(s => s.status === 'SELECTED').length);
      return { seats: updatedSeats };
    });
  },

  // NEW PROFESSIONAL BATCH OPERATIONS - PREVENTS RACE CONDITIONS
  selectMultipleSeats: (seatIds: string[]) => {
    ensureSeatsInitialized();
    console.log('[SEAT] selectMultipleSeats called:', { seatIds });
    set((state) => {
      const updatedSeats = state.seats.map(seat => 
        seatIds.includes(seat.id) && seat.status === 'AVAILABLE'
          ? { ...seat, status: 'SELECTED' as SeatStatus }
          : seat
      );
      console.log('[SEAT] Total selected seats after batch select:', updatedSeats.filter(s => s.status === 'SELECTED').length);
      return { seats: updatedSeats };
    });
  },

  deselectMultipleSeats: (seatIds: string[]) => {
    ensureSeatsInitialized();
    set((state) => ({
      seats: state.seats.map(seat => 
        seatIds.includes(seat.id) && seat.status === 'SELECTED'
          ? { ...seat, status: 'AVAILABLE' as SeatStatus }
          : seat
      )
    }));
  },

  // ATOMIC SEAT REPLACEMENT - FOR AUTOMATIC SELECTION ALGORITHMS
  atomicSeatReplacement: (deselectIds: string[], selectIds: string[]) => {
    ensureSeatsInitialized();
    console.log('[SEAT] atomicSeatReplacement called:', { deselectIds, selectIds });
    set((state) => {
      let deselectedCount = 0;
      let selectedCount = 0;

      const updatedSeats = state.seats.map(seat => {
        // First priority: Select new seats (even if they were in deselectIds)
        if (selectIds.includes(seat.id) && seat.status === 'AVAILABLE') {
          selectedCount++;
          return { ...seat, status: 'SELECTED' as SeatStatus };
        }
        // Second priority: Deselect old seats (only if not in selectIds)
        if (deselectIds.includes(seat.id) && !selectIds.includes(seat.id) && seat.status === 'SELECTED') {
          deselectedCount++;
          return { ...seat, status: 'AVAILABLE' as SeatStatus };
        }
        return seat;
      });

      const totalSelected = updatedSeats.filter(s => s.status === 'SELECTED').length;
      console.log('[SEAT] atomicSeatReplacement result:', { deselected: deselectedCount, selected: selectedCount, totalSelected });
      
      return { seats: updatedSeats };
    });
  },

  saveBooking: () => {
    ensureSeatsInitialized();
    const state = get();
    const selectedSeats = state.seats.filter(seat => seat.status === 'SELECTED');
    
    if (selectedSeats.length > 0) {
      const booking = {
        date: state.selectedDate,
        show: state.selectedShow,
        seats: selectedSeats,
        timestamp: new Date().toISOString(),
      };
      
      set((state) => ({
        bookingHistory: [...state.bookingHistory, booking],
        seats: state.seats.map(seat => 
          seat.status === 'SELECTED' 
            ? { ...seat, status: 'BOOKED' as SeatStatus }
            : seat
        ),
      }));
    }
  },

  loadBookingForDate: (date, show) => {
    ensureSeatsInitialized();
    console.log('[DB] loadBookingForDate called:', { date, show });
    const state = get();
    const booking = state.bookingHistory.find(
      b => b.date === date && b.show === show
    );
    
    console.log('[DB] Found booking:', booking ? 'yes' : 'no');
    
    if (booking) {
      const bookedSeatIds = booking.seats.map(seat => seat.id);
      console.log('[DB] Loading existing booking with', bookedSeatIds.length, 'booked seats');
      set((state) => ({
        seats: state.seats.map(seat => 
          bookedSeatIds.includes(seat.id)
            ? { ...seat, status: 'BOOKED' as SeatStatus }
            : { ...seat, status: 'AVAILABLE' as SeatStatus }
        ),
      }));
    } else {
      // Reset all seats to available if no booking found
      console.log('[DB] No booking found, ensuring seats are available');
      set((state) => ({
        seats: state.seats.map(seat => ({ ...seat, status: 'AVAILABLE' as SeatStatus }))
      }));
    }
  },
  
  initializeSeats: () => set({ seats: createInitialSeats() }),
  
  syncSeatStatus: (bookedSeatIds: string[], bmsSeatIds: string[], selectedSeatIds?: string[]) => {
    ensureSeatsInitialized();
    // PREVENT RAPID SYNC CALLS - ADD DEBOUNCE
    const now = Date.now();
    const lastSyncKey = `${bookedSeatIds.length}-${bmsSeatIds.length}`;
    const state = get();
    
    // Skip if same data was synced within last 500ms (shorter debounce)
    if ((window as any).lastSyncTime && 
        (window as any).lastSyncKey === lastSyncKey && 
        now - (window as any).lastSyncTime < 500) {
      console.log('[SEAT] syncSeatStatus SKIPPED - duplicate call within 500ms');
      return;
    }
    
    (window as any).lastSyncTime = now;
    (window as any).lastSyncKey = lastSyncKey;

    console.log('[SEAT] syncSeatStatus called with:', {
      bookedSeatIds: bookedSeatIds.length,
      bmsSeatIds: bmsSeatIds.length,
      totalSeats: state.seats.length,
      currentShow: state.selectedShow,
      currentDate: state.selectedDate
    });

    let bookedCount = 0;
    let bmsCount = 0;
    let freedCount = 0;
    let selectedCount = 0;

    // SURGICAL UPDATES: Only change seats that NEED to change
    // OPTIMIZED: Only create new array if something actually changed to prevent unnecessary re-renders
    let hasChanges = false;
    const updatedSeats = state.seats.map(seat => {
      // Mark seats as BOOKED if they're in bookedSeatIds
      if (bookedSeatIds.includes(seat.id) && seat.status !== 'BOOKED') {
        bookedCount++;
        hasChanges = true;
        return { ...seat, status: 'BOOKED' as SeatStatus };
      }
      // Mark seats as BMS_BOOKED if they're in bmsSeatIds
      if (bmsSeatIds.includes(seat.id) && seat.status !== 'BMS_BOOKED') {
        bmsCount++;
        hasChanges = true;
        return { ...seat, status: 'BMS_BOOKED' as SeatStatus };
      }
      // Free seats that are no longer booked
      if (seat.status === 'BOOKED' && !bookedSeatIds.includes(seat.id)) {
        freedCount++;
        hasChanges = true;
        return { ...seat, status: 'AVAILABLE' as SeatStatus };
      }
      // Free seats that are no longer BMS booked
      if (seat.status === 'BMS_BOOKED' && !bmsSeatIds.includes(seat.id)) {
        freedCount++;
        hasChanges = true;
        return { ...seat, status: 'AVAILABLE' as SeatStatus };
      }
      // Restore selected seats from backend (if any)
      if (selectedSeatIds && selectedSeatIds.includes(seat.id) && seat.status === 'AVAILABLE') {
        selectedCount++;
        hasChanges = true;
        return { ...seat, status: 'SELECTED' as SeatStatus };
      }
      // CRITICAL: Keep manually selected seats unchanged!
      return seat;
    });

    console.log(`[SEAT] syncSeatStatus completed: ${bookedCount} booked, ${bmsCount} BMS, ${freedCount} freed, ${selectedCount} selected from backend`);
    
    // Only update state if something actually changed
    // FIXED: Don't call set() at all if no changes, rather than returning undefined
    if (hasChanges) {
      set({ seats: updatedSeats });
    } else {
      console.log('[SEAT] syncSeatStatus SKIPPED - no changes detected');
    }
  },

  getBookingStats: () => {
    ensureSeatsInitialized();
    const state = get();
    const stats = {
      total: state.seats.length,
      available: 0,
      booked: 0,
      blocked: 0,
      bmsBooked: 0,
    };

    state.seats.forEach(seat => {
      switch (seat.status) {
        case 'AVAILABLE':
        case 'SELECTED':
          stats.available++;
          break;
        case 'BOOKED':
          stats.booked++;
          break;
        case 'BLOCKED':
          stats.blocked++;
          break;
        case 'BMS_BOOKED':
          stats.bmsBooked++;
          break;
      }
    });

    return stats;
  },
  };
});