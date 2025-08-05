import { create } from 'zustand';
import { seatsByRow } from '@/lib/seatMatrix';

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
  saveBooking: () => void;
  loadBookingForDate: (date: string, show: ShowTime) => void;
  initializeSeats: () => void;
  syncSeatStatus: (bookedSeatIds: string[], bmsSeatIds: string[]) => void;
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
  const seats: Seat[] = [];
  Object.entries(seatsByRow).forEach(([row, numbers]) => {
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
  return seats;
};

export const useBookingStore = create<BookingState>((set, get) => ({
  selectedDate: new Date().toISOString().split('T')[0],
  selectedShow: 'EVENING',
  seats: createInitialSeats(),
  bookingHistory: [],

  setSelectedDate: (date) => set({ selectedDate: date }),
  
  setSelectedShow: (show) => set({ selectedShow: show }),
  
  toggleSeatStatus: (seatId, newStatus) => {
    // console.log('🔄 toggleSeatStatus called:', { seatId, newStatus });
    set((state) => {
      const updatedSeats = state.seats.map(seat =>
        seat.id === seatId ? { ...seat, status: newStatus } : seat
      );
      // console.log('🔄 Updated seats:', updatedSeats.filter(s => s.id === seatId));
      return { seats: updatedSeats };
    });
  },
  
  saveBooking: () => set((state) => ({
    bookingHistory: [
      ...state.bookingHistory,
      {
        date: state.selectedDate,
        show: state.selectedShow,
        seats: [...state.seats],
        timestamp: new Date().toISOString()
      }
    ]
  })),
  
  loadBookingForDate: (date, show) => {
    // console.log(`🔄 loadBookingForDate called: ${date}, ${show}`);
    const state = get();
    const booking = state.bookingHistory.find(
      b => b.date === date && b.show === show
    );
    
    if (booking) {
      // console.log(`✅ Found existing booking for ${date} ${show}, loading ${booking.seats.length} seats`);
      set({
        selectedDate: date,
        selectedShow: show,
        seats: [...booking.seats]
      });
    } else {
      // console.log(`🆕 No existing booking for ${date} ${show}, initializing fresh seats`);
      set({
        selectedDate: date,
        selectedShow: show,
        seats: createInitialSeats()
      });
    }
  },
  
  initializeSeats: () => set({ seats: createInitialSeats() }),
  
  syncSeatStatus: (bookedSeatIds: string[], bmsSeatIds: string[], selectedSeatIds: string[] = []) => {
    const state = get();
    const currentlySelectedSeats = state.seats.filter(seat => seat.status === 'SELECTED');
    
    // console.log('🔄 syncSeatStatus called with:', {
    //   bookedSeatIds: bookedSeatIds.length,
    //   bmsSeatIds: bmsSeatIds.length,
    //   currentlySelectedSeats: currentlySelectedSeats.length,
    //   totalSeats: state.seats.length,
    //   currentShow: state.selectedShow,
    //   currentDate: state.selectedDate
    // });
    
    // Create new seats array with all seats reset to available
    const newSeats = createInitialSeats();
    
    // Mark booked seats as booked
    let bookedCount = 0;
    bookedSeatIds.forEach(seatId => {
      const seatIndex = newSeats.findIndex(s => s.id === seatId);
      if (seatIndex !== -1) {
        newSeats[seatIndex].status = 'BOOKED';
        bookedCount++;
      } else {
        console.warn('⚠️ Booked seat ID not found:', seatId);
      }
    });
    
    // Mark BMS seats as bms-booked
    let bmsCount = 0;
    bmsSeatIds.forEach(seatId => {
      const seatIndex = newSeats.findIndex(s => s.id === seatId);
      if (seatIndex !== -1) {
        newSeats[seatIndex].status = 'BMS_BOOKED';
        bmsCount++;
      } else {
        console.warn('⚠️ BMS seat ID not found:', seatId);
      }
    });
    
    // Mark selected seats from backend
    let selectedCount = 0;
    selectedSeatIds.forEach(seatId => {
      const seatIndex = newSeats.findIndex(s => s.id === seatId);
      if (seatIndex !== -1) {
        newSeats[seatIndex].status = 'SELECTED';
        selectedCount++;
      } else {
        console.warn('⚠️ Selected seat ID not found:', seatId);
      }
    });
    
    // Restore currently selected seats that are still available and not already marked as selected
    let restoredCount = 0;
    currentlySelectedSeats.forEach(seat => {
      if (!bookedSeatIds.includes(seat.id) && !bmsSeatIds.includes(seat.id) && !selectedSeatIds.includes(seat.id)) {
        const seatIndex = newSeats.findIndex(s => s.id === seat.id);
        if (seatIndex !== -1) {
          newSeats[seatIndex].status = 'SELECTED';
          restoredCount++;
        }
      }
    });
    
    // console.log(`✅ syncSeatStatus completed: ${bookedCount} booked, ${bmsCount} BMS seats, ${selectedCount} selected from backend, ${restoredCount} selected seats restored`);
    
    // Update the state with the new seats array
    set({ seats: newSeats });
  },
  
  getBookingStats: () => {
    const { seats } = get();
    return {
      total: seats.length,
      available: seats.filter(s => s.status === 'AVAILABLE').length,
      booked: seats.filter(s => s.status === 'BOOKED').length,
      blocked: seats.filter(s => s.status === 'BLOCKED').length,
      bmsBooked: seats.filter(s => s.status === 'BMS_BOOKED').length,
    };
  }
}));