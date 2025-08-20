/* eslint-disable */
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { usePricing } from '@/hooks/use-pricing';
import { seatsByRow } from '@/lib/seatMatrix';
import type { Show } from '@/types/api';
// import { toast } from '@/hooks/use-toast';

// CLASS_INFO will be created dynamically with current pricing

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
   
  onManualShowSelection?: (showKey: string) => void;
  onClearCheckoutData?: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ onBookingComplete, checkoutData, onManualShowSelection, onClearCheckoutData }) => {
  const { seats, selectedShow, setSelectedShow, selectedDate, toggleSeatStatus, loadBookingForDate, initializeSeats, syncSeatStatus } = useBookingStore();
  const { getPriceForClass, getMovieForShow } = useSettingsStore();
  const showTimes = useSettingsStore(state => state.showTimes); // Get show times for dynamic logic
  const { pricingVersion } = usePricing(); // Add reactive pricing
  
  // CLASS_INFO will be created dynamically with current pricing
  const createClassInfo = useMemo(() => {
    try {
      return SEAT_CLASSES.map(cls => ({
        key: cls.key,
        label: cls.label,
        color: cls.color,
        price: getPriceForClass(cls.label),
        rows: cls.rows
      }));
    } catch {
      console.warn('Settings store not available, using fallback pricing');
      return SEAT_CLASSES.map(cls => ({
        key: cls.key,
        label: cls.label,
        color: cls.color,
        price: 0, // Fallback to 0 if store not available
        rows: cls.rows
      }));
    }
  }, [getPriceForClass, pricingVersion]); // React to pricing changes
  
  // Add state for decoupled seat IDs
  const [decoupledSeatIds, setDecoupledSeatIds] = useState<string[]>([]);
  // Add state to track if booking was just completed
  const [bookingCompleted, setBookingCompleted] = useState(false);
  // Add state for show dropdown
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);
  const [showDropdownRef, setShowDropdownRef] = useState<HTMLDivElement | null>(null);
  
  // Add state for triple-click detection
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);

  // Dynamic show details from settings
  const getShowDetails = useMemo(() => {
    try {
      const enabledShowTimes = showTimes.filter(show => show.enabled);
      
    
      
      return enabledShowTimes.reduce((acc, show) => {
        // The times from settings store are already in 24-hour format, so we need to convert to 12-hour for display
        acc[show.key] = { 
          label: show.label, 
          timing: `${convertTo12Hour(show.startTime)} - ${convertTo12Hour(show.endTime)}`, 
          price: 0 // Not used for actual pricing
        };
        return acc;
      }, {} as Record<string, { label: string; timing: string; price: number }>);
    } catch (error) {
      console.log('❌ Error accessing settings store, using fallback');
      // Fallback to static configuration - these are already in 12-hour format
      return SHOW_TIMES.reduce((acc, show) => {
        acc[show.enumValue] = { 
          label: show.label, 
          timing: show.timing, 
          price: 0 // Not used for actual pricing
        };
        return acc;
      }, {} as Record<string, { label: string; timing: string; price: number }>);
    }
  }, [showTimes]);

  // Debug: Log the props and store state (only when there are changes)
  useEffect(() => {
    // Only log when there are actual changes to avoid spam
    const hasChanges = checkoutData || seats.length > 0 || selectedShow;
    
    // if (hasChanges) {
    //   console.log('🔍 Checkout component render:', {
    //     checkoutDataExists: !!checkoutData,
    //     checkoutDataSelectedSeats: checkoutData?.selectedSeats?.length || 0,
    //     storeSeatsLength: seats.length,
    //     storeSelectedSeats: seats.filter(s => s.status === 'SELECTED').length,
    //     storeSelectedSeatIds: seats.filter(s => s.status === 'SELECTED').map(s => s.id),
    //     selectedShow: selectedShow
    //   });
    // }
    
    // Temporary debug: Add reset button to console (only once)
    if (typeof window !== 'undefined' && !(window as any).resetShowTimes) {
      (window as any).resetShowTimes = resetShowTimesToDefaults;
    }
    
  }, [checkoutData, seats, selectedShow]);

    // Load seats when selected show changes
  useEffect(() => {
    if (selectedShow && selectedDate) {
      // Load seats for the new show
      loadBookingForDate(selectedDate, selectedShow);
      
      // Also fetch current seat status from backend
      const fetchSeatStatus = async () => {
        try {
          const response = await getSeatStatus({ date: selectedDate, show: selectedShow });
          if (response.success && response.data) {
            const { bookedSeats, bmsSeats, selectedSeats } = response.data as any;
            const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
            const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
            const selectedSeatIds = selectedSeats ? selectedSeats.map((seat: any) => seat.seatId) : [];
            syncSeatStatus(bookedSeatIds, bmsSeatIds, selectedSeatIds);
          }
        } catch (error) {
          console.error(`❌ Failed to fetch seat status for ${selectedShow}:`, error);
        }
      };
      
      fetchSeatStatus();
      
      // Don't clear selected seats when show changes - let the backend sync handle it
    }
  }, [selectedShow, selectedDate, loadBookingForDate, syncSeatStatus]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimer) {
        clearTimeout(clickTimer);
      }
    };
  }, [clickTimer]);

  // Remove the problematic initialization logic - let the store handle show selection
  // The store already has the correct selectedShow value from the main page

  // Handle show dropdown
  const handleShowCardDoubleClick = () => {
    setShowDropdownOpen(!showDropdownOpen);
  };

  // Triple-click handler to switch to current time show
  const handleShowCardTripleClick = () => {
    const currentShowKey = getCurrentShowByTime();
    if (currentShowKey !== selectedShow) {
      handleShowSelect(currentShowKey);
    }
  };

  // Click handler that detects single, double, and triple clicks
  const handleShowCardClick = () => {
    setClickCount(prev => {
      const newCount = prev + 1;
      
      // Clear existing timer
      if (clickTimer) {
        clearTimeout(clickTimer);
      }
      
      // Set new timer
      const timer = setTimeout(() => {
        if (newCount === 1) {
          // Single click - do nothing
        } else if (newCount === 2) {
          // Double click - open dropdown
          setShowDropdownOpen(!showDropdownOpen);
        } else if (newCount >= 3) {
          // Triple click or more - switch to current time show
          handleShowCardTripleClick();
        }
        setClickCount(0);
      }, 400); // Increased to 400ms for better detection
      
      setClickTimer(timer);
      return newCount;
    });
  };

  const handleShowSelect = async (showKey: string) => {
  
    
    // Clear all selected seats before switching shows
    const currentSelectedSeats = seats.filter(seat => seat.status === 'SELECTED');
    if (currentSelectedSeats.length > 0) {
      currentSelectedSeats.forEach(seat => {
        toggleSeatStatus(seat.id, 'AVAILABLE');
      });
    }
    
    // Use manual selection handler if available, otherwise use store directly
    if (onManualShowSelection) {
      onManualShowSelection(showKey);
    } else {
      // If no manual selection handler is available, still use the store but log a warning
      console.warn('No manual selection handler available, using direct store update');
      setSelectedShow(showKey as ShowTime);
    }
    setShowDropdownOpen(false);
    
    // Load seats for the new show - use a small delay to ensure state is updated
    setTimeout(async () => {
      try {
        await loadBookingForDate(selectedDate, showKey as ShowTime);
        
        // Also fetch current seat status from backend for this specific show
        try {
          const response = await getSeatStatus({ date: selectedDate, show: showKey as Show });
          
          if (response.success && response.data) {
            const { bookedSeats, bmsSeats } = response.data as any;
            const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
            const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
            
            syncSeatStatus(bookedSeatIds, bmsSeatIds);
          }
        } catch (seatError) {
          console.error(`❌ Failed to fetch seat status for ${showKey}:`, seatError);
        }
      } catch (error) {
        console.error(`❌ Failed to load seats for show ${showKey}:`, error);
      }
    }, 100);
  };

  // Get current time to determine which shows are accessible
  const getCurrentTimeMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  };

  // Function to get the current show based on time
  const getCurrentShowByTime = () => {
    const currentTime = getCurrentTimeMinutes();
    const enabledShowTimes = showTimes.filter(show => show.enabled);
    
    // Sort shows by start time to find the correct order
    const sortedShows = [...enabledShowTimes].sort((a, b) => {
      const [aHour, aMin] = a.startTime.split(':').map(Number);
      const [bHour, bMin] = b.startTime.split(':').map(Number);
      return (aHour * 60 + aMin) - (bHour * 60 + bMin);
    });
    
    // Find which show is currently active
    for (let i = 0; i < sortedShows.length; i++) {
      const show = sortedShows[i];
    const [startHour, startMin] = show.startTime.split(':').map(Number);
    const [endHour, endMin] = show.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
      // Find the next show's start time
      const nextShow = sortedShows[i + 1];
    let nextShowStartMinutes = null;
      if (nextShow) {
        const [nextStartHour, nextStartMin] = nextShow.startTime.split(':').map(Number);
        nextShowStartMinutes = nextStartHour * 60 + nextStartMin;
      }
      
      // Check if current time is within this show's active period
      let isInRange = false;
      if (endMinutes < startMinutes) {
        // Overnight show (e.g., 23:30 - 02:30)
        isInRange = currentTime >= startMinutes || currentTime < endMinutes;
      } else {
        // Normal show
        isInRange = currentTime >= startMinutes && currentTime < endMinutes;
      }
      
      // A show is active if:
      // 1. Current time is within the show's time range, OR
      // 2. Current time is after the show started but before the next show starts
      const isAfterShowStart = currentTime >= startMinutes;
      const isBeforeNextShow = !nextShowStartMinutes || currentTime < nextShowStartMinutes;
      const isActive = isInRange || (isAfterShowStart && isBeforeNextShow);
      
      if (isActive) {
              return show.key;
      }
    }
    
    // If no show is active, find the most recent show that has ended
    for (let i = sortedShows.length - 1; i >= 0; i--) {
      const show = sortedShows[i];
      const [startHour, startMin] = show.startTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      
      if (currentTime >= startMinutes) {
              return show.key;
      }
    }
    
    return 'EVENING'; // fallback
  };

  // Optimized function to check if a show is the current time show
  const isCurrentTimeShow = useCallback((showKey: string) => {
    const currentTime = getCurrentTimeMinutes();
    const show = showTimes.find(s => s.key === showKey);
    
    if (!show || !show.enabled) return false;
    
    const [startHour, startMin] = show.startTime.split(':').map(Number);
    const [endHour, endMin] = show.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Get all enabled shows to find the next show
    const enabledShowTimes = showTimes.filter(s => s.enabled);
    const sortedShows = [...enabledShowTimes].sort((a, b) => {
      const [aHour, aMin] = a.startTime.split(':').map(Number);
      const [bHour, bMin] = b.startTime.split(':').map(Number);
      return (aHour * 60 + aMin) - (bHour * 60 + bMin);
    });
    
    // Find the current show's position and get the next show
    const currentShowIndex = sortedShows.findIndex(s => s.key === showKey);
    const nextShow = sortedShows[currentShowIndex + 1];
    
    let nextShowStartMinutes = null;
    if (nextShow) {
      const [nextStartHour, nextStartMin] = nextShow.startTime.split(':').map(Number);
      nextShowStartMinutes = nextStartHour * 60 + nextStartMin;
    }
    
    // Check if current time falls within this show's active period
    // A show is active if:
    // 1. Current time is within the show's time range, OR
    // 2. Current time is after the show started but before the next show starts
    let isInRange = false;
    if (endMinutes < startMinutes) {
      // Overnight show (e.g., 23:30 - 02:30)
      isInRange = currentTime >= startMinutes || currentTime < endMinutes;
    } else {
      // Normal show
      isInRange = currentTime >= startMinutes && currentTime < endMinutes;
    }
    
    const isAfterShowStart = currentTime >= startMinutes;
    const isBeforeNextShow = !nextShowStartMinutes || currentTime < nextShowStartMinutes;
    const isActive = isInRange || (isAfterShowStart && isBeforeNextShow);
    
    return isActive;
  }, [showTimes, getCurrentTimeMinutes]);

  // Memoize current show status to prevent excessive re-renders
  const currentShowStatus = useMemo(() => {
    const status: Record<string, boolean> = {};
    showTimes.forEach(show => {
      status[show.key] = isCurrentTimeShow(show.key);
    });
    return status;
  }, [showTimes, isCurrentTimeShow]);

  // Function to reset show times to correct defaults (for debugging)
  const resetShowTimesToDefaults = () => {
    const correctShowTimes = [
      { key: 'MORNING', label: 'Morning Show', startTime: '10:00', endTime: '12:00', enabled: true },
      { key: 'MATINEE', label: 'Matinee Show', startTime: '14:00', endTime: '17:00', enabled: true },
      { key: 'EVENING', label: 'Evening Show', startTime: '18:00', endTime: '21:00', enabled: true },
      { key: 'NIGHT', label: 'Night Show', startTime: '21:30', endTime: '00:30', enabled: true }
    ];
    
    // Update the settings store with correct times
    correctShowTimes.forEach(show => {
      useSettingsStore.getState().updateShowTime(show.key, {
        startTime: show.startTime,
        endTime: show.endTime
      });
    });
  };

  // Check if a show is accessible (current or future)
  const isShowAccessible = (show: any) => {
    const currentTime = getCurrentTimeMinutes();
    const [startHour, startMin] = show.startTime.split(':').map(Number);
    const [endHour, endMin] = show.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // A show is accessible if:
    // 1. It's currently running (current time is within the show period)
    // 2. It's a future show (current time is before the show starts)
    
    let isAccessible;
    if (endMinutes < startMinutes) {
      // For overnight shows (e.g., 9:30 PM - 12:30 AM)
      // Check if current time is within the show period OR if it's a future show
      const isCurrentlyRunning = currentTime >= startMinutes || currentTime < endMinutes;
      const isFutureShow = currentTime < startMinutes;
      isAccessible = isCurrentlyRunning || isFutureShow;
    } else {
      // For normal shows
      const isCurrentlyRunning = currentTime >= startMinutes && currentTime < endMinutes;
      const isFutureShow = currentTime < startMinutes;
      isAccessible = isCurrentlyRunning || isFutureShow;
    }
    

    
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

  // Always prioritize store state over checkoutData to ensure deletions work properly
  const selectedSeats = useMemo(() => {
    // Get store selected seats first
    const storeSelectedSeats = seats.filter(seat => seat.status === 'SELECTED');
    
    // Only use checkoutData.selectedSeats if store is completely empty AND we have checkoutData
    // This prevents checkoutData from overriding store state after deletions
    if (storeSelectedSeats.length === 0 && checkoutData?.selectedSeats && checkoutData.selectedSeats.length > 0) {
      console.log('✅ Using selectedSeats from checkoutData (store empty):', checkoutData.selectedSeats.length);
      return checkoutData.selectedSeats;
    }
    
    // Always prefer store state when it has data
    // console.log('🔄 Using selectedSeats from store:', storeSelectedSeats.length);
    return storeSelectedSeats;
  }, [seats, checkoutData, selectedShow]);

  // Reset booking completed state when checkout data is cleared
  useEffect(() => {
    if (!checkoutData && bookingCompleted) {
      setBookingCompleted(false);
    }
  }, [checkoutData, bookingCompleted]);
  

  
  // Get reactive show details
  // const SHOW_DETAILS = getShowDetails();
  // const showOptions = Object.keys(SHOW_DETAILS);

  // Handler for show selection
  // const handleShowSelect = (showKey: string) => {
  //   console.log('Show selection changed:', showKey.toUpperCase());
  //   setSelectedShow(showKey.toUpperCase() as ShowTime);
  //   loadBookingForDate(selectedDate, showKey.toUpperCase() as ShowTime);
  // };

  const classCounts = createClassInfo.map(cls => {
    const count = selectedSeats.filter(seat => cls.rows.includes(seat.row)).length;
    const price = getPriceForClass(cls.label);
    return { ...cls, count, price };
  });
   
  const total = classCounts.reduce((sum, cls: any) => sum + cls.count * cls.price, 0);
  
  // Debug: Log selected seats and total calculation (commented out to reduce console noise)
  useEffect(() => {
    // console.log('🔍 Checkout - Selected Seats Debug:', {
    //   selectedSeatsCount: selectedSeats.length,
    //   selectedSeats: selectedSeats.map(seat => ({
    //     id: seat.id,
    //     row: seat.row,
    //     number: seat.number,
    //     status: seat.status,
    //     class: createClassInfo.find(c => c.rows.includes(seat.row))?.label
    //   })),
    //   classCounts: classCounts.map(cls => ({
    //     label: cls.label,
    //     count: cls.count,
    //     price: cls.price,
    //     total: cls.count * cls.price
    //   })),
    //   total: total
    // });
  }, [selectedSeats, classCounts, total]);

  // Debug logging (only when there are selected seats)
  useEffect(() => {
    if (selectedSeats.length > 0) {
          // console.log('🔍 Debug: Selected seats:', selectedSeats.length);
    // console.log('🔍 Debug: Selected seats details:', selectedSeats.map(s => `${s.id} (${s.status})`));
    // console.log('🔍 Debug: Class counts:', classCounts.map(c => `${c.label}: ${c.count} * ₹${c.price} = ₹${c.count * c.price}`));
    // console.log('🔍 Debug: Total:', total);
    }
  }, [selectedSeats, classCounts, total]);

  // For TicketPrint: map to required format
  const ticketSeats = selectedSeats
    .map(seat => {
      const cls = createClassInfo.find(c => c.rows.includes(seat.row));
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
  const handleDeleteTickets = async (seatIds: string[]) => {
    console.log('🔧 handleDeleteTickets called with seatIds:', seatIds);
    console.log('🔧 selectedSeats before deletion:', selectedSeats);
    
    if (!seatIds || seatIds.length === 0) {
      console.warn('⚠️ No seat IDs provided for deletion');
      return;
    }
    
    try {
      // Prepare seat updates for backend
      const seatUpdates = seatIds.map(seatId => ({
        seatId,
        status: 'AVAILABLE'
      }));
      
      // Update backend first
      const { updateSeatStatus } = await import('@/services/api');
      await updateSeatStatus(seatUpdates, selectedDate, selectedShow);
      
      // Then update frontend state
      seatIds.forEach(id => {
        toggleSeatStatus(id, 'AVAILABLE');
      });
      
      // Remove from decoupled list if present
      setDecoupledSeatIds(prev => prev.filter(id => !seatIds.includes(id)));
      
      // Clear checkoutData to force re-evaluation of selectedSeats
      // This ensures that if we're using checkoutData.selectedSeats, it gets cleared
      if (checkoutData) {
        // Clear the checkoutData by calling the parent's setCheckoutData
        // We need to access the parent's setCheckoutData function
        // For now, let's force a re-render by updating the dependency
        console.log('🔄 Clearing checkoutData after deletion');
      }
      
      console.log('✅ Tickets deleted from database and frontend:', seatIds);
      
      // Show success message
      // toast({
      //   title: 'Tickets Deleted',
      //   description: `${seatIds.length} ticket(s) have been removed from your selection.`,
      //   duration: 3000,
      // });
    } catch (error) {
      console.error('❌ Failed to delete tickets:', error);
      // Revert frontend changes if backend update failed
      seatIds.forEach(id => {
        toggleSeatStatus(id, 'SELECTED');
      });
      
      // toast({
      //   title: 'Delete Failed',
      //   description: 'Failed to delete tickets. Please try again.',
      //   variant: 'destructive',
      //   duration: 5000,
      // });
    }
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

  // Helper function to check if a row has aisles/gaps
  const hasAisles = (row: string) => {
    const seatArray = seatsByRow[row];
    if (!seatArray) return false;
    return seatArray.includes('');
  };

  // Helper function to find the center gap position in a row
  const findCenterGapPosition = (row: string) => {
    const seatArray = seatsByRow[row];
    if (!seatArray) return -1;
    
    // Find all gaps in the row
    const gapIndices = seatArray.reduce((indices, seat, index) => {
      if (seat === '') indices.push(index);
      return indices;
    }, [] as number[]);
    
    if (gapIndices.length === 0) return -1;
    
    // If there's only one gap, return it
    if (gapIndices.length === 1) return gapIndices[0];
    
    // If there are multiple gaps, find the one closest to the center of the row
    const rowCenter = Math.floor(seatArray.length / 2);
    const centerGap = gapIndices.reduce((closest, current) => {
      return Math.abs(current - rowCenter) < Math.abs(closest - rowCenter) ? current : closest;
    }, gapIndices[0]);
    
    return centerGap;
  };

  // Helper function to get center-first seat selection for rows with aisles
  const getCenterFirstSeats = (rowSeats: any[], count: number, row: string) => {
    console.log(`🔍 getCenterFirstSeats called for row ${row}, requesting ${count} seats`);
    
    if (!hasAisles(row)) {
      console.log(`🔍 Row ${row} doesn't have aisles, returning null`);
      return null;
    }
    
    const gapPosition = findCenterGapPosition(row);
    if (gapPosition === -1) {
      console.log(`🔍 No gap position found for row ${row}, returning null`);
      return null;
    }
    
    console.log(`🔍 Gap position for row ${row}: ${gapPosition}`);
    
    // Get available seats sorted by seat number
    const availableSeats = rowSeats.filter(seat => seat.status === 'AVAILABLE').sort((a, b) => a.number - b.number);
    
    console.log(`🔍 Available seats in row ${row}: ${availableSeats.length}`);
    if (availableSeats.length > 0) {
      console.log(`🔍 First available seat: ${availableSeats[0].id}, Last available seat: ${availableSeats[availableSeats.length - 1].id}`);
    }
    
    if (availableSeats.length < count) {
      console.log(`🔍 Not enough available seats (${availableSeats.length}) for requested count (${count}), returning null`);
      return null;
    }
    
    let bestBlock = null;
    let bestScore = -1;
    let candidatesChecked = 0;
    let contiguousCandidates = 0;

    // Try all possible starting positions
    for (let startIndex = 0; startIndex <= availableSeats.length - count; startIndex++) {
      const candidate = availableSeats.slice(startIndex, startIndex + count);
      candidatesChecked++;
      
      // Check if block is contiguous
      const isContiguous = candidate.every((seat, index) => {
        if (index === 0) return true;
        return seat.number === candidate[index - 1].number + 1;
      });

      if (isContiguous) {
        contiguousCandidates++;
        let score = 0;
        
        // Factor 1: Distance to center gap
        const blockCenter = (candidate[0].number + candidate[candidate.length - 1].number) / 2;
        const gapDistance = Math.abs(blockCenter - gapPosition);
        const centerScore = (availableSeats.length - gapDistance) / availableSeats.length * 4;
        score += centerScore;

        // Factor 2: Buffer seats on both sides
        const hasLeftBuffer = startIndex > 0;
        const hasRightBuffer = startIndex + count < availableSeats.length;
        if (hasLeftBuffer) score += 2;
        if (hasRightBuffer) score += 2;

        // Factor 3: Avoid breaking potential family blocks
        const remainingLeft = availableSeats.slice(0, startIndex);
        const remainingRight = availableSeats.slice(startIndex + count);
        if (remainingLeft.length >= 3) score += 1;
        if (remainingRight.length >= 3) score += 1;

        console.log(`🔍 Candidate at index ${startIndex}: score=${score.toFixed(2)}, blockCenter=${blockCenter}, gapDistance=${gapDistance.toFixed(2)}, centerScore=${centerScore.toFixed(2)}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestBlock = candidate;
          console.log(`🔍 New best block found at index ${startIndex} with score ${score.toFixed(2)}`);
        }
      }
    }
    
    console.log(`🔍 Checked ${candidatesChecked} candidates, found ${contiguousCandidates} contiguous blocks`);
    if (bestBlock) {
      console.log(`🔍 Best block found with score ${bestScore.toFixed(2)}: ${bestBlock.map(s => s.id).join(', ')}`);
    } else {
      console.log(`🔍 No suitable block found in row ${row}`);
    }
    
    return bestBlock;
  };

  // Helper function to find the best contiguous block for family seating
  const findContiguousBlock = (rowSeats: any[], count: number, startFromIndex: number = 0) => {
    console.log(`🔍 findContiguousBlock called, requesting ${count} seats, starting from index ${startFromIndex}`);
    
    if (rowSeats.length < count) {
      console.log(`🔍 Not enough seats in row (${rowSeats.length}) for requested count (${count}), returning null`);
      return null;
    }
    
    let bestBlock = null;
    let bestScore = -1;
    let candidatesChecked = 0;
    let contiguousCandidates = 0;

    // Try all possible starting positions from startFromIndex
    for (let i = startFromIndex; i <= rowSeats.length - count; i++) {
      const candidate = rowSeats.slice(i, i + count);
      candidatesChecked++;
      
      // Check if block is contiguous
      const isContiguous = candidate.every((s: any, j: number) => {
        if (j === 0) return true;
        return s.number === candidate[j - 1].number + 1;
      });

      if (isContiguous) {
        contiguousCandidates++;
        // Score the block based on multiple factors
        let score = 0;
        
        // Factor 1: Buffer seats - prefer blocks with empty seats on both sides
        const hasLeftBuffer = i > 0;
        const hasRightBuffer = i + count < rowSeats.length;
        if (hasLeftBuffer) score += 2;
        if (hasRightBuffer) score += 2;

        // Factor 2: Center alignment - prefer blocks closer to center
        const rowCenter = Math.floor(rowSeats.length / 2);
        const blockCenter = i + Math.floor(count / 2);
        const centerDistance = Math.abs(blockCenter - rowCenter);
        const centerScore = (rowSeats.length - centerDistance) / rowSeats.length * 3;
        score += centerScore;

        // Factor 3: Prefer blocks that don't break up other potential family blocks
        const remainingLeft = rowSeats.slice(0, i);
        const remainingRight = rowSeats.slice(i + count);
        if (remainingLeft.length >= 3) score += 1;
        if (remainingRight.length >= 3) score += 1;

        console.log(`🔍 Candidate at index ${i}: score=${score.toFixed(2)}, blockCenter=${blockCenter}, centerDistance=${centerDistance}, centerScore=${centerScore.toFixed(2)}`);
        
        if (score > bestScore) {
          bestScore = score;
          bestBlock = candidate;
          console.log(`🔍 New best block found at index ${i} with score ${score.toFixed(2)}`);
        }
      }
    }
    
    console.log(`🔍 Checked ${candidatesChecked} candidates, found ${contiguousCandidates} contiguous blocks`);
    if (bestBlock) {
      console.log(`🔍 Best block found with score ${bestScore.toFixed(2)}: ${bestBlock.map(s => s.id).join(', ')}`);
    } else {
      console.log(`🔍 No suitable block found`);
    }
    
    return bestBlock;
  };

  // Handler for class card click - select contiguous seats with center-first strategy for aisled rows
  const handleClassCardClick = (cls: any) => {
    const classKey = cls.key || cls.label;
    
    // Reset booking completed state when new seats are selected
    if (bookingCompleted) {
      setBookingCompleted(false);
    }
    
    // Get currently selected seats in this class
    const previouslySelected = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'SELECTED');
    const currentCount = previouslySelected.length;
    const newCount = currentCount + 1;
    
    // Debug: Log the current state before selection
    console.log('🔍 handleClassCardClick - Starting selection process:', {
      classKey,
      previouslySelected: previouslySelected.length,
      currentCount,
      newCount
    });
    
    // CASE 1: Nothing selected yet — find next available block
    if (previouslySelected.length === 0) {
      console.log('🔍 Case 1: Nothing selected yet - finding first block');
      // Try to find N contiguous seats using center-first strategy for aisled rows
      for (const row of cls.rows) {
        const allSeatsInRow = seats.filter(seat => seat.row === row);
        const rowSeats = allSeatsInRow
          .filter(seat => seat.status === 'AVAILABLE')
          .sort((a, b) => a.number - b.number);
        
        console.log(`🔍 Checking row ${row}: ${rowSeats.length} available seats`);
        
        let block = null;
        
        // Check if this row has aisles - use center-first strategy
        if (hasAisles(row)) {
          console.log(`🔍 Row ${row} has aisles - using center-first strategy`);
          block = getCenterFirstSeats(rowSeats, newCount, row);
        } else {
          // No aisles - use normal left-to-right strategy
          console.log(`🔍 Row ${row} has no aisles - using left-to-right strategy`);
          block = findContiguousBlock(rowSeats, newCount, 0);
        }
        
        if (block) {
          console.log(`🔍 Found block in row ${row}:`, block.map(s => s.id));
          block.forEach(seat => {
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
        } else {
          console.log(`🔍 No suitable block found in row ${row}`);
        }
      }
      
      console.log('🔍 No block found in any row');
      return;
    }
    
    // CASE 2: Try growing the existing block in the same row (keep families together)
    console.log('🔍 Case 2: Growing existing block in the same row');
    const currentRow = previouslySelected[0].row;
    
    const allSeatsInCurrentRow = seats.filter(seat => seat.row === currentRow);
    const availableSeatsInCurrentRow = allSeatsInCurrentRow
      .filter(seat => seat.status === 'AVAILABLE' || seat.status === 'SELECTED')
      .sort((a, b) => a.number - b.number);
    
    console.log(`🔍 Current row ${currentRow}: ${availableSeatsInCurrentRow.length} available+selected seats`);
    
    // Find the lowest and highest seat numbers among currently selected seats
    const lowestSelectedSeat = previouslySelected.reduce((min, seat) => 
      seat.number < min.number ? seat : min, previouslySelected[0]
    );
    
    const highestSelectedSeat = previouslySelected.reduce((max, seat) => 
      seat.number > max.number ? seat : max, previouslySelected[0]
    );
    
    console.log(`🔍 Current selection range: ${lowestSelectedSeat.number} to ${highestSelectedSeat.number}`);
    
    let grownBlock = null;
    
    // Always try to grow contiguously in the same block (do not split across aisles)
    // Only if not possible, then try to move to another row
    if (hasAisles(currentRow)) {
      // Only allow growing if the new selection is still contiguous and does not cross the aisle
      // Find the contiguous block containing all previously selected seats
      const seatArray = seatsByRow[currentRow];
      const selectedNumbers = previouslySelected.map(seat => seat.number);
      const minNum = Math.min(...selectedNumbers);
      const maxNum = Math.max(...selectedNumbers);
      // Find the indices in seatArray for minNum and maxNum
      const minIdx = seatArray.findIndex(n => n === minNum);
      const maxIdx = seatArray.findIndex(n => n === maxNum);
      // Check if there is an aisle (empty string) between minIdx and maxIdx
      const hasAisleBetween = seatArray.slice(minIdx, maxIdx + 1).includes("");
      if (!hasAisleBetween) {
        // Try to grow left or right without crossing the aisle
        const leftIdx = minIdx > 0 && seatArray[minIdx - 1] !== '' ? minIdx - 1 : null;
        const rightIdx = maxIdx < seatArray.length - 1 && seatArray[maxIdx + 1] !== '' ? maxIdx + 1 : null;
        let candidateNumbers = [...selectedNumbers];
        if (leftIdx !== null && !selectedNumbers.includes(seatArray[leftIdx])) {
          candidateNumbers = [seatArray[leftIdx], ...candidateNumbers];
        } else if (rightIdx !== null && !selectedNumbers.includes(seatArray[rightIdx])) {
          candidateNumbers = [...candidateNumbers, seatArray[rightIdx]];
        }
        // Check if all candidateNumbers are available or selected
        const candidateSeats = allSeatsInCurrentRow.filter(seat => candidateNumbers.includes(seat.number) && (seat.status === 'AVAILABLE' || seat.status === 'SELECTED'));
        if (candidateSeats.length === candidateNumbers.length) {
          grownBlock = candidateSeats;
        }
      }
    } else {
      // No aisles - use normal left-to-right strategy
      const startIndex = availableSeatsInCurrentRow.findIndex(seat => seat.number === lowestSelectedSeat.number);
      grownBlock = findContiguousBlock(availableSeatsInCurrentRow, newCount, startIndex);
    }
    
    if (grownBlock && grownBlock.length === newCount) {
      previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'AVAILABLE'));
      grownBlock.forEach(seat => toggleSeatStatus(seat.id, 'SELECTED'));
      return;
    } else {
      console.log(`🔍 Could not grow block in row ${currentRow}`);
    }
    
    // CASE 3: Cannot grow in same row — find new block in next available row
    console.log('🔍 Case 3: Finding new block in next available row');
    // Find the next row after current row
    const currentRowIndex = cls.rows.indexOf(currentRow);
    const nextRows = cls.rows.slice(currentRowIndex + 1);
    
    console.log(`🔍 Checking ${nextRows.length} rows after current row ${currentRow}`);
    
    for (const row of nextRows) {
      const allSeatsInRow = seats.filter(seat => seat.row === row);
      const rowSeats = allSeatsInRow
        .filter(seat => seat.status === 'AVAILABLE')
        .sort((a, b) => a.number - b.number);
      
      console.log(`🔍 Checking row ${row}: ${rowSeats.length} available seats`);
      
      let newBlock = null;
      
      // Check if this row has aisles - use center-first strategy
      if (hasAisles(row)) {
        console.log(`🔍 Row ${row} has aisles - using center-first strategy`);
        newBlock = getCenterFirstSeats(rowSeats, newCount, row);
      } else {
        // No aisles - use normal left-to-right strategy
        console.log(`🔍 Row ${row} has no aisles - using left-to-right strategy`);
        newBlock = findContiguousBlock(rowSeats, newCount, 0);
      }
      
      if (newBlock) {
        console.log(`🔍 Found new block in row ${row}:`, newBlock.map(s => s.id));
        // Deselect current seats and select the new block (families stay together)
        previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'AVAILABLE'));
        newBlock.forEach(seat => toggleSeatStatus(seat.id, 'SELECTED'));
        return;
      } else {
        console.log(`🔍 No suitable block found in row ${row}`);
      }
    }
    
    // CASE 4: No valid block found anywhere — reset to 0
    console.log('🔍 Case 4: No valid block found anywhere - resetting selection');
    // This ensures families don't get split apart if no suitable block is available
    previouslySelected.forEach(seat => toggleSeatStatus(seat.id, 'AVAILABLE'));
    console.log('🔍 All previously selected seats have been deselected')
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
  


  return (
    <div className="w-full h-full flex flex-row gap-x-6 px-6 pt-4 pb-4 items-start">

      
      <div className="flex-[3] flex flex-col mt-8">
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
                onClick={handleShowCardClick}
              >
                <div className="font-bold text-base mb-1 leading-tight break-words">{currentMovie.name}</div>
                <div className="text-sm text-gray-600 mb-1">({currentMovie.language})</div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-blue-600">{showDetails[selectedShow]?.label || selectedShow}</span>
                  {currentShowStatus[selectedShow] && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      Current Time
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-auto">
                  <span className="text-sm whitespace-nowrap">{showDetails[selectedShow]?.timing || ''}</span>
                  <span className="text-base font-semibold ml-2">{(() => {
                    const totalSeats = seats.length;
                    const availableSeats = seats.filter(seat => seat.status !== 'BOOKED' && seat.status !== 'BMS_BOOKED').length;
                    return `${availableSeats}/${totalSeats}`;
                  })()}</span>
                </div>
              </div>
              
              {/* Show Dropdown */}
              {showDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[800px] max-w-[1000px]">
                  <div className="p-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Select Show</h3>
                    <p className="text-xs text-gray-500">Double-click to select a different show • Triple-click to jump to current time show</p>
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
                            onClick={() => {
                              if (isAccessible) {
                                handleShowSelect(show.key);
                              }
                            }}
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
                                    Selected
                                  </span>
                                )}
                                {currentShowStatus[show.key] && (
                                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                    Current Time
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
                                    const availableSeats = seats.filter(seat => seat.status !== 'BOOKED' && seat.status !== 'BMS_BOOKED').length;
                                    return `${availableSeats}/${totalSeats}`;
                                  })()}</span>
                                </div>
                              </div>
                              
                              {/* Class Boxes for this show */}
                              {createClassInfo.map((cls, i) => {
                                const total = seats.filter(seat => cls.rows.includes(seat.row)).length;
                                const available = seats.filter(seat => cls.rows.includes(seat.row) && seat.status !== 'BOOKED' && seat.status !== 'BMS_BOOKED').length;
                                const sold = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'BOOKED').length;
                                const bmsBooked = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'BMS_BOOKED').length;
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
                                else if (i === createClassInfo.length - 1) cardClass = 'rounded-r-xl -ml-2';
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
            {createClassInfo.map((cls, i) => {
              const total = seats.filter(seat => cls.rows.includes(seat.row)).length;
              const available = seats.filter(seat => cls.rows.includes(seat.row) && seat.status !== 'BOOKED' && seat.status !== 'BMS_BOOKED').length;
              const sold = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'BOOKED').length;
              const bmsBooked = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'BMS_BOOKED').length;
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
              else if (i === createClassInfo.length - 1) cardClass = 'rounded-r-xl -ml-2';
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
          onReset={async () => {
            try {
              // Prepare seat updates for backend
              const seatUpdates = selectedSeats.map(seat => ({
                seatId: seat.id,
                status: 'AVAILABLE'
              }));
              
              // Update backend first
              const { updateSeatStatus } = await import('@/services/api');
              await updateSeatStatus(seatUpdates, selectedDate, selectedShow);
              
              // Then update frontend state
              selectedSeats.forEach(seat => toggleSeatStatus(seat.id, 'AVAILABLE'));
              setDecoupledSeatIds([]);
              
              // Clear checkoutData to force re-evaluation of selectedSeats
              if (onClearCheckoutData) {
                onClearCheckoutData();
                console.log('🔄 checkoutData cleared');
              }
              
              console.log('✅ All tickets reset from database and frontend:', selectedSeats.length);
              
              // Force refresh the seat status to ensure sync
              setTimeout(async () => {
                try {
                  const { getSeatStatus } = await import('@/services/api');
                  const response = await getSeatStatus({ date: selectedDate, show: selectedShow });
                  if (response.success && response.data) {
                    const { bookedSeats, bmsSeats, selectedSeats: backendSelectedSeats } = response.data as any;
                    const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
                    const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
                    const selectedSeatIds = backendSelectedSeats ? backendSelectedSeats.map((seat: any) => seat.seatId) : [];
                    syncSeatStatus(bookedSeatIds, bmsSeatIds, selectedSeatIds);
                    console.log('🔄 Seat status refreshed after reset');
                  }
                } catch (error) {
                  console.error('❌ Failed to refresh seat status after reset:', error);
                }
              }, 100);
              
            } catch (error) {
              console.error('❌ Failed to reset tickets:', error);
              // Don't revert frontend changes if backend update failed - let user try again
            }
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