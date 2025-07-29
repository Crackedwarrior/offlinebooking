import React, { useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { toast } from '@/hooks/use-toast';

// Types for seat and ticket group
interface Seat {
  id: string;
  row: string;
  number: number;
  classLabel: string;
  price: number;
}

interface TicketGroup {
  classLabel: string;
  row: string;
  seats: number[];
  price: number;
  seatIds: string[];
}

interface TicketPrintProps {
  selectedSeats: Seat[];
  onDelete?: (seatIds: string[]) => void;
  onReset?: () => void;
  selectedDate: string;
  onBookingComplete?: () => void;
  onDecouple?: (seatIds: string[]) => void;
  decoupledSeatIds?: string[];
}

// Helper: group seats by class and row, considering decoupled seats
function groupSeats(seats: Seat[], decoupledSeatIds: string[] = []): TicketGroup[] {
  const groups: Record<string, TicketGroup> = {};
  
  seats.forEach(seat => {
    // If seat is decoupled, create individual group
    if (decoupledSeatIds.includes(seat.id)) {
      const individualKey = `individual_${seat.id}`;
      groups[individualKey] = {
        classLabel: seat.classLabel,
        row: seat.row,
        seats: [seat.number],
        price: seat.price,
        seatIds: [seat.id],
      };
    } else {
      // Group by class and row for non-decoupled seats
      const key = `${seat.classLabel}|${seat.row}`;
      if (!groups[key]) {
        groups[key] = {
          classLabel: seat.classLabel,
          row: seat.row,
          seats: [],
          price: 0,
          seatIds: [],
        };
      }
      groups[key].seats.push(seat.number);
      groups[key].price += seat.price;
      groups[key].seatIds.push(seat.id);
      // Sort seat numbers in each group
      groups[key].seats.sort((a, b) => a - b);
    }
  });
  
  return Object.values(groups);
}

// Helper: format seat numbers as range or comma-separated
function formatSeatNumbers(seats: number[]): string {
  if (seats.length === 1) return seats[0].toString();
  // Check if continuous
  let ranges: string[] = [];
  let start = seats[0], end = seats[0];
  for (let i = 1; i <= seats.length; i++) {
    if (seats[i] === end + 1) {
      end = seats[i];
    } else {
      if (start === end) ranges.push(`${start}`);
      else ranges.push(`${start} - ${end}`);
      start = seats[i];
      end = seats[i];
    }
  }
  return ranges.join(', ');
}

const classColorMap: Record<string, string> = {
  'BOX': 'bg-cyan-200',
  'STAR CLASS': 'bg-cyan-400',
  'CLASSIC': 'bg-yellow-200',
  'FIRST CLASS': 'bg-pink-300',
  'SECOND CLASS': 'bg-gray-300',
};

// Save booking to backend
async function saveBookingToBackend(bookingData: any) {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });
    if (!res.ok) throw new Error('Booking save failed');
    const saved = await res.json();
    console.log('✅ Booking saved:', saved);
  } catch (err) {
    console.error('❌ Error saving booking:', err);
  }
}

const TicketPrint: React.FC<TicketPrintProps> = ({ 
  selectedSeats, 
  onDelete, 
  onReset, 
  selectedDate, 
  onBookingComplete,
  onDecouple,
  decoupledSeatIds = []
}) => {
  const groups = groupSeats(selectedSeats, decoupledSeatIds);
  const total = groups.reduce((sum, g) => sum + g.price, 0);
  const totalTickets = selectedSeats.length;
  const [selectedGroupIdxs, setSelectedGroupIdxs] = useState<number[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const selectedShow = useBookingStore(state => state.selectedShow);
  const toggleSeatStatus = useBookingStore(state => state.toggleSeatStatus);

  const toggleGroupSelection = (idx: number) => {
    setSelectedGroupIdxs(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleDelete = () => {
    if (!onDelete) return;
    const seatIdsToDelete = selectedGroupIdxs.flatMap(idx => groups[idx].seatIds);
    onDelete(seatIdsToDelete);
    setSelectedGroupIdxs([]);
  };

  const handleDecouple = () => {
    if (!onDecouple) return;
    const seatIdsToDecouple = selectedGroupIdxs.flatMap(idx => groups[idx].seatIds);
    onDecouple(seatIdsToDecouple);
    setSelectedGroupIdxs([]);
  };

  const handleDoubleClickDecouple = (seatIds: string[]) => {
    if (!onDecouple) return;
    onDecouple(seatIds);
  };

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const handleConfirmPrint = async () => {
    setShowPrintModal(false);
    
    // Prepare tickets array for the backend
    const tickets = selectedSeats.map(seat => ({
      id: seat.id,
      classLabel: seat.classLabel,
      price: seat.price,
    }));
    
    // Calculate totals
    const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
    const totalTickets = selectedSeats.length;
    
    // Prepare booking data in the correct format
    const bookingData = {
      tickets: tickets,
      total: total,
      totalTickets: totalTickets,
      timestamp: new Date().toISOString(),
      show: selectedShow.toUpperCase(),
      screen: 'Screen 1',
      movie: 'KALANK',
      date: selectedDate,
      source: 'LOCAL'
    };
    
    console.log('Sending booking to backend:', bookingData);
    await saveBookingToBackend(bookingData);
    
    // Mark all selected seats as booked in the store
    selectedSeats.forEach(seat => toggleSeatStatus(seat.id, 'booked'));
    
    // Show success message
    toast({
      title: 'Tickets Printed Successfully!',
      description: `${selectedSeats.length} ticket(s) have been printed and saved.`,
      duration: 4000,
    });
    setSelectedGroupIdxs([]);
    
    // Notify parent to complete booking (with delay to avoid React warnings)
    setTimeout(() => {
      if (onBookingComplete) onBookingComplete();
    }, 100);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 w-80 relative flex flex-col" style={{height: '500px', marginTop: 0, background: 'linear-gradient(135deg, #f8fafc 0%, #fff 100%)'}}>
      
      <div className="font-semibold text-lg px-4 pt-2 pb-3 border-b border-gray-100 mb-3 flex items-center justify-between">
        <span>Tickets</span>
        <div className="flex items-center gap-2">
          {decoupledSeatIds.length > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
              {decoupledSeatIds.length} decoupled
            </span>
          )}
          {onReset && (
            <button
              className="text-red-500 hover:text-red-700 flex items-center justify-center ml-2"
              title="Reset all tickets"
              onClick={onReset}
              style={{ padding: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 7H3V3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 7a9 9 0 1 1 2.12 9.17" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Scrollable ticket list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 max-h-80 px-2">
        {groups.map((g, idx) => {
          const colorClass = classColorMap[g.classLabel] || 'bg-cyan-300';
          return (
            <div
              key={g.classLabel + g.row + g.seats.join(',')}
              className={`rounded-xl shadow-md px-5 py-3 mb-3 cursor-pointer relative transition border-2 flex flex-col justify-between ${colorClass} ${selectedGroupIdxs.includes(idx) ? 'border-blue-500 bg-blue-100' : 'border-transparent'} hover:shadow-lg ${decoupledSeatIds.some(id => g.seatIds.includes(id)) ? 'border-orange-400 bg-orange-50' : ''}`}
              onClick={() => toggleGroupSelection(idx)}
              onDoubleClick={() => handleDoubleClickDecouple(g.seatIds)}
              title="Double-click to decouple into individual tickets"
            >
              {/* Top row: label and checkbox */}
              <div className="flex items-center justify-between w-full">
                <div className="font-bold text-base leading-tight">
                  {g.classLabel} {g.row.replace(/^[^-]+-/, '')} {formatSeatNumbers(g.seats)}
                  {decoupledSeatIds.some(id => g.seatIds.includes(id)) && (
                    <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                      Individual
                    </span>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={selectedGroupIdxs.includes(idx)}
                  onChange={() => toggleGroupSelection(idx)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-blue-400 transition"
                  style={{ marginTop: 2 }}
                  onClick={e => e.stopPropagation()}
                />
              </div>
              
              {/* Bottom row: price and count */}
              <div className="flex items-end justify-between w-full mt-1">
                <div className="text-sm font-medium">Price: <span className="font-bold">₹{g.price}</span></div>
                <div className="text-xs font-semibold bg-white/70 rounded-full px-2 py-0.5 shadow-sm">{g.seats.length}</div>
              </div>
            </div>
          );
        })}
        {/* Add spacing below last ticket card */}
        <div className="mb-4"></div>
      </div>
      
      {/* Sticky action bar at bottom */}
      <div className="sticky bottom-0 left-0 bg-white/90 pt-3 pb-2 z-10 px-4 rounded-b-2xl">
        <hr className="my-3 border-gray-100" />
        <div className="flex justify-between items-center w-full mb-4">
          <span>
            <span className="font-semibold">Total:</span>
            <span className="text-xl font-bold ml-2">₹ {total}</span>
          </span>
          <span className="text-xs bg-gray-100 rounded-full px-3 py-1 font-semibold shadow-sm border border-gray-200">
            {totalTickets} ticket{totalTickets !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex justify-between items-center w-full mt-2 gap-2">
          <button 
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition" 
            onClick={handlePrint}
            disabled={totalTickets === 0}
          >
            Print Tickets
          </button>
          <button
            className="bg-red-50 text-red-700 hover:bg-red-100 font-semibold px-5 py-2 rounded-lg border border-red-200 disabled:opacity-50 transition"
            disabled={selectedGroupIdxs.length === 0}
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>
      
      {/* Print confirmation modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[350px] max-w-full">
            <div className="font-bold text-lg mb-2">Confirm Print</div>
            <div className="mb-4 max-h-60 overflow-y-auto">
              {groups.map((g, idx) => (
                <div key={g.classLabel + g.row + g.seats.join(',')} className="mb-2 p-2 rounded border bg-gray-50">
                  <div className="font-semibold">{g.classLabel} {g.row.replace(/^[^-]+-/, '')} {formatSeatNumbers(g.seats)}</div>
                  <div className="text-sm">Price: ₹{g.price} &nbsp; | &nbsp; Count: {g.seats.length}</div>
                </div>
              ))}
            </div>
            <div className="font-semibold mb-2">Total: ₹{total} ({totalTickets} ticket{totalTickets !== 1 ? 's' : ''})</div>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-semibold" onClick={() => setShowPrintModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={handleConfirmPrint}>Confirm Print</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hide the vertical scrollbar but keep scrolling */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        .scrollbar-thin {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
    </div>
  );
};

export default TicketPrint; 
 