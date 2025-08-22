import React, { useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import printerService, { TicketData } from '@/services/printerService';
import { TauriPrinterService } from '@/services/tauriPrinterService';
// import { toast } from '@/hooks/use-toast';

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
    const response = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });
    return await response.json();
  } catch (error) {
    console.error('❌ Error saving booking:', error);
    return null;
  }
}

// Temporary workaround function for formatting ticket data
function formatTicketDataWorkaround(
  seatId: string,
  row: string,
  seatNumber: string,
  classLabel: string,
  price: number,
  date: string,
  showtime: string,
  movieName: string
): TicketData {
  const theaterName = 'SREELEKHA THEATER';
  const location = 'Chickmagalur';
  
  // Calculate GST components (assuming 18% total GST: 9% CGST + 9% SGST)
  const gstRate = 0.18;
  const cgstRate = 0.09;
  const sgstRate = 0.09;
  
  // Calculate net amount (price before GST)
  const netAmount = price / (1 + gstRate);
  const cgst = netAmount * cgstRate;
  const sgst = netAmount * sgstRate;
  const mc = 0; // Municipal Corporation tax (if any)
  const totalAmount = price;
  
  // Generate transaction ID
  const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  
  return {
    theaterName,
    location,
    date,
    film: movieName,
    class: classLabel,
    row,
    seatNumber,
    showtime,
    netAmount,
    cgst,
    sgst,
    mc,
    totalAmount,
    transactionId
  };
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

  const selectedShow = useBookingStore(state => state.selectedShow);
  const toggleSeatStatus = useBookingStore(state => state.toggleSeatStatus);
  const { getMovieForShow } = useSettingsStore();

    const toggleGroupSelection = (idx: number) => {
    console.log('🎯 Toggling group selection:', idx);
    setSelectedGroupIdxs(prev => {
      const newSelection = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
      console.log('🎯 New selection:', newSelection);
      return newSelection;
    });
  };

  const handleDelete = () => {
    console.log('🗑️ handleDelete called');
    console.log('🗑️ selectedGroupIdxs:', selectedGroupIdxs);
    console.log('🗑️ groups:', groups);
    
    if (!onDelete) {
      console.error('❌ onDelete function not provided');
      return;
    }
    
    const seatIdsToDelete = selectedGroupIdxs.flatMap(idx => groups[idx].seatIds);
    console.log('🗑️ seatIdsToDelete:', seatIdsToDelete);
    
    if (seatIdsToDelete.length === 0) {
      console.warn('⚠️ No seats selected for deletion');
      return;
    }
    
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
    // Directly call handleConfirmPrint without showing modal
    handleConfirmPrint();
  };

  const handleConfirmPrint = async () => {
    
    try {
      console.log('🖨️ Starting print process...');
      console.log('📊 Selected seats:', selectedSeats);
      console.log('📅 Selected date:', selectedDate);
      console.log('🎬 Selected show:', selectedShow);

      // Get movie for current show from settings
      const currentMovie = getMovieForShow(selectedShow);
      console.log('🎭 Current movie:', currentMovie);
      
      if (!currentMovie) {
        console.error('❌ No movie found for show:', selectedShow);
        return;
      }

      // Get show time details from settings store
      const { getShowTimes } = useSettingsStore.getState();
      const showTimes = getShowTimes();
      const currentShowTime = showTimes.find(show => show.key === selectedShow);
      
      console.log('⏰ Show times from settings:', showTimes);
      console.log('🎯 Current show time:', currentShowTime);
      
      if (!currentShowTime) {
        console.error('❌ No show time found for:', selectedShow);
        return;
      }

      // Convert 24-hour time to 12-hour format for display
      const convertTo12Hour = (time24h: string): string => {
        const [hours, minutes] = time24h.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      };

      const showtime = convertTo12Hour(currentShowTime.startTime);
      console.log('🕐 Formatted showtime:', showtime);

      // Get printer configuration
      const printerInstance = printerService.getInstance();
      const printerConfig = printerInstance.getPrinterConfig();
      
      if (!printerConfig || !printerConfig.name) {
        console.error('❌ No printer configured');
        return;
      }

      // Use Tauri printer service for native printing
      const tauriPrinterService = TauriPrinterService.getInstance();
      
      // Prepare grouped ticket data
      const ticketGroups = groups.map(group => ({
        theaterName: printerConfig.theaterName || 'SREELEKHA THEATER',
        location: printerConfig.location || 'Chickmagalur',
        date: selectedDate,
        showTime: showtime,
        movieName: currentMovie.name,
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

      console.log('🖨️ Preparing to print grouped tickets via Tauri:', ticketGroups);

      // Print each ticket group using Tauri
      let allPrinted = true;
      for (const ticketGroup of ticketGroups) {
        // Send grouped ticket data to backend for proper formatting
        const printSuccess = await tauriPrinterService.printTicket(ticketGroup, printerConfig.name);
        
        if (!printSuccess) {
          console.error('❌ Failed to print ticket group:', ticketGroup.seatRange);
          allPrinted = false;
          break;
        }
      }
      
      if (!allPrinted) {
        console.error('❌ Failed to print all tickets');
        return;
      }

      // If printing is successful, save booking to backend
      const tickets = selectedSeats.map(seat => ({
        id: seat.id,
        row: seat.row,
        number: seat.number,
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
        screen: currentMovie.screen,
        movie: currentMovie.name,
        date: selectedDate,
        source: 'LOCAL'
      };
      
      console.log('💾 Saving booking to backend:', bookingData);
      console.log('🌐 Backend URL: http://localhost:3001');
      
      const response = await saveBookingToBackend(bookingData);
      console.log('💾 Backend response:', response);
      
      if (response && response.success) {
        // Mark all selected seats as booked in the store
        selectedSeats.forEach(seat => toggleSeatStatus(seat.id, 'BOOKED'));
        
        console.log('✅ Tickets printed and booking saved successfully');
        setSelectedGroupIdxs([]);
        
        // Notify parent to complete booking (with delay to avoid React warnings)
        setTimeout(() => {
          if (onBookingComplete) onBookingComplete();
        }, 100);
      } else {
        console.error('❌ Failed to save booking to backend');
        console.error('❌ Response:', response);
      }
    } catch (error) {
      console.error('❌ Error in handleConfirmPrint:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 w-80 relative flex flex-col" style={{height: '500px', marginTop: 0, background: 'linear-gradient(135deg, #f8fafc 0%, #fff 100%)'}}>
      
      <div className="font-semibold text-lg px-4 pt-2 pb-3 border-b border-gray-100 mb-3 flex items-center justify-between">
        <span>Tickets</span>
        <div className="flex items-center gap-2">
          {selectedGroupIdxs.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {selectedGroupIdxs.length} selected
            </span>
          )}
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
              className={`rounded-xl shadow-md px-5 py-3 mb-3 cursor-pointer relative transition border-2 flex flex-col justify-between ${colorClass} ${selectedGroupIdxs.includes(idx) ? 'border-blue-500 bg-blue-100 shadow-lg scale-105' : 'border-transparent'} hover:shadow-lg ${decoupledSeatIds.some(id => g.seatIds.includes(id)) ? 'border-orange-400 bg-orange-50' : ''}`}
              onClick={() => toggleGroupSelection(idx)}
              onDoubleClick={() => handleDoubleClickDecouple(g.seatIds)}
              title="Click to select for deletion • Double-click to decouple into individual tickets"
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
                  {selectedGroupIdxs.includes(idx) && (
                    <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                      Selected
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
            className="bg-red-100 text-red-700 hover:bg-red-200 font-semibold px-4 py-2 rounded-lg border border-red-300 transition text-sm"
            onClick={async () => {
              console.log('🗑️ Delete clicked');
              console.log('🗑️ selectedSeats:', selectedSeats);
              console.log('🗑️ selectedGroupIdxs:', selectedGroupIdxs);
              console.log('🗑️ onDelete function exists:', !!onDelete);
              console.log('🗑️ groups:', groups);
              
              if (!onDelete || selectedSeats.length === 0) {
                console.error('❌ Cannot delete: onDelete function missing or no seats selected');
                return;
              }
              
              let seatIdsToDelete: string[];
              
              if (selectedGroupIdxs.length > 0) {
                // User has selected specific ticket groups - delete only those
                seatIdsToDelete = selectedGroupIdxs.flatMap(idx => groups[idx].seatIds);
                console.log('🗑️ User selected specific tickets - deleting SELECTED tickets:', seatIdsToDelete);
              } else {
                // No specific selection - delete ALL tickets directly
                seatIdsToDelete = selectedSeats.map(seat => seat.id);
                console.log('🗑️ No specific selection - deleting ALL tickets:', seatIdsToDelete);
              }
              
              console.log('🗑️ About to call onDelete with seatIds:', seatIdsToDelete);
              
              try {
                await onDelete(seatIdsToDelete);
                console.log('✅ onDelete completed successfully');
              } catch (error) {
                console.error('❌ onDelete failed:', error);
              }
              
              setSelectedGroupIdxs([]);
            }}
          >
            Delete
          </button>
        </div>
      </div>
      

      
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
 