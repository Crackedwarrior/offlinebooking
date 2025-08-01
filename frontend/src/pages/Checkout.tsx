import { useState, useEffect, useMemo } from 'react';
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
import { getSeatStatus } from '@/services/api';
import { toast } from '@/hooks/use-toast';

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
  checkoutData?: any;
}

const Checkout: React.FC<CheckoutProps> = ({ onBookingComplete, checkoutData }) => {
  const { seats, selectedShow, setSelectedShow, selectedDate, toggleSeatStatus, loadBookingForDate, initializeSeats, syncSeatStatus } = useBookingStore();
  const { getPriceForClass, getMovieForShow } = useSettingsStore();
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);
  const showDropdownRef = useRef<HTMLDivElement>(null);
  // Add state for decoupled seat IDs
  const [decoupledSeatIds, setDecoupledSeatIds] = useState<string[]>([]);
  // Add state to track if booking was just completed
  const [bookingCompleted, setBookingCompleted] = useState(false);

  // Debug: Log the props and store state (only when there are changes)
  useEffect(() => {
    console.log('🔍 Checkout component render:', {
      checkoutDataExists: !!checkoutData,
      checkoutDataSelectedSeats: checkoutData?.selectedSeats?.length || 0,
      storeSeatsLength: seats.length,
      storeSelectedSeats: seats.filter(s => s.status === 'selected').length,
      storeSelectedSeatIds: seats.filter(s => s.status === 'selected').map(s => s.id)
    });
  }, [checkoutData, seats]);

  // Use checkoutData if available, otherwise fall back to global state
  const selectedSeats = useMemo(() => {
    // If we have checkoutData with selected seats, use it
    // Otherwise, use store data (for when seats are selected after checkoutData is set)
    const storeSelectedSeats = seats.filter(seat => seat.status === 'selected');
    
    // Only use checkoutData if it exists and has selected seats
    const hasCheckoutSeats = checkoutData && 
                            checkoutData.selectedSeats && 
                            Array.isArray(checkoutData.selectedSeats) && 
                            checkoutData.selectedSeats.length > 0;
    
    const result = hasCheckoutSeats ? checkoutData.selectedSeats : storeSelectedSeats;
    
    // Only log when there are actual changes to avoid spam
    if (result.length > 0 || storeSelectedSeats.length > 0) {
      console.log('🔍 selectedSeats calculation:', {
        checkoutDataExists: !!checkoutData,
        hasCheckoutSeats,
        checkoutDataSelectedCount: checkoutData?.selectedSeats?.length || 0,
        storeSelectedCount: storeSelectedSeats.length,
        selectedSeatsCount: result.length,
        selectedSeatIds: result.map(s => s.id)
      });
    }
    return result;
  }, [checkoutData, seats]);

  // Reset booking completed state when checkout data is cleared
  useEffect(() => {
    if (!checkoutData && bookingCompleted) {
      setBookingCompleted(false);
    }
  }, [checkoutData, bookingCompleted]);
  
  // Fetch current seat status from backend when component mounts or date/show changes
  useEffect(() => {
    const fetchCurrentSeatStatus = async () => {
      try {
        console.log('🔄 Fetching seat status for checkout page:', { date: selectedDate, show: selectedShow });
        const response = await getSeatStatus({ date: selectedDate, show: selectedShow });
        
        if (response.success && response.data) {
          const { bookedSeats, bmsSeats } = response.data as any;
          
          // Use the new syncSeatStatus function to properly sync seat status
          const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
          const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
          syncSeatStatus(bookedSeatIds, bmsSeatIds);
          
          console.log(`✅ Updated ${bookedSeats.length} booked seats and ${bmsSeats.length} BMS seats in checkout`);
        }
      } catch (error) {
        console.error('❌ Error fetching seat status in checkout:', error);
        toast({
          title: 'Error',
          description: 'Failed to load current seat status.',
          variant: 'destructive',
        });
      }
    };

    fetchCurrentSeatStatus();
  }, [selectedDate, selectedShow, syncSeatStatus]);
  
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

  const classCounts = CLASS_INFO.map(cls => {
    const count = selectedSeats.filter(seat => cls.rows.includes(seat.row)).length;
    const price = getPriceForClass(cls.label);
    return { ...cls, count, price };
  });
  const total = classCounts.reduce((sum, cls: any) => sum + cls.count * cls.price, 0);

  // Debug logging (only when there are selected seats)
  useEffect(() => {
    if (selectedSeats.length > 0) {
      console.log('🔍 Debug: Selected seats:', selectedSeats.length);
      console.log('🔍 Debug: Selected seats details:', selectedSeats.map(s => `${s.id} (${s.status})`));
      console.log('🔍 Debug: Class counts:', classCounts.map(c => `${c.label}: ${c.count} * ₹${c.price} = ₹${c.count * c.price}`));
      console.log('🔍 Debug: Total:', total);
    }
  }, [selectedSeats, classCounts, total]);

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
    // Mark selected seats as booked first
    selectedSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'booked');
    });
    
    // Set booking completed state
    setBookingCompleted(true);
    
    // Prepare booking data for confirmation
    const bookingData = {
      date: selectedDate,
      show: selectedShow,
      movie: currentMovie.name,
      screen: currentMovie.screen,
      seats: selectedSeats.map(seat => ({
        id: seat.id,
        classLabel: getSeatClassByRow(seat.row)?.label || 'UNKNOWN',
        price: getPriceForClass(getSeatClassByRow(seat.row)?.label || 'UNKNOWN')
      })),
      totalAmount: total,
      totalTickets: selectedSeats.length,
      timestamp: new Date().toISOString()
    };

    // Call the parent's onBookingComplete callback
    if (onBookingComplete) {
      onBookingComplete(bookingData);
    }
  };

  // Handler to reset checkout state for new booking
  const handleResetForNewBooking = () => {
    // Clear all selected seats
    selectedSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'available');
    });
    
    // Clear decoupled seat IDs
    setDecoupledSeatIds([]);
    
    // Reset booking completed state
    setBookingCompleted(false);
    
    // Show success message
    toast({
      title: 'Ready for New Booking',
      description: 'Checkout has been reset. You can now select new seats.',
      duration: 3000,
    });
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
    
    console.log(`🎯 Class card clicked: ${classKey}`);
    console.log(`🎯 Available seats in ${classKey}:`, seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'available').map(s => s.id));
    
    // Reset booking completed state when new seats are selected
    if (bookingCompleted) {
      setBookingCompleted(false);
    }
    
    // Get currently selected seats in this class
    const previouslySelected = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'selected');
    const currentCount = previouslySelected.length;
    const newCount = currentCount + 1;
    
    console.log(`Class card clicked: ${classKey}, current count: ${currentCount}, new count: ${newCount}`);
    console.log('Previously selected seats:', previouslySelected.map(s => s.id));
    
    // CASE 1: Nothing selected yet — find next available block
    if (previouslySelected.length === 0) {
      console.log('Case 1: Starting fresh - looking for next available block');
      
      // Try to find N contiguous seats starting from the first available seat
      for (const row of cls.rows) {
        console.log(`Checking row: ${row}`);
        
        const allSeatsInRow = seats.filter(seat => seat.row === row);
        const rowSeats = allSeatsInRow
          .filter(seat => seat.status === 'available')
          .sort((a, b) => a.number - b.number);
        
        console.log(`Available seats in ${row}:`, rowSeats.map(s => `${s.row}${s.number}`));
        
        const block = findContiguousBlock(rowSeats, newCount, 0);
        if (block) {
          console.log(`Found next available block:`, block.map(s => s.id));
          console.log(`🎯 Marking seats as selected:`, block.map(s => s.id));
          block.forEach(seat => {
            console.log(`🎯 Toggling seat ${seat.id} to selected`);
            toggleSeatStatus(seat.id, 'selected');
          });
          
          // Add a small delay to ensure store updates are processed
          setTimeout(() => {
            console.log('🔍 After delay - Store state:', {
              selectedSeats: seats.filter(s => s.status === 'selected').length,
              selectedSeatIds: seats.filter(s => s.status === 'selected').map(s => s.id)
            });
          }, 100);
          
          return;
        }
      }
      
      // No block found
      console.log('No available block found');
      return;
    }
    
    // CASE 2: Try growing the existing block in the same row
    const currentRow = previouslySelected[0].row;
    console.log(`Case 2: Trying to grow in row ${currentRow}`);
    
    const allSeatsInCurrentRow = seats.filter(seat => seat.row === currentRow);
    const allSeatsInCurrentRowSorted = allSeatsInCurrentRow.sort((a, b) => a.number - b.number);
    
    console.log(`All seats in current row:`, allSeatsInCurrentRowSorted.map(s => `${s.row}${s.number} (${s.status})`));
    
    // Find the lowest seat number among currently selected seats
    const lowestSelectedSeat = previouslySelected.reduce((min, seat) => 
      seat.number < min.number ? seat : min
    );
    console.log(`Lowest selected seat: ${lowestSelectedSeat.row}${lowestSelectedSeat.number}`);
    
    // Try to find a larger contiguous block that includes the current selection
    const startIndex = allSeatsInCurrentRowSorted.findIndex(seat => seat.number === lowestSelectedSeat.number);
    const grownBlock = findContiguousBlock(allSeatsInCurrentRowSorted, newCount, startIndex);
    if (grownBlock) {
      console.log(`Found grown block in same row:`, grownBlock.map(s => s.id));
      
      // Deselect current seats and select the grown block
      previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'available'));
      grownBlock.forEach(seat => toggleSeatStatus(seat.id, 'selected'));
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
      
      const newBlock = findContiguousBlock(rowSeats, newCount, 0);
      if (newBlock) {
        console.log(`Found new block in ${row}:`, newBlock.map(s => s.id));
        
        // Deselect current seats and select the new block
        previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'available'));
        newBlock.forEach(seat => toggleSeatStatus(seat.id, 'selected'));
        return;
      }
    }
    
    // CASE 4: No valid block found anywhere — reset to 0
    console.log('Case 4: No valid block found, resetting to 0');
    previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'available'));
  };

  // Get movie for current show
  const currentMovie = getMovieForShow(selectedShow) || {
    name: 'KALANK',
    language: 'HINDI',
    screen: 'Screen 1'
  };

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
              <span className="font-bold text-lg mb-1 inline whitespace-nowrap">{`${currentMovie.name} (${currentMovie.language})`}</span>
              <span className="text-sm font-semibold text-blue-600 mb-1">{getShowDetails()[selectedShow]?.label || selectedShow}</span>
              <span className="text-sm mb-2 whitespace-nowrap">{getShowDetails()[selectedShow]?.timing || ''}</span>
              <span className="absolute right-3 bottom-2 text-base font-semibold">{(() => {
                const totalSeats = seats.length;
                const availableSeats = seats.filter(seat => seat.status !== 'booked' && seat.status !== 'bms-booked').length;
                return `${availableSeats}/${totalSeats}`;
              })()}</span>
              {/* Dropdown for show selection */}
              {showDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-[220px] bg-white rounded-xl shadow-lg border z-50 p-2 space-y-2" style={{minWidth: 200}}>
                  {Object.keys(getShowDetails()).map((showKey) => (
                    <div
                      key={showKey}
                      className={`p-3 rounded-lg cursor-pointer flex flex-col border transition-all ${selectedShow === showKey ? 'bg-blue-100 border-blue-400' : 'hover:bg-gray-100 border-transparent'}`}
                      onClick={() => {
                        console.log('Dropdown clicked:', showKey);
                        handleShowSelect(showKey);
                      }}
                    >
                      <span className="font-bold text-base">{getShowDetails()[showKey].label}</span>
                      <span className="text-xs text-gray-600">{getShowDetails()[showKey].timing}</span>
                      <span className="text-xs text-gray-500 mt-1">{(() => {
                        // Show seat stats for this show
                        if (showKey === selectedShow) {
                          const totalSeats = seats.length;
                          const availableSeats = seats.filter(seat => seat.status !== 'booked' && seat.status !== 'bms-booked').length;
                          return `Available: ${availableSeats}/${totalSeats}`;
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
              const available = seats.filter(seat => cls.rows.includes(seat.row) && seat.status !== 'booked' && seat.status !== 'bms-booked').length;
              const sold = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'booked').length;
              const bmsBooked = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'bms-booked').length;
              const selected = selectedSeats.filter(seat => cls.rows.includes(seat.row)).length;
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
                    {bmsBooked > 0 && (
                      <span className="block text-xs text-blue-600 text-left">BMS: {bmsBooked}</span>
                    )}
                    {selected > 0 && (
                      <span className="block text-xs text-green-600 font-semibold text-left">Selected: {selected}</span>
                    )}
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
        
        {/* Success Message - Show when booking was completed */}
        {bookingCompleted && selectedSeats.length === 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Booking Completed Successfully!</h3>
              <p className="text-sm text-green-600 mb-4">
                Your tickets have been printed and saved. You can now start a new booking.
              </p>
              <Button
                onClick={handleResetForNewBooking}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Start New Booking
              </Button>
            </div>
          </div>
        )}
        
        {/* New Booking Button - Show when no seats are selected and no booking was just completed */}
        {!bookingCompleted && selectedSeats.length === 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Ready for New Booking</h3>
              <p className="text-sm text-blue-600 mb-4">
                All seats have been cleared. You can now select new seats for booking.
              </p>
              <Button
                onClick={handleResetForNewBooking}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Start New Booking
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout; 