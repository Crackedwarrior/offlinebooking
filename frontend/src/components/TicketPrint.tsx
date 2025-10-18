import React, { useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import printerService, { TicketData } from '@/services/printerService';
import { ElectronPrinterService } from '@/services/electronPrinterService';
import { getTheaterConfig } from '@/config/theaterConfig';
import { PrintErrorBoundary } from './SpecializedErrorBoundaries';
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
  onNavigateToSeatGrid?: () => void;
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

// Helper: format seat numbers as range format (e.g., "4 - 6" instead of "4,5,6")
function formatSeatNumbers(seats: number[]): string {
  if (seats.length === 1) return seats[0].toString();
  
  // Sort seats to ensure proper range detection
  const sortedSeats = [...seats].sort((a, b) => a - b);
  
  // Check if seats are continuous
  const isContinuous = sortedSeats.every((seat, index) => {
    if (index === 0) return true;
    return seat === sortedSeats[index - 1] + 1;
  });
  
  if (isContinuous) {
    // All seats are continuous - use range format
    return `${sortedSeats[0]} - ${sortedSeats[sortedSeats.length - 1]}`;
  } else {
    // Non-continuous seats - group into ranges
    let ranges: string[] = [];
    let start = sortedSeats[0], end = sortedSeats[0];
    
    for (let i = 1; i <= sortedSeats.length; i++) {
      if (i < sortedSeats.length && sortedSeats[i] === end + 1) {
        end = sortedSeats[i];
      } else {
        if (start === end) {
          ranges.push(`${start}`);
        } else {
          ranges.push(`${start} - ${end}`);
        }
        if (i < sortedSeats.length) {
          start = sortedSeats[i];
          end = sortedSeats[i];
        }
      }
    }
    return ranges.join(', ');
  }
}

const classColorMap: Record<string, string> = {
  'BOX': 'bg-cyan-200 border-cyan-300 text-cyan-900',
  'STAR CLASS': 'bg-cyan-400 border-cyan-500 text-white',
  'CLASSIC': 'bg-yellow-200 border-yellow-300 text-yellow-900',
  'FIRST CLASS': 'bg-pink-300 border-pink-400 text-pink-900',
  'SECOND CLASS': 'bg-gray-300 border-gray-400 text-gray-900',
};

// Save booking to backend
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
  const theaterName = getTheaterConfig().name;
  const location = getTheaterConfig().location;
  
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
  decoupledSeatIds = [],
  onNavigateToSeatGrid
}) => {
  const groups = groupSeats(selectedSeats, decoupledSeatIds);
  const total = groups.reduce((sum, g) => sum + g.price, 0);
  const totalTickets = selectedSeats.length;
  const [selectedGroupIdxs, setSelectedGroupIdxs] = useState<number[]>([]);

  // 🔍 DEBUG: Log grouping results
  console.log('[PRINT] TICKETPRINT DEBUG: selectedSeats count:', selectedSeats.length);
  console.log('[PRINT] TICKETPRINT DEBUG: selectedSeats:', selectedSeats.map(s => `${s.id} (${s.row}${s.number})`));
  console.log('[PRINT] TICKETPRINT DEBUG: groups count:', groups.length);
  console.log('[PRINT] TICKETPRINT DEBUG: groups:', groups.map(g => `${g.classLabel} ${g.row} seats: ${g.seats.join(',')}`));

  // Removed excessive debug logging - performance optimization
  const selectedShow = useBookingStore(state => state.selectedShow);
  const toggleSeatStatus = useBookingStore(state => state.toggleSeatStatus);
  const { getMovieForShow } = useSettingsStore();

  // Determine print availability and reason
  const movieForCurrentShow = getMovieForShow(selectedShow);
  const hasMovieAssigned = !!movieForCurrentShow;
  const hasTicketsSelected = selectedSeats.length > 0;
  const canPrint = hasMovieAssigned && hasTicketsSelected;
  const printButtonLabel = hasMovieAssigned
    ? (hasTicketsSelected ? 'Print Now' : 'Select Seats to Print')
    : 'Assign Movie to Print';

    const toggleGroupSelection = (idx: number) => {
    setSelectedGroupIdxs(prev => {
      const newSelection = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
      return newSelection;
    });
  };

  const handleDelete = () => {
    if (!onDelete) {
      console.error('[ERROR] onDelete function not provided');
      return;
    }
    
    const seatIdsToDelete = selectedGroupIdxs.flatMap(idx => groups[idx].seatIds);
    
    if (seatIdsToDelete.length === 0) {
      console.warn('[WARN] No seats selected for deletion');
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
      console.log('[PRINT] Starting print process...');
      console.log('[PRINT] Selected seats:', selectedSeats);
      console.log('[PRINT] Selected date:', selectedDate);
      console.log('[PRINT] Selected show:', selectedShow);

      // Get movie for current show from settings
      const currentMovie = getMovieForShow(selectedShow);
      console.log('[PRINT] Current movie:', currentMovie);
      
      if (!currentMovie) {
        console.error('[ERROR] No movie found for show:', selectedShow);
        return;
      }

      // Get show time details from settings store
      const { getShowTimes } = useSettingsStore.getState();
      const showTimes = getShowTimes();
      const currentShowTime = showTimes.find(show => show.key === selectedShow);
      
      console.log('[TIME] Show times from settings:', showTimes);
      console.log('[TIME] Current show time:', currentShowTime);
      
      if (!currentShowTime) {
        console.error('[ERROR] No show time found for:', selectedShow);
        return;
      }

      // Use show time directly (already in 12-hour format)
      const showtime = currentShowTime.startTime;
      console.log('[TIME] Formatted showtime:', showtime);

      // Get printer configuration
      const printerInstance = printerService.getInstance();
      const printerConfig = printerInstance.getPrinterConfig();
      
      if (!printerConfig || !printerConfig.name) {
        console.error('[ERROR] No printer configured');
        return;
      }

      // Use Electron printer service
      const electronPrinterService = ElectronPrinterService.getInstance();
      
      // Prepare grouped ticket data
      const ticketGroups = groups.map(group => ({
        theaterName: printerConfig.theaterName || getTheaterConfig().name,
        location: printerConfig.location || getTheaterConfig().location,
        date: selectedDate,
        showTime: showtime,
        showKey: selectedShow,
        movieName: currentMovie.name,
        movieLanguage: currentMovie.language, // Add language information
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

      console.log('[PRINT] Preparing to print grouped tickets via Electron:', ticketGroups);
      
      // 🚀 FRONTEND DEBUG: Log which service will be used
      console.log('[PRINT] FRONTEND DEBUG: Movie language:', currentMovie.language);
      console.log('[PRINT] FRONTEND DEBUG: Movie printInKannada setting:', currentMovie.printInKannada);
      if (currentMovie.printInKannada) {
        console.log('[PRINT] FRONTEND DEBUG: This movie will use FastKannadaPrintService (wkhtmltopdf)');
        console.log('[PRINT] FRONTEND DEBUG: Expected performance: 3-5x faster than Puppeteer');
      } else {
        console.log('[PRINT] FRONTEND DEBUG: This movie will use PdfPrintService (PDFKit) for English');
      }

      // Print each ticket group using Electron
      let allPrinted = true;
      for (const ticketGroup of ticketGroups) {
        const formattedTicket = electronPrinterService.formatTicketForThermal(ticketGroup);
        console.log('[PRINT] FRONTEND DEBUG: About to print ticket group:', ticketGroup.seatRange);
        console.log('[PRINT] FRONTEND DEBUG: Movie data being sent:', currentMovie);
        
        // 🚀 FRONTEND DEBUG: Start timing for performance measurement
        const startTime = Date.now();
        console.log('[PRINT] FRONTEND DEBUG: Starting print at:', new Date().toISOString());
        
        const printSuccess = await electronPrinterService.printTicket(formattedTicket, printerConfig.name, currentMovie);
        
        // 🚀 FRONTEND DEBUG: End timing and log performance
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log('[PRINT] FRONTEND DEBUG: Print completed at:', new Date().toISOString());
        console.log('[PRINT] FRONTEND DEBUG: Print duration:', duration + 'ms');
        
        if (currentMovie.printInKannada) {
          console.log('[PRINT] FRONTEND DEBUG: FastKannadaPrintService (wkhtmltopdf) performance:', duration + 'ms');
          if (duration < 2000) {
            console.log('[PRINT] FRONTEND DEBUG: Excellent performance - under 2 seconds');
          } else if (duration < 5000) {
            console.log('[PRINT] FRONTEND DEBUG: Good performance - under 5 seconds');
          } else {
            console.log('[WARN] FRONTEND DEBUG: Performance could be better. Consider checking wkhtmltopdf setup');
          }
        } else {
          console.log('[PRINT] FRONTEND DEBUG: PdfPrintService (PDFKit) performance:', duration + 'ms');
        }
        
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
        movieLanguage: currentMovie.language || 'HINDI',
        date: selectedDate,
        source: 'LOCAL'
      };
      
      console.log('[BOOKING] Saving booking to backend:', bookingData);
      console.log('[BOOKING] Backend URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001');
      
      const response = await saveBookingToBackend(bookingData);
      console.log('[BOOKING] Backend response:', response);
      
      if (response && response.success) {
        // Mark all selected seats as booked in the store
        selectedSeats.forEach(seat => toggleSeatStatus(seat.id, 'BOOKED'));

        console.log('[BOOKING] Tickets printed and booking saved successfully');
        setSelectedGroupIdxs([]);

        // Stay on checkout page after successful print - don't navigate back to seat grid
        // User can manually navigate back when ready

        // Notify parent to complete booking (with delay to avoid React warnings)
        setTimeout(() => {
          if (onBookingComplete) onBookingComplete();
        }, 100);
      } else {
        console.error('[ERROR] Failed to save booking to backend');
        console.error('[ERROR] Response:', response);
      }
    } catch (error) {
      console.error('[ERROR] Error in handleConfirmPrint:', error);
      console.error('[ERROR] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  };

  return (
    <PrintErrorBoundary>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 relative flex flex-col h-full max-h-screen overflow-hidden" style={{ width: '380px', padding: '5.25px 11px -5.25px 11px' }}>
      
      <div className="font-semibold text-lg px-4 pt-3 pb-3 border-b border-gray-200 mb-3 flex items-center justify-between bg-gray-50 rounded-t-xl">
        <span className="text-gray-900">TICKETS</span>
        <div className="flex items-center gap-2">
          {selectedGroupIdxs.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              {selectedGroupIdxs.length} selected
            </span>
          )}
          {decoupledSeatIds.length > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
              {decoupledSeatIds.length} decoupled
            </span>
          )}
          {onReset && (
            <button
              className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 flex items-center justify-center ml-2 transition-all duration-200 rounded-lg p-2 shadow-sm hover:shadow-md"
              title="Reset all tickets"
              onClick={onReset}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 7H3V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 7a9 9 0 1 1 2.12 9.17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
      </div>
      

      
      {/* Scrollable ticket list */}
      <div className="flex-1 min-h-0 max-h-96 overflow-y-auto hide-scrollbar px-3 pt-2">
        {groups.map((g, idx) => {
          const colorClass = classColorMap[g.classLabel] || 'bg-cyan-300';
          return (
                          <div
                key={g.classLabel + g.row + g.seats.join(',')}
              className={`rounded-lg border border-gray-200 shadow-sm px-3 py-3 mb-2 cursor-pointer relative transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 ${colorClass} ${selectedGroupIdxs.includes(idx) ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02] ring-2 ring-blue-200' : ''} ${decoupledSeatIds.some(id => g.seatIds.includes(id)) ? 'border-orange-400 bg-orange-50' : ''}`}
                onClick={() => toggleGroupSelection(idx)}
                onDoubleClick={() => handleDoubleClickDecouple(g.seatIds)}
                title="Click to select for deletion • Double-click to decouple into individual tickets"
              >
                {/* Top row: label and checkbox */}
                <div className="flex items-center justify-between w-full">
                <div className="font-bold text-base leading-tight text-gray-900">
                    {g.classLabel} {g.row.replace(/^[^-]+-/, '')} {formatSeatNumbers(g.seats)}
                    {decoupledSeatIds.some(id => g.seatIds.includes(id)) && (
                      <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full font-medium">
                        Individual
                      </span>
                    )}
                    {selectedGroupIdxs.includes(idx) && (
                      <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-medium">
                        Selected
                      </span>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedGroupIdxs.includes(idx)}
                    onChange={() => toggleGroupSelection(idx)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer rounded border-2 border-gray-300 focus:ring-2 focus:ring-blue-400 transition"
                    style={{ marginTop: 2 }}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                
                {/* Bottom row: price and count */}
                <div className="flex items-end justify-between w-full mt-2">
                <div className="text-sm font-semibold text-gray-800">Price: <span className="font-bold text-lg text-gray-900">₹{g.price}</span></div>
                  <div className="text-xs font-semibold bg-gray-100 text-gray-700 rounded-full px-2 py-1">{g.seats.length}</div>
                </div>
              </div>
          );
        })}
        {/* Add spacing below last ticket card */}
        <div className="mb-0"></div>
      </div>
      
      {/* Total and Delete button - integrated naturally */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
        {/* Total section */}
        <div className="flex items-center gap-3">
         <span className="font-semibold text-gray-900">Total:</span>
         <span className="text-xl font-bold text-gray-900">₹ {total}</span>
          <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-3 py-1 font-semibold">
           {totalTickets} ticket{totalTickets !== 1 ? 's' : ''}
         </span>
       </div>
      
        {/* Delete button */}
        <button
          className="bg-red-500 hover:bg-red-600 text-white font-medium px-3 py-2 rounded-lg transition-all duration-200 text-sm"
          onClick={async () => {
            console.log('[TICKET] Delete clicked');
            console.log('[TICKET] selectedSeats:', selectedSeats);
            console.log('[TICKET] selectedGroupIdxs:', selectedGroupIdxs);
            console.log('[TICKET] onDelete function exists:', !!onDelete);
            console.log('[TICKET] groups:', groups);
            
            if (!onDelete || selectedSeats.length === 0) {
              console.error('[ERROR] Cannot delete: onDelete function missing or no seats selected');
              return;
            }
            
            let seatIdsToDelete: string[];
            
            if (selectedGroupIdxs.length > 0) {
              // User has selected specific ticket groups - delete only those
              seatIdsToDelete = selectedGroupIdxs.flatMap(idx => groups[idx].seatIds);
              console.log('[TICKET] User selected specific tickets - deleting SELECTED tickets:', seatIdsToDelete);
            } else {
              // No specific selection - delete ALL tickets directly
              seatIdsToDelete = selectedSeats.map(seat => seat.id);
              console.log('[TICKET] No specific selection - deleting ALL tickets:', seatIdsToDelete);
            }
            
            console.log('[TICKET] About to call onDelete with seatIds:', seatIdsToDelete);
            
            try {
              await onDelete(seatIdsToDelete);
              console.log('[TICKET] onDelete completed successfully');
            } catch (error) {
              console.error('[ERROR] onDelete failed:', error);
            }
            
            setSelectedGroupIdxs([]);
          }}
        >
          Delete
        </button>
      </div>

      {/* Enhanced action buttons with labels - full width and height at bottom */}
      <div className="w-full flex-1 flex bg-gradient-to-r from-gray-50 to-gray-100 rounded-b-xl border-t border-gray-200 shadow-sm overflow-hidden">
          
          {/* Seat Grid Button */}
        <button
            className={`flex-1 flex flex-col items-center justify-center border-r border-gray-200 transition-all duration-200 ${
            selectedSeats.length > 0 
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          onClick={() => {
            if (selectedSeats.length === 0) {
              console.log('[WARN] No tickets selected - cannot navigate to seat grid');
              return;
            }
            
            console.log('[NAV] Lightning button clicked - navigate to seat grid');
            if (onNavigateToSeatGrid) {
              onNavigateToSeatGrid();
            }
          }}
        >
            <div className="w-6 h-6 mb-2">
              <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
          </svg>
            </div>
            <span className="text-xs font-medium">View Seats</span>
        </button>
        
          {/* Print Button */}
        <button
            className={`flex-1 flex flex-col items-center justify-center transition-all duration-200 ${canPrint ? 'bg-green-50 hover:bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          onClick={() => {
            console.log('[PRINT] Print button clicked');
            if (!canPrint) {
              if (!hasMovieAssigned) console.log('[ERROR] Cannot print: No movie assigned to the current show');
              else if (!hasTicketsSelected) console.log('[WARN] No tickets to print');
              return;
            }
            handleConfirmPrint();
          }}
          disabled={!canPrint}
        >
            <div className="w-6 h-6 mb-2">
              <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
          </svg>
            </div>
            <span className="text-xs font-medium">{printButtonLabel}</span>
        </button>
      </div>
      </div>
      

      
      {/* Hide the vertical scrollbar but keep scrolling */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
    </PrintErrorBoundary>
  );
};

export default TicketPrint; 
 