/* eslint-disable */
import { useState, useEffect, useMemo } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import type { ShowTime } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import ShowSelector from '@/components/ShowSelector';
import { getCurrentShowLabel } from '@/lib/utils';
import TicketPrint from '@/components/TicketPrint';
import { SEAT_CLASSES, SHOW_TIMES, MOVIE_CONFIG, getSeatClassByRow } from '@/lib/config';
import { useSettingsStore } from '@/store/settingsStore';
import { getSeatStatus } from '@/services/api';
// import { toast } from '@/hooks/use-toast';

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

// Remove the local getCurrentShowKey function - use selectedShow from store instead

interface CheckoutProps {
   
  onBookingComplete?: (bookingData: any) => void;
   
  checkoutData?: any;
}

const Checkout: React.FC<CheckoutProps> = ({ onBookingComplete, checkoutData }) => {
  const { seats, selectedShow, setSelectedShow, selectedDate, toggleSeatStatus, loadBookingForDate, initializeSeats, syncSeatStatus } = useBookingStore();
  const { getPriceForClass, getMovieForShow } = useSettingsStore();
  const showTimes = useSettingsStore(state => state.showTimes); // Get show times for dynamic logic
  // Add state for decoupled seat IDs
  const [decoupledSeatIds, setDecoupledSeatIds] = useState<string[]>([]);
  // Add state to track if booking was just completed
  const [bookingCompleted, setBookingCompleted] = useState(false);
  // Add state for show dropdown
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);
  const [showDropdownRef, setShowDropdownRef] = useState<HTMLDivElement | null>(null);

  // Dynamic show details from settings
  const getShowDetails = useMemo(() => {
    try {
      const enabledShowTimes = showTimes.filter(show => show.enabled);
      
      return enabledShowTimes.reduce((acc, show) => {
        acc[show.key] = { 
          label: show.label, 
          timing: `${convertTo12Hour(show.startTime)} - ${convertTo12Hour(show.endTime)}`, 
          price: 150
        };
        return acc;
      }, {} as Record<string, { label: string; timing: string; price: number }>);
    } catch (error) {
      console.log('❌ Error accessing settings store, using fallback');
      // Fallback to static configuration
      return SHOW_TIMES.reduce((acc, show) => {
        acc[show.enumValue] = { 
          label: show.label, 
          timing: show.timing, 
          price: 150
        };
        return acc;
      }, {} as Record<string, { label: string; timing: string; price: number }>);
    }
  }, [showTimes]);

  // Debug: Log the props and store state (only when there are changes)
  useEffect(() => {
    console.log('🔍 Checkout component render:', {
      checkoutDataExists: !!checkoutData,
      checkoutDataSelectedSeats: checkoutData?.selectedSeats?.length || 0,
      storeSeatsLength: seats.length,
      storeSelectedSeats: seats.filter(s => s.status === 'SELECTED').length,
      storeSelectedSeatIds: seats.filter(s => s.status === 'SELECTED').map(s => s.id),
      selectedShow: selectedShow, // Log the selected show from store
      currentTime: new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      })
    });
    
    // Debug: Show what the current show should be
    const currentTime = getCurrentTimeMinutes();
    console.log('🕐 Current time analysis:', {
      currentTime: `${Math.floor(currentTime/60)}:${(currentTime%60).toString().padStart(2, '0')}`,
      currentTimeMinutes: currentTime,
      availableShows: showTimes.map(show => ({
        label: show.label,
        startTime: show.startTime,
        endTime: show.endTime,
        startMinutes: show.startTime.split(':').map(Number).reduce((h, m) => h * 60 + m),
        endMinutes: show.endTime.split(':').map(Number).reduce((h, m) => h * 60 + m),
        isCurrentlyRunning: (() => {
          const [startHour, startMin] = show.startTime.split(':').map(Number);
          const [endHour, endMin] = show.endTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          if (endMinutes < startMinutes) {
            return currentTime >= startMinutes || currentTime < endMinutes;
          } else {
            return currentTime >= startMinutes && currentTime < endMinutes;
          }
        })()
      }))
    });
  }, [checkoutData, seats, selectedShow, showTimes]);

  // Remove the problematic initialization logic - let the store handle show selection
  // The store already has the correct selectedShow value from the main page

  // Handle show dropdown
  const handleShowCardDoubleClick = () => {
    setShowDropdownOpen(!showDropdownOpen);
  };

  const handleShowSelect = (showKey: string) => {
    console.log(`🔄 Checkout: User selected show: ${showKey}`);
    setSelectedShow(showKey as any);
    setShowDropdownOpen(false);
  };

  // Get current time to determine which shows are accessible
  const getCurrentTimeMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  };

  // Check if a show is accessible (current or future)
  const isShowAccessible = (show: any) => {
    const currentTime = getCurrentTimeMinutes();
    const [startHour, startMin] = show.startTime.split(':').map(Number);
    const [endHour, endMin] = show.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Find the next show's start time to determine when this show should become inaccessible
    const currentShowIndex = showTimes.findIndex(s => s.key === show.key);
    const nextShow = showTimes[currentShowIndex + 1];
    let nextShowStartMinutes = null;
    
    if (nextShow) {
      const [nextStartHour, nextStartMin] = nextShow.startTime.split(':').map(Number);
      nextShowStartMinutes = nextStartHour * 60 + nextStartMin;
    }
    
    // A show is accessible if:
    // 1. It's currently running (current time is within the show period)
    // 2. It's a future show (current time is before the show starts)
    // 3. It's not blocked by the next show starting
    
    let isAccessible;
    if (endMinutes < startMinutes) {
      // For overnight shows, check if current time is within the show period OR if it's a future show
      // This handles shows like 21:00 - 12:00 (9 PM to 12 AM next day)
      const isCurrentlyRunning = currentTime >= startMinutes || currentTime < endMinutes;
      const isFutureShow = currentTime < startMinutes;
      const isBlockedByNextShow = nextShowStartMinutes && currentTime >= nextShowStartMinutes;
      
      isAccessible = (isCurrentlyRunning || isFutureShow) && !isBlockedByNextShow;
    } else {
      // For normal shows, check if current time is within the show period OR if it's a future show
      const isCurrentlyRunning = currentTime >= startMinutes && currentTime < endMinutes;
      const isFutureShow = currentTime < startMinutes;
      const isBlockedByNextShow = nextShowStartMinutes && currentTime >= nextShowStartMinutes;
      
      isAccessible = (isCurrentlyRunning || isFutureShow) && !isBlockedByNextShow;
    }
    
    console.log(`🔍 Show accessibility check for ${show.label}:`, {
      show: show.label,
      startTime: show.startTime,
      endTime: show.endTime,
      currentTime: `${Math.floor(currentTime/60)}:${(currentTime%60).toString().padStart(2, '0')}`,
      startMinutes,
      endMinutes,
      nextShow: nextShow?.label || 'none',
      nextShowStartMinutes,
      isAccessible,
      reason: endMinutes < startMinutes ? 'overnight' : 'normal',
      currentTimeMinutes: currentTime,
      calculation: `isCurrentlyRunning: ${currentTime >= startMinutes && currentTime < endMinutes}, isFutureShow: ${currentTime < startMinutes}, isBlockedByNextShow: ${nextShowStartMinutes && currentTime >= nextShowStartMinutes}`,
      selectedShow: selectedShow
    });
    
    return isAccessible;
  };

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdownRef && !showDropdownRef.contains(event.target as Node)) {
        setShowDropdownOpen(false);
      }
    };

    if (showDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdownOpen, showDropdownRef]);

  // Use checkoutData if available, otherwise fall back to global state
  const selectedSeats = useMemo(() => {
    // If we have checkoutData with selected seats, use it
    // Otherwise, use store data (for when seats are selected after checkoutData is set)
    const storeSelectedSeats = seats.filter(seat => seat.status === 'SELECTED');
    
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
        // toast({
        //   title: 'Error',
        //   description: 'Failed to load current seat status.',
        //   variant: 'destructive',
        // });
      }
    };

    fetchCurrentSeatStatus();
  }, [selectedDate, selectedShow, syncSeatStatus]);
  
  // Get reactive show details
  // const SHOW_DETAILS = getShowDetails();
  // const showOptions = Object.keys(SHOW_DETAILS);

  // Handler for show selection
  // const handleShowSelect = (showKey: string) => {
  //   console.log('Show selection changed:', showKey.toUpperCase());
  //   setSelectedShow(showKey.toUpperCase() as ShowTime);
  //   loadBookingForDate(selectedDate, showKey.toUpperCase() as ShowTime);
  // };

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
    console.log('🗑️ Deleting tickets:', seatIds);
    
    if (!seatIds || seatIds.length === 0) {
      console.warn('⚠️ No seat IDs provided for deletion');
      return;
    }
    
    // Deselect all provided seats
    seatIds.forEach(id => {
      console.log(`🗑️ Deselecting seat: ${id}`);
      toggleSeatStatus(id, 'AVAILABLE');
    });
    
    // Remove from decoupled list if present
    setDecoupledSeatIds(prev => prev.filter(id => !seatIds.includes(id)));
    
    // Show success message
    // toast({
    //   title: 'Tickets Deleted',
    //   description: `${seatIds.length} ticket(s) have been removed from your selection.`,
    //   duration: 3000,
    // });
  };

  const handleDecoupleTickets = (seatIds: string[]) => {
    // Add these seat IDs to the decoupled list
    setDecoupledSeatIds(prev => [...prev, ...seatIds]);
  };

  const handleConfirmBooking = () => {
    // Mark selected seats as booked
    selectedSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'BOOKED');
    });
  };

  // Handler for booking complete
  const handleBookingComplete = () => {
    // Mark selected seats as booked first
    selectedSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'BOOKED');
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
      toggleSeatStatus(seat.id, 'AVAILABLE');
    });
    
    // Clear decoupled seat IDs
    setDecoupledSeatIds([]);
    
    // Reset booking completed state
    setBookingCompleted(false);
    
    // Show success message
    // toast({
    //   title: 'Ready for New Booking',
    //   description: 'Checkout has been reset. You can now select new seats.',
    //   duration: 3000,
    // });
  };

  // Helper to get the first valid contiguous block in a class
  function getValidContiguousBlock(seats: any[], classRows: string[]) {
    const classSeats = seats.filter(seat => classRows.includes(seat.row) && seat.status === 'AVAILABLE');
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
    console.log(`🎯 Available seats in ${classKey}:`, seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'AVAILABLE').map(s => s.id));
    
    // Reset booking completed state when new seats are selected
    if (bookingCompleted) {
      setBookingCompleted(false);
    }
    
    // Get currently selected seats in this class
    const previouslySelected = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'SELECTED');
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
          .filter(seat => seat.status === 'AVAILABLE')
          .sort((a, b) => a.number - b.number);
        
        console.log(`Available seats in ${row}:`, rowSeats.map(s => `${s.row}${s.number}`));
        
        const block = findContiguousBlock(rowSeats, newCount, 0);
        if (block) {
          console.log(`Found next available block:`, block.map(s => s.id));
          console.log(`🎯 Marking seats as selected:`, block.map(s => s.id));
          block.forEach(seat => {
            console.log(`🎯 Toggling seat ${seat.id} to selected`);
            toggleSeatStatus(seat.id, 'SELECTED');
          });
          
          // Add a small delay to ensure store updates are processed
          setTimeout(() => {
            console.log('🔍 After delay - Store state:', {
              selectedSeats: seats.filter(s => s.status === 'SELECTED').length,
              selectedSeatIds: seats.filter(s => s.status === 'SELECTED').map(s => s.id)
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
      previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'AVAILABLE'));
      grownBlock.forEach(seat => toggleSeatStatus(seat.id, 'SELECTED'));
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
        .filter(seat => seat.status === 'AVAILABLE')
        .sort((a, b) => a.number - b.number);
      
      console.log(`Available seats in ${row}:`, rowSeats.map(s => `${s.row}${s.number}`));
      
      const newBlock = findContiguousBlock(rowSeats, newCount, 0);
      if (newBlock) {
        console.log(`Found new block in ${row}:`, newBlock.map(s => s.id));
        
        // Deselect current seats and select the new block
        previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'AVAILABLE'));
        newBlock.forEach(seat => toggleSeatStatus(seat.id, 'SELECTED'));
        return;
      }
    }
    
    // CASE 4: No valid block found anywhere — reset to 0
    console.log('Case 4: No valid block found, resetting to 0');
    previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'AVAILABLE'));
  };

  // Get movie for current show
  const currentMovie = getMovieForShow(selectedShow) || {
    name: 'KALANK',
    language: 'HINDI',
    screen: 'Screen 1'
  };

  // Add detailed logging for show card debugging
  const showDetails = getShowDetails; // Use the memoized value directly
  const currentShowDetails = showDetails[selectedShow];
  
  console.log('🔍 Show Card Debug:', {
    selectedShow,
    currentShowDetails,
    allShowDetails: showDetails,
    currentMovie,
    showCardLabel: currentShowDetails?.label || selectedShow,
    showCardTiming: currentShowDetails?.timing || '',
    timeNow: new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    }),
    dateNow: new Date().toLocaleDateString()
  });

  return (
    <div className="w-full h-full flex flex-row gap-x-6 px-6 pt-4 pb-4 items-start">
      <div className="flex-[3] flex flex-col">
        <div className="font-bold text-xl mb-0 ml-0">Checkout Summary</div>
        <div className="mt-4">
          <div className="flex w-full max-w-5xl pt-0">
            {/* Show Box */}
            <div 
              ref={setShowDropdownRef}
              className="relative"
            >
              <div 
                className="flex flex-col border border-gray-200 bg-white w-[250px] min-h-[120px] px-6 py-2 relative select-none rounded-l-xl shadow-md cursor-pointer hover:bg-gray-50"
                onDoubleClick={handleShowCardDoubleClick}
              >
                <div className="font-bold text-base mb-1 leading-tight break-words">{currentMovie.name}</div>
                <div className="text-sm text-gray-600 mb-1">({currentMovie.language})</div>
                <span className="text-sm font-semibold text-blue-600 mb-1">{showDetails[selectedShow]?.label || selectedShow}</span>
                <div className="flex justify-between items-center mt-auto">
                  <span className="text-sm whitespace-nowrap">{showDetails[selectedShow]?.timing || ''}</span>
                  <span className="text-base font-semibold ml-2">{(() => {
                    const totalSeats = seats.length;
                    const availableSeats = seats.filter(seat => seat.status !== 'BOOKED' && seat.status !== 'BMS-BOOKED').length;
                    return `${availableSeats}/${totalSeats}`;
                  })()}</span>
                </div>
              </div>
              
              {/* Show Dropdown */}
              {showDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[800px] max-w-[1000px]">
                  <div className="p-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Select Show</h3>
                    <p className="text-xs text-gray-500">Double-click to select a different show</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-3">
                    {showTimes.map((show) => {
                      const isAccessible = isShowAccessible(show);
                      const isSelected = selectedShow === show.key;
                      
                      return (
                        <div
                          key={show.key}
                          className={`mb-4 last:mb-0 ${
                            !isAccessible ? 'opacity-50' : ''
                          }`}
                        >
                          {/* Show Header */}
                          <div 
                            className={`p-3 rounded-t-lg border ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-300' 
                                : isAccessible 
                                  ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer' 
                                  : 'bg-gray-100 border-gray-300 cursor-not-allowed'
                            }`}
                            onClick={() => isAccessible && handleShowSelect(show.key)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className={`font-medium text-lg ${isSelected ? 'text-blue-700' : isAccessible ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {show.label}
                                </div>
                                <div className={`text-sm ${isSelected ? 'text-blue-600' : isAccessible ? 'text-gray-600' : 'text-gray-400'}`}>
                                  {convertTo12Hour(show.startTime)} - {convertTo12Hour(show.endTime)}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {!isAccessible && (
                                  <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
                                    Past
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                    Current
                                  </span>
                                )}
                                {isAccessible && !isSelected && (
                                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                    Available
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Show Card Row */}
                            <div className="flex w-full">
                              {/* Show Box */}
                              <div className="flex flex-col border border-gray-200 bg-white w-[250px] min-h-[120px] px-6 py-2 relative select-none rounded-l-xl shadow-md">
                                <div className="font-bold text-base mb-1 leading-tight break-words">{getMovieForShow(show.key)?.name || 'KALANK'}</div>
                                <div className="text-sm text-gray-600 mb-1">({getMovieForShow(show.key)?.language || 'HINDI'})</div>
                                <span className="text-sm font-semibold text-blue-600 mb-1">{show.label}</span>
                                <div className="flex justify-between items-center mt-auto">
                                  <span className="text-sm whitespace-nowrap">{convertTo12Hour(show.startTime)} - {convertTo12Hour(show.endTime)}</span>
                                  <span className="text-base font-semibold ml-2">{(() => {
                                    const totalSeats = seats.length;
                                    const availableSeats = seats.filter(seat => seat.status !== 'BOOKED' && seat.status !== 'BMS-BOOKED').length;
                                    return `${availableSeats}/${totalSeats}`;
                                  })()}</span>
                                </div>
                              </div>
                              
                              {/* Class Boxes for this show */}
                              {CLASS_INFO.map((cls, i) => {
                                const total = seats.filter(seat => cls.rows.includes(seat.row)).length;
                                const available = seats.filter(seat => cls.rows.includes(seat.row) && seat.status !== 'BOOKED' && seat.status !== 'BMS-BOOKED').length;
                                const sold = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'BOOKED').length;
                                const bmsBooked = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'BMS-BOOKED').length;
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
                                    className={`flex flex-col justify-between w-[200px] h-[120px] px-6 py-2 relative border border-white shadow-md transition-transform ${isAccessible ? 'hover:-translate-y-1 hover:shadow-lg' : ''} ${colorMap[cls.label as keyof typeof colorMap]} ${cardClass}`}
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* Class Boxes */}
            {CLASS_INFO.map((cls, i) => {
              const total = seats.filter(seat => cls.rows.includes(seat.row)).length;
              const available = seats.filter(seat => cls.rows.includes(seat.row) && seat.status !== 'BOOKED' && seat.status !== 'BMS-BOOKED').length;
              const sold = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'BOOKED').length;
              const bmsBooked = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'BMS-BOOKED').length;
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
            selectedSeats.forEach(seat => toggleSeatStatus(seat.id, 'AVAILABLE'));
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
        
        
      </div>
    </div>
  );
};

export default Checkout;