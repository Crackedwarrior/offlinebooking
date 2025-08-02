import { create } from 'zustand';
import { seatsByRow } from '@/lib/seatMatrix';

export type SeatStatus = 'available' | 'booked' | 'blocked' | 'bms-booked' | 'selected';
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
          status: 'available',
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
  
  toggleSeatStatus: (seatId, newStatus) => set((state) => ({
    seats: state.seats.map(seat =>
      seat.id === seatId ? { ...seat, status: newStatus } : seat
    )
  })),
  
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
    const state = get();
    const booking = state.bookingHistory.find(
      b => b.date === date && b.show === show
    );
    
    if (booking) {
      set({
        selectedDate: date,
        selectedShow: show,
        seats: [...booking.seats]
      });
    } else {
      set({
        selectedDate: date,
        selectedShow: show,
        seats: createInitialSeats()
      });
    }
  },
  
  initializeSeats: () => set({ seats: createInitialSeats() }),
  
  syncSeatStatus: (bookedSeatIds: string[], bmsSeatIds: string[]) => {
    const state = get();
    const currentlySelectedSeats = state.seats.filter(seat => seat.status === 'selected');
    
    console.log('🔄 syncSeatStatus called with:', {
      bookedSeatIds,
      bmsSeatIds,
      currentlySelectedSeats: currentlySelectedSeats.length
    });
    
    // Create new seats array with all seats reset to available
    const newSeats = createInitialSeats();
    
    // Mark booked seats as booked
    let bookedCount = 0;
    bookedSeatIds.forEach(seatId => {
      const seatIndex = newSeats.findIndex(s => s.id === seatId);
      if (seatIndex !== -1) {
        newSeats[seatIndex].status = 'booked';
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
        newSeats[seatIndex].status = 'bms-booked';
        bmsCount++;
      } else {
        console.warn('⚠️ BMS seat ID not found:', seatId);
      }
    });
    
    // Restore selected seats that are still available (not booked or BMS)
    currentlySelectedSeats.forEach(seat => {
      if (!bookedSeatIds.includes(seat.id) && !bmsSeatIds.includes(seat.id)) {
        const seatIndex = newSeats.findIndex(s => s.id === seat.id);
        if (seatIndex !== -1) {
          newSeats[seatIndex].status = 'selected';
        }
      }
    });
    
    console.log(`✅ syncSeatStatus completed: ${bookedCount} booked, ${bmsCount} BMS seats updated`);
    
    // Update the state with the new seats array
    set({ seats: newSeats });
  },
  
  getBookingStats: () => {
    const { seats } = get();
    return {
      total: seats.length,
      available: seats.filter(s => s.status === 'available').length,
      booked: seats.filter(s => s.status === 'booked').length,
      blocked: seats.filter(s => s.status === 'blocked').length,
      bmsBooked: seats.filter(s => s.status === 'bms-booked').length,
    };
  }
}));