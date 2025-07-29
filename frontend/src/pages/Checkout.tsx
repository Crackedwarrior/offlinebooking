import { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import type { ShowTime } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import ShowSelector from '@/components/ShowSelector';
import { getCurrentShowLabel } from '@/lib/utils';
import TicketPrint from '@/components/TicketPrint';
import { useRef } from 'react';
import { SEAT_CLASSES, SHOW_TIMES, MOVIE_CONFIG, getSeatClassByRow } from '@/lib/config';
import { useSettingsStore } from '@/store/settingsStore';

const CLASS_INFO = SEAT_CLASSES.map(cls => ({
  key: cls.key,
  label: cls.label,
  color: cls.color,
  price: cls.price,
  rows: cls.rows
}));

// Dynamic show details from settings
// Helper function to convert 24-hour format to 12-hour format for display
const convertTo12Hour = (time24h: string): string => {
  const [hours, minutes] = time24h.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const getShowDetails = () => {
  try {
    const { useSettingsStore } = require('@/store/settingsStore');
    const getShowTimes = useSettingsStore.getState().getShowTimes;
    const showTimes = getShowTimes();
    
    return showTimes.reduce((acc, show) => {
      acc[show.key] = { 
        label: show.label, 
        timing: `${convertTo12Hour(show.startTime)} - ${convertTo12Hour(show.endTime)}`, 
        price: 150 // All shows have same base price
      };
      return acc;
    }, {} as Record<string, { label: string; timing: string; price: number }>);
  } catch {
    // Fallback to static configuration
    return SHOW_TIMES.reduce((acc, show) => {
      acc[show.key] = { 
        label: show.label, 
        timing: show.timing, 
        price: 150
      };
      return acc;
    }, {} as Record<string, { label: string; timing: string; price: number }>);
  }
};

function getCurrentShowKey() {
  try {
    const { useSettingsStore } = require('@/store/settingsStore');
    const getShowTimes = useSettingsStore.getState().getShowTimes;
    const showTimes = getShowTimes();
    
    if (showTimes.length === 0) {
      return 'EVENING'; // Default fallback
    }
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Find the current show based on time ranges
    for (const show of showTimes) {
      const [startHour, startMin] = show.startTime.split(':').map(Number);
      const [endHour, endMin] = show.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      // Handle overnight shows (e.g., 23:30 - 02:30)
      if (endMinutes < startMinutes) {
        if (currentTime >= startMinutes || currentTime < endMinutes) {
          return show.key;
        }
      } else {
        if (currentTime >= startMinutes && currentTime < endMinutes) {
          return show.key;
        }
      }
    }
    
    // Default to first show if no match
    return showTimes[0]?.key || 'EVENING';
  } catch {
    // Fallback to static configuration
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;
    
    if (totalMinutes >= 600 && totalMinutes < 720) return 'MORNING';
    if (totalMinutes >= 840 && totalMinutes < 1020) return 'MATINEE';
    if (totalMinutes >= 1080 && totalMinutes < 1260) return 'EVENING';
    if (totalMinutes >= 1350 || totalMinutes < 600) return 'NIGHT';
    
    return 'EVENING';
  }
}

interface CheckoutProps {
  onBookingComplete?: (bookingData: any) => void;
}

const Checkout: React.FC<CheckoutProps> = ({ onBookingComplete }) => {
  const { seats, selectedShow, setSelectedShow, selectedDate, toggleSeatStatus, loadBookingForDate, initializeSeats } = useBookingStore();
  const { movie, getPriceForClass } = useSettingsStore();
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);
  const showDropdownRef = useRef<HTMLDivElement>(null);
  // Add state for dynamic seat selection count per class
  const [selectedCount, setSelectedCount] = useState<Record<string, number>>({});
  // Add state for decoupled seat IDs
  const [decoupledSeatIds, setDecoupledSeatIds] = useState<string[]>([]);

  // Get reactive show details
  const SHOW_DETAILS = getShowDetails();
  const showOptions = Object.keys(SHOW_DETAILS);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showDropdownRef.current && !showDropdownRef.current.contains(event.target as Node)) {
        setShowDropdownOpen(false);
      }
    }
    if (showDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdownOpen]);

  // Handler for show selection
  const handleShowSelect = (showKey: string) => {
    console.log('Show selection changed:', showKey.toUpperCase());
    setSelectedShow(showKey.toUpperCase() as ShowTime);
    loadBookingForDate(selectedDate, showKey.toUpperCase() as ShowTime);
    setShowDropdownOpen(false);
  };

  // Group selected seats by class
  const selectedSeats = seats.filter(seat => seat.status === 'selected');
  const classCounts = CLASS_INFO.map(cls => {
    const count = selectedSeats.filter(seat => cls.rows.includes(seat.row)).length;
    const price = getPriceForClass(cls.label);
    return { ...cls, count, price };
  });
  const total = classCounts.reduce((sum, cls: any) => sum + cls.count * cls.price, 0);

  // For TicketPrint: map to required format
  const ticketSeats = selectedSeats
    .map(seat => {
      const cls = CLASS_INFO.find(c => c.rows.includes(seat.row));
      const price = cls ? getPriceForClass(cls.label) : 0;
      return {
        id: seat.id,
        row: seat.row,
        number: seat.number,
        classLabel: cls?.label || seat.row,
        price: price,
      };
    });

  // Simplified handlers
  const handleDeleteTickets = (seatIds: string[]) => {
    seatIds.forEach(id => toggleSeatStatus(id, 'available'));
    // Remove from decoupled list if present
    setDecoupledSeatIds(prev => prev.filter(id => !seatIds.includes(id)));
  };

  const handleDecoupleTickets = (seatIds: string[]) => {
    // Add these seat IDs to the decoupled list
    setDecoupledSeatIds(prev => [...prev, ...seatIds]);
  };

  const handleConfirmBooking = () => {
    // Mark selected seats as booked
    selectedSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'booked');
    });
  };

  // Handler for booking complete
  const handleBookingComplete = () => {
    // Prepare booking data for confirmation
    const bookingData = {
      date: selectedDate,
      show: selectedShow,
      movie: movie.name,
      screen: movie.screen,
      seats: selectedSeats.map(seat => ({
        id: seat.id,
        classLabel: getSeatClassByRow(seat.row)?.label || 'UNKNOWN',
        price: getPriceForClass(getSeatClassByRow(seat.row)?.label || 'UNKNOWN')
      })),
      totalAmount: total,
      totalTickets: selectedSeats.length,
      timestamp: new Date().toISOString()
    };

    // Call the callback if provided
    if (onBookingComplete) {
      onBookingComplete(bookingData);
    } else {
      // Fallback: Reset seats
      initializeSeats();
    }
  };

  // Helper to get the first valid contiguous block in a class
  function getValidContiguousBlock(seats: any[], classRows: string[]) {
    const classSeats = seats.filter(seat => classRows.includes(seat.row) && seat.status === 'available');
    if (classSeats.length === 0) return [];
    
    // Group by row
    const grouped = classSeats.reduce((acc: any, seat: any) => {
      acc[seat.row] = acc[seat.row] || [];
      acc[seat.row].push(seat);
      return acc;
    }, {});
    
    // Find the first group that is contiguous
    for (const row in grouped) {
      const group = grouped[row].sort((a: any, b: any) => a.number - b.number);
      if (group.length > 1 && group.every((s: any, i: number, arr: any[]) => i === 0 || s.number === arr[i - 1].number + 1)) {
        return group;
      }
    }
    return [];
  }

  // Helper function to find contiguous block starting from a specific position
  const findContiguousBlock = (rowSeats: any[], count: number, startFromIndex: number = 0) => {
    console.log(`findContiguousBlock: looking for ${count} seats starting from index ${startFromIndex} in`, rowSeats.map(s => `${s.row}${s.number}`));
    
    if (rowSeats.length < count + startFromIndex) {
      console.log(`findContiguousBlock: not enough seats (${rowSeats.length} < ${count + startFromIndex})`);
      return null;
    }
    
    const candidate = rowSeats.slice(startFromIndex, startFromIndex + count);
    console.log(`findContiguousBlock: candidate seats:`, candidate.map(s => `${s.row}${s.number}`));
    
    const isContiguous = candidate.every((s: any, j: number, arr: any[]) => {
      if (j === 0) return true;
      const isConsecutive = s.number === arr[j - 1].number + 1;
      console.log(`findContiguousBlock: checking ${s.row}${s.number} vs ${arr[j-1].row}${arr[j-1].number}: ${isConsecutive}`);
      return isConsecutive;
    });
    
    console.log(`findContiguousBlock: isContiguous = ${isContiguous}`);
    return isContiguous ? candidate : null;
  };

  // Handler for class card click - select contiguous seats with grow-or-relocate logic
  const handleClassCardClick = (cls: any) => {
    const classKey = cls.key || cls.label;
    
    // Get currently selected seats in this class
    const previouslySelected = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'selected');
    const currentCount = previouslySelected.length;
    const newCount = currentCount + 1;
    
    console.log(`Class card clicked: ${classKey}, current count: ${currentCount}, new count: ${newCount}`);
    console.log('Previously selected seats:', previouslySelected.map(s => s.id));
    
    // CASE 1: Nothing selected yet — find next available block after last booking
    if (previouslySelected.length === 0) {
      console.log('Case 1: Starting fresh - looking for next available block');
      
      // Find the last booked seat in this class to know where to start
      const allSeatsInClass = seats.filter(seat => cls.rows.includes(seat.row));
      const bookedSeatsInClass = allSeatsInClass.filter(seat => seat.status === 'booked');
      
      let lastBookedSeatNumber = 0;
      let lastBookedRow = cls.rows[0];
      
      if (bookedSeatsInClass.length > 0) {
        // Find the highest seat number among booked seats
        const highestBooked = bookedSeatsInClass.reduce((max, seat) => 
          seat.number > max.number ? seat : max
        );
        lastBookedSeatNumber = highestBooked.number;
        lastBookedRow = highestBooked.row;
        console.log(`Last booked seat: ${lastBookedRow}${lastBookedSeatNumber}`);
      }
      
      // Try to find N contiguous seats starting after the last booked seat
      for (const row of cls.rows) {
        console.log(`Checking row: ${row}`);
        
        const allSeatsInRow = seats.filter(seat => seat.row === row);
        const rowSeats = allSeatsInRow
          .filter(seat => seat.status === 'available')
          .sort((a, b) => a.number - b.number);
        
        console.log(`Available seats in ${row}:`, rowSeats.map(s => `${s.row}${s.number}`));
        
        let startIndex = 0;
        
        // If this is the same row as the last booking, start after the last booked seat
        if (row === lastBookedRow && lastBookedSeatNumber > 0) {
          // Find the first available seat that comes after the last booked seat
          const nextAvailableSeat = rowSeats.find(seat => seat.number > lastBookedSeatNumber);
          if (nextAvailableSeat) {
            startIndex = rowSeats.indexOf(nextAvailableSeat);
            console.log(`Starting from index ${startIndex} (seat ${nextAvailableSeat.row}${nextAvailableSeat.number} after ${lastBookedSeatNumber})`);
          } else {
            // No seats available after last booking in this row
            console.log(`No seats available after ${lastBookedSeatNumber} in row ${row}`);
            continue; // Try next row
          }
        }
        
        const block = findContiguousBlock(rowSeats, newCount, startIndex);
        if (block) {
          console.log(`Found next available block:`, block.map(s => s.id));
          block.forEach(seat => toggleSeatStatus(seat.id, 'selected'));
          setSelectedCount(prev => ({ ...prev, [classKey]: newCount }));
          return;
        }
      }
      
      // No block found, reset to 0
      setSelectedCount(prev => ({ ...prev, [classKey]: 0 }));
      return;
    }
    
    // CASE 2: Try growing the existing block in the same row
    const currentRow = previouslySelected[0].row;
    console.log(`Case 2: Trying to grow in row ${currentRow}`);
    
    const allSeatsInCurrentRow = seats.filter(seat => seat.row === currentRow);
    const allSeatsInCurrentRowSorted = allSeatsInCurrentRow.sort((a, b) => a.number - b.number);
    
    console.log(`All seats in current row:`, allSeatsInCurrentRowSorted.map(s => `${s.row}${s.number} (${s.status})`));
    
    // Find the lowest and highest seat numbers among currently selected seats
    const lowestSelectedSeat = previouslySelected.reduce((min, seat) => 
      seat.number < min.number ? seat : min
    );
    const highestSelectedSeat = previouslySelected.reduce((max, seat) => 
      seat.number > max.number ? seat : max
    );
    console.log(`Selected range: ${lowestSelectedSeat.row}${lowestSelectedSeat.number} to ${highestSelectedSeat.row}${highestSelectedSeat.number}`);
    
    // Try to find a larger contiguous block that includes the current selection
    // We need to find a block of 'newCount' seats that starts from the lowest selected seat
    const startIndex = allSeatsInCurrentRowSorted.findIndex(seat => seat.number === lowestSelectedSeat.number);
    const grownBlock = findContiguousBlock(allSeatsInCurrentRowSorted, newCount, startIndex);
    if (grownBlock) {
      console.log(`Found grown block in same row:`, grownBlock.map(s => s.id));
      
      // Deselect current seats and select the grown block
      previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'available'));
      grownBlock.forEach(seat => toggleSeatStatus(seat.id, 'selected'));
      setSelectedCount(prev => ({ ...prev, [classKey]: newCount }));
      return;
    }
    
    // CASE 3: Cannot grow in same row — find new block in next available row
    console.log('Case 3: Looking for new block in next row');
    
    // Find the next row after current row
    const currentRowIndex = cls.rows.indexOf(currentRow);
    const nextRows = cls.rows.slice(currentRowIndex + 1);
    
    for (const row of nextRows) {
      console.log(`Checking next row: ${row}`);
      
      const allSeatsInRow = seats.filter(seat => seat.row === row);
      const rowSeats = allSeatsInRow
        .filter(seat => seat.status === 'available')
        .sort((a, b) => a.number - b.number);
      
      console.log(`Available seats in ${row}:`, rowSeats.map(s => `${s.row}${s.number}`));
      
      const newBlock = findContiguousBlock(rowSeats, newCount);
      if (newBlock) {
        console.log(`Found new block in ${row}:`, newBlock.map(s => s.id));
        
        // Deselect current seats and select the new block
        previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'available'));
        newBlock.forEach(seat => toggleSeatStatus(seat.id, 'selected'));
        setSelectedCount(prev => ({ ...prev, [classKey]: newCount }));
        return;
      }
    }
    
    // CASE 4: No valid block found anywhere — reset to 0
    console.log('Case 4: No valid block found, resetting to 0');
    previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'available'));
    setSelectedCount(prev => ({ ...prev, [classKey]: 0 }));
  };

  const movieName = 'KALANK';
  const movieLanguage = 'HINDI';

  return (
    <div className="w-full h-full flex flex-row gap-x-6 px-6 pt-4 pb-4 items-start">
      <div className="flex-[3] flex flex-col">
        <div className="font-bold text-xl mb-0 ml-0">Checkout Summary</div>
        <div className="mt-4">
          <div className="flex w-full max-w-5xl pt-0">
            {/* Show Box */}
            <div className="flex flex-col border border-gray-200 bg-white w-[200px] h-[120px] px-6 py-2 relative cursor-pointer select-none rounded-l-xl shadow-md transition-transform hover:-translate-y-1 hover:shadow-lg"
              onDoubleClick={() => setShowDropdownOpen((open) => !open)}
              ref={showDropdownRef}
            >
              <span className="font-bold text-lg mb-1 inline whitespace-nowrap">{`${movie.name} (${movie.language})`}</span>
              <span className="text-sm font-semibold text-blue-600 mb-1">{SHOW_DETAILS[selectedShow]?.label || selectedShow}</span>
              <span className="text-sm mb-2 whitespace-nowrap">{SHOW_DETAILS[selectedShow]?.timing || ''}</span>
              <span className="absolute right-3 bottom-2 text-base font-semibold">{(() => {
                const totalSeats = seats.length;
                const bookedSeats = seats.filter(seat => seat.status === 'booked').length;
                return `${bookedSeats}/${totalSeats}`;
              })()}</span>
              {/* Dropdown for show selection */}
              {showDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-[220px] bg-white rounded-xl shadow-lg border z-50 p-2 space-y-2" style={{minWidth: 200}}>
                  {Object.keys(SHOW_DETAILS).map((showKey) => (
                    <div
                      key={showKey}
                      className={`p-3 rounded-lg cursor-pointer flex flex-col border transition-all ${selectedShow === showKey ? 'bg-blue-100 border-blue-400' : 'hover:bg-gray-100 border-transparent'}`}
                      onClick={() => {
                        console.log('Dropdown clicked:', showKey);
                        handleShowSelect(showKey);
                      }}
                    >
                      <span className="font-bold text-base">{SHOW_DETAILS[showKey].label}</span>
                      <span className="text-xs text-gray-600">{SHOW_DETAILS[showKey].timing}</span>
                      <span className="text-xs text-gray-500 mt-1">{(() => {
                        // Show seat stats for this show
                        if (showKey === selectedShow) {
                          const totalSeats = seats.length;
                          const bookedSeats = seats.filter(seat => seat.status === 'booked').length;
                          return `Booked: ${bookedSeats}/${totalSeats}`;
                        } else {
                          return '';
                        }
                      })()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Class Boxes */}
            {CLASS_INFO.map((cls, i) => {
              const total = seats.filter(seat => cls.rows.includes(seat.row)).length;
              const available = seats.filter(seat => cls.rows.includes(seat.row) && seat.status !== 'booked').length;
              const sold = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'booked').length;
              const price = getPriceForClass(cls.label);
              
              // Original color mapping
              const colorMap = {
                BOX: 'bg-cyan-200',
                'STAR CLASS': 'bg-cyan-400',
                CLASSIC: 'bg-yellow-200',
                'FIRST CLASS': 'bg-pink-300',
                'SECOND CLASS': 'bg-gray-300',
              };
              
              // Determine border radius and negative margin
              let cardClass = '';
              if (i === 0) cardClass = 'rounded-none -ml-2';
              else if (i === CLASS_INFO.length - 1) cardClass = 'rounded-r-xl -ml-2';
              else cardClass = 'rounded-none -ml-2';
              
              return (
                <div
                  key={cls.key}
                  className={`flex flex-col justify-between w-[200px] h-[120px] px-6 py-2 relative border border-white shadow-md transition-transform hover:-translate-y-1 hover:shadow-lg cursor-pointer ${colorMap[cls.label as keyof typeof colorMap]} ${cardClass}`}
                  onClick={() => handleClassCardClick(cls)}
                >
                  <div>
                    <span className="font-bold text-lg whitespace-nowrap text-left">{cls.label}</span>
                    <span className="block text-sm text-gray-700 text-left">{total} ({available})</span>
                  </div>
                  <div className="flex items-center justify-between w-full absolute left-0 bottom-2 px-6">
                    <span className="text-[10px] font-semibold">{sold}</span>
                    <span className="text-lg font-bold text-right">₹{price}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Total directly under grid, left-aligned */}
        <div className="w-full max-w-5xl flex justify-start mt-2 ml-0">
          <span className="text-xl font-bold">Total: <span className="text-2xl">₹ {total}</span></span>
        </div>
      </div>

      {/* Ticket Print Component */}
      <div className="flex-[1]">
        <TicketPrint
          selectedSeats={ticketSeats}
          onDelete={handleDeleteTickets}
          onDecouple={handleDecoupleTickets}
          decoupledSeatIds={decoupledSeatIds}
          onReset={() => {
            selectedSeats.forEach(seat => toggleSeatStatus(seat.id, 'available'));
            setDecoupledSeatIds([]);
          }}
          selectedDate={selectedDate}
          onBookingComplete={handleBookingComplete}
        />
      </div>
    </div>
  );
};

export default Checkout; 