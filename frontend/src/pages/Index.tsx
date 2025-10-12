import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useBookingStore, ShowTime } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Clock, Calendar, History, Download, Settings as SettingsIcon, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { getCurrentShowLabel } from '@/lib/utils';
import SeatGrid from '@/components/SeatGrid';
import Checkout from '@/pages/Checkout';
import DateSelector from '@/components/DateSelector';
import { getTheaterConfig } from '@/config/theaterConfig';
import { getShowKeyFromNow, getShowLabelByKey, formatTo12Hour, parse12HourToMinutes } from '@/lib/time';
import ShowSelector from '@/components/ShowSelector';

// Lazy load heavy components
const BookingHistory = lazy(() => import('@/components/BookingHistory'));
const BoxVsOnlineReport = lazy(() => import('@/components/BoxVsOnlineReport'));
const Settings = lazy(() => import('@/components/Settings'));
const BookingConfirmation = lazy(() => import('@/components/BookingConfirmation'));
import { getSeatClassByRow } from '@/lib/config';
import { createBooking } from '@/services/api';

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
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { toast } from '@/hooks/use-toast';

const sidebarItems = [
  { id: 'booking', label: 'Seat Booking', icon: Calendar },
  { id: 'history', label: 'Booking History', icon: History },
  { id: 'reports', label: 'Reports', icon: Download },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },

];

interface IndexProps {
  onLogout?: () => void;
}

const Index: React.FC<IndexProps> = ({ onLogout }) => {
  const { selectedDate, selectedShow, setSelectedShow, seats, toggleSeatStatus, initializeSeats } = useBookingStore();
  const { getShowTimes, getPriceForClass } = useSettingsStore();
  const showTimes = useSettingsStore(state => state.showTimes); // Get all show times for dependency
  const [activeView, setActiveView] = useState<'booking' | 'checkout' | 'confirmation' | 'history' | 'reports' | 'settings'>('checkout');
  const [collapsed, setCollapsed] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [bookingId, setBookingId] = useState<string>('');
  const [decoupledSeatIds, setDecoupledSeatIds] = useState<string[]>([]);
  const [isExchangeMode, setIsExchangeMode] = useState(false);
  
  // Add state to track if this is the first app load
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  // State to track if user has manually selected a show
  const [userManuallySelectedShow, setUserManuallySelectedShow] = useState(false);
  
  // State to track the previous current show (for detecting show transitions)
  const [previousCurrentShow, setPreviousCurrentShow] = useState<string | null>(null);

  // Custom hook to get current show label dynamically
  const getCurrentShowLabelDynamic = useCallback(() => {
    try {
      console.log('[SHOW] getCurrentShowLabelDynamic called');
      console.log('[SHOW] showTimes from store:', showTimes);
      
      const enabledShowTimes = showTimes.filter(show => show.enabled);
      console.log('[SHOW] enabledShowTimes:', enabledShowTimes);
      
      if (enabledShowTimes.length === 0) {
        console.log('[SHOW] No enabled shows found');
        return 'No shows available';
      }
      
      const key = getShowKeyFromNow(enabledShowTimes as any);
      console.log('[SHOW] getShowKeyFromNow returned key:', key);
      
      const label = key ? getShowLabelByKey(enabledShowTimes as any, key) : enabledShowTimes[0].label;
      console.log('[SHOW] Final label returned:', label);
      
      return label;
    } catch (error) {
      console.log('[ERROR] Error in getCurrentShowLabelDynamic, using fallback:', error);
      return getCurrentShowLabel();
    }
  }, [showTimes]);

  // Smart timer system - immediately updates store and schedules future transitions
  useEffect(() => {
    console.log('[TIMER] Smart timer effect triggered - showTimes:', showTimes.length, 'userManuallySelectedShow:', userManuallySelectedShow);
    
    const scheduleNextTransition = () => {
      const now = new Date();
      const enabledShowTimes = showTimes.filter(show => show.enabled);
      
      if (enabledShowTimes.length === 0) {
        console.log('[TIMER] No enabled shows found');
        return;
      }
      
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      
      console.log('[TIMER] Current time:', now.toLocaleTimeString(), 'minutes:', nowMinutes);
      
      // FIRST: Check if current show differs from stored show and update immediately
      const currentShow = getCurrentShowKey();
      const storedShow = useBookingStore.getState().selectedShow;
      
      console.log('[SHOW] Current show check:', { currentShow, storedShow, userManuallySelectedShow });
      
      if (currentShow && currentShow !== storedShow && !userManuallySelectedShow) {
        console.log(`[SHOW] IMMEDIATE UPDATE: Current show ${currentShow} differs from stored ${storedShow}, updating now!`);
        setSelectedShow(currentShow as any);
        
        // Navigate to seat grid to refresh data
        console.log('[NAV] Navigating to seat grid to refresh data for current show...');
        setActiveView('booking');
        setIsExchangeMode(true);
        
        setTimeout(() => {
          console.log('[NAV] Auto-navigating back to checkout after seat data load...');
          setIsExchangeMode(false);
          setActiveView('checkout');
        }, 1000);
      }
      
      // THEN: Find the next show transition time
      let nextTransitionTime = null;
      let nextTransitionShow = null;
      
      for (const show of enabledShowTimes) {
        // Use existing utility function for time parsing
        const startMinutes = parse12HourToMinutes(show.startTime);
        
        console.log(`[TIMER] Checking show ${show.key}: starts at ${show.startTime} (${startMinutes} minutes)`);
        
        // If show hasn't started yet, it's a future transition
        if (startMinutes > nowMinutes) {
          if (!nextTransitionTime || startMinutes < nextTransitionTime) {
            nextTransitionTime = startMinutes;
            nextTransitionShow = show.key;
            console.log(`[TIMER] Found future transition: ${show.key} at ${show.startTime}`);
          }
        }
      }
      
      if (nextTransitionTime) {
        // Calculate milliseconds until next transition
        const msUntilTransition = (nextTransitionTime - nowMinutes) * 60 * 1000;
        
        console.log(`[TIMER] Next transition: ${nextTransitionShow} in ${Math.round(msUntilTransition / 1000)}s (${Math.round(msUntilTransition / 1000 / 60)} minutes)`);
        
        // Set single timer for exact transition moment
        const timerId = setTimeout(() => {
          console.log(`[TIMER] Transition time reached for ${nextTransitionShow}`);
          
          // Directly trigger the transition logic instead of relying on state update
          if (!userManuallySelectedShow) {
            console.log(`[SHOW] Auto-updating show to: ${nextTransitionShow}`);
            setSelectedShow(nextTransitionShow as any);
            
            // Navigate to seat grid to refresh seat data for the new show
            console.log('[NAV] Navigating to seat grid to load fresh data for new show...');
            setActiveView('booking');
            setIsExchangeMode(true);
            
            // After a short delay, navigate back to checkout
            setTimeout(() => {
              console.log('[NAV] Auto-navigating back to checkout after seat data load...');
              setIsExchangeMode(false);
              setActiveView('checkout');
            }, 1000); // 1 second delay
          } else {
            console.log('[SHOW] Skipping auto-update: user manually selected show');
          }
          
          setCurrentTime(new Date()); // Update time state for other components
          scheduleNextTransition(); // Schedule the next one
        }, msUntilTransition);
        
        // Return cleanup function
        return () => {
          console.log('[TIMER] Cleaning up smart timer');
          clearTimeout(timerId);
        };
      } else {
        // No more transitions today, check again in 1 hour
        console.log('[TIMER] No more transitions today, checking again in 1 hour');
        const timerId = setTimeout(() => {
          console.log('[TIMER] Hourly check - updating time and rescheduling');
          setCurrentTime(new Date());
          scheduleNextTransition();
        }, 60 * 60 * 1000);
        
        return () => {
          console.log('[TIMER] Cleaning up hourly timer');
          clearTimeout(timerId);
        };
      }
    };
    
    const cleanup = scheduleNextTransition();
    return cleanup;
  }, [showTimes, userManuallySelectedShow, setSelectedShow]);

  // ✅ AUTO-NAVIGATE TO SEAT GRID ON FIRST LOAD - Trigger seat data loading
  useEffect(() => {
    if (isFirstLoad) {
      console.log('[NAV] First app load detected - auto-navigating to seat grid to load data...');
      
      // Navigate to seat grid to trigger seat data loading
      setActiveView('booking');
      setIsExchangeMode(true);
      
      // After a short delay, navigate back to checkout
      setTimeout(() => {
        console.log('[NAV] Auto-navigating back to checkout after seat data load...');
        setIsExchangeMode(false);
        setActiveView('checkout');
        setIsFirstLoad(false); // Mark as no longer first load
      }, 1000); // 1 second delay
    }
  }, [isFirstLoad]);


  // Helper: get current show key based on time (same logic as header)
  const getCurrentShowKey = useCallback(() => {
    try {
      const enabledShowTimes = showTimes.filter(show => show.enabled);
      if (enabledShowTimes.length === 0) {
        console.log('[SHOW] No shows available in settings, using fallback: EVENING');
        return 'EVENING';
      }
      // Use the same utility used by header subtitle
      const key = getShowKeyFromNow(enabledShowTimes as any);
      return key || enabledShowTimes[0].key || 'EVENING';
    } catch (error) {
      console.error('[ERROR] Error in getCurrentShowKey:', error);
      return 'EVENING';
    }
  }, [showTimes, currentTime]);

  // Handler for manual show selection
  const handleManualShowSelection = useCallback((showKey: string) => {
    console.log(`[SHOW] Manual show selection: ${showKey}`);
    console.log('[SHOW] Setting userManuallySelectedShow to true');
    setUserManuallySelectedShow(true);
    console.log('[SHOW] Calling setSelectedShow with:', showKey);
    setSelectedShow(showKey as ShowTime);
    
    // Navigate to seat grid to refresh seat data for the new show (same as auto transition)
    console.log('[NAV] Manual show selection - navigating to seat grid to load fresh data...');
    setActiveView('booking');
    setIsExchangeMode(true);
    
    // After a short delay, navigate back to checkout
    setTimeout(() => {
      console.log('[NAV] Manual show selection - auto-navigating back to checkout after seat data load...');
      setIsExchangeMode(false);
      setActiveView('checkout');
    }, 1000); // 1 second delay
    
    setTimeout(() => {
      console.log('[SHOW] Resetting manual selection flag after 10 minutes');
      setUserManuallySelectedShow(false);
    }, 10 * 60 * 1000); // 10 minutes
  }, [setSelectedShow]);

  // Dynamic show selection based on current time and settings store
  // Only auto-updates ONCE when the show actually transitions (not every minute)
  useEffect(() => {
    // Get the current show based on time and settings store (same as header)
    const currentShowKey = getCurrentShowKey();
    
    console.log('[SHOW] Show transition check:', {
      currentShowKey,
      previousCurrentShow,
      userManuallySelectedShow,
      currentTime: currentTime.toLocaleTimeString()
    });
    
    // Only update if the CURRENT SHOW has CHANGED from the previous current show
    // This ensures we only auto-update ONCE when the show transitions
    if (currentShowKey !== previousCurrentShow && previousCurrentShow !== null) {
      console.log(`[SHOW] Show transition detected: ${previousCurrentShow} -> ${currentShowKey}`);
      
      // Don't auto-update if user has manually selected a show
      if (!userManuallySelectedShow) {
        console.log(`[SHOW] Auto-updating show to: ${currentShowKey}`);
      setSelectedShow(currentShowKey as ShowTime);
        
        // Navigate to seat grid to refresh seat data for the new show
        console.log('[NAV] Navigating to seat grid to load fresh data for new show...');
        setActiveView('booking');
        setIsExchangeMode(true);
        
        // After a short delay, navigate back to checkout
        setTimeout(() => {
          console.log('[NAV] Auto-navigating back to checkout after seat data load...');
          setIsExchangeMode(false);
          setActiveView('checkout');
        }, 1000); // 1 second delay
    } else {
        console.log('[SHOW] Skipping auto-update: user manually selected show');
      }
      
      // Update the previous current show tracker
      setPreviousCurrentShow(currentShowKey);
    } else if (previousCurrentShow === null) {
      // Initialize the tracker on first run (don't trigger navigation on initial load)
      console.log(`[SHOW] Initializing current show tracker: ${currentShowKey}`);
      setPreviousCurrentShow(currentShowKey);
    }
  }, [currentTime, showTimes, getCurrentShowKey, userManuallySelectedShow, previousCurrentShow, setSelectedShow]); // Depend on showTimes to re-run when settings change

  // Reset manual selection flag when navigating away from checkout
  // REMOVED: This was causing the flag to reset immediately when navigating between views
  // The flag should only reset after the 10-minute timeout or when manually reset

  // Manual test function to debug dynamic show selection
  const testDynamicShowSelection = () => {
    const currentShowKey = getCurrentShowKey();
    console.log('[TEST] Test function called');
    console.log('Current show key:', currentShowKey);
    console.log('Selected show:', selectedShow);
    console.log('User manually selected:', userManuallySelectedShow);
    console.log('Current time:', currentTime.toLocaleTimeString());
  };

  // Add debug functions to window for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testShowSelection = testDynamicShowSelection;
      (window as any).resetManualSelection = () => {
        console.log('🔄 Manually resetting selection flag');
        setUserManuallySelectedShow(false);
      };
      (window as any).setManualSelection = () => {
        console.log('🎯 Manually setting selection flag');
        setUserManuallySelectedShow(true);
      };
    }
  }, [testDynamicShowSelection]);

  // Function to refresh seat status
  const refreshSeatStatus = useCallback(async () => {
    try {
      const { getSeatStatus } = await import('@/services/api');
      const response = await getSeatStatus({ date: selectedDate, show: selectedShow });
      
      if (response.success && response.data) {
        const { bookedSeats, bmsSeats, selectedSeats } = response.data as any;
        const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
        const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
        const selectedSeatIds = selectedSeats ? selectedSeats.map((seat: any) => seat.seatId) : [];
        
        // Use the syncSeatStatus function from the store
        const { syncSeatStatus } = useBookingStore.getState();
        syncSeatStatus(bookedSeatIds, bmsSeatIds, selectedSeatIds);
        
        console.log('✅ Seat status refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to refresh seat status:', error);
    }
  }, [selectedDate, selectedShow]);

  // Function to deselect seats
  const deselectSeats = useCallback((seatsToDeselect: any[]) => {
    const toggleSeatStatus = useBookingStore.getState().toggleSeatStatus;
    seatsToDeselect.forEach(seat => {
      toggleSeatStatus(seat.id, 'AVAILABLE');
    });
    
    // Update checkout data by removing the deselected seats
    if (checkoutData) {
      const updatedSelectedSeats = checkoutData.selectedSeats.filter(
        seat => !seatsToDeselect.some(deselected => deselected.id === seat.id)
      );
      
      // Recalculate total amount
      const totalAmount = updatedSelectedSeats.reduce((total, seat) => {
        const seatClass = getSeatClassByRow(seat.row);
        const price = seatClass ? getPriceForClass(seatClass.label) : 0;
        return total + price;
      }, 0);
      
      setCheckoutData({
        ...checkoutData,
        selectedSeats: updatedSelectedSeats,
        totalAmount
      });
    }
  }, [checkoutData, getPriceForClass]);

  // Function to decouple tickets (remove grouped and add back as individual)
  const decoupleTickets = useCallback(async (seatsToDecouple: any[]) => {
    const toggleSeatStatus = useBookingStore.getState().toggleSeatStatus;
    // Set all to available
    seatsToDecouple.forEach(seat => {
      toggleSeatStatus(seat.id, 'AVAILABLE');
    });
    // Wait for state to update
    await new Promise(res => setTimeout(res, 50));
    // Set all to booked (individually)
    seatsToDecouple.forEach(seat => {
      toggleSeatStatus(seat.id, 'BOOKED');
    });
    // Add these seat IDs to decoupledSeatIds
    setDecoupledSeatIds(prev => [...prev, ...seatsToDecouple.map(seat => seat.id)]);
  }, []);

  // Floating Reset Button handler
  const handleResetSeats = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all seats to available? This action cannot be undone.')) {
      initializeSeats();
      // toast({
      //   title: 'Seats Reset',
      //   description: 'All seats have been reset to available.',
      // });
    }
  }, [initializeSeats]);

  // Handle booking completion
  const handleBookingComplete = async (bookingData: any) => {
    try {
      // Save booking to database via API
       const { getPriceForClass } = useSettingsStore.getState();
      
      // Enhance seats with class and price information
      const enhancedSeats = bookingData.seats.map((seat: any) => {
        const seatClass = getSeatClassByRow(seat.row);
        const classLabel = seatClass?.label || 'UNKNOWN';
        const price = getPriceForClass(classLabel);
        
        return {
          id: seat.id,
          row: seat.row,
          number: seat.number,
          classLabel,
          price,
        };
      });
      
      // Get movie language from settings store
      const { getMovieForShow } = useSettingsStore.getState();
      const currentMovie = getMovieForShow(bookingData.show);
      const movieLanguage = currentMovie?.language || 'HINDI';
      
      const response = await createBooking({
        tickets: enhancedSeats,
        total: bookingData.totalAmount,
        totalTickets: bookingData.totalTickets,
        timestamp: bookingData.timestamp,
        show: bookingData.show,
        screen: bookingData.screen,
        movie: bookingData.movie,
        movieLanguage: movieLanguage,
        date: bookingData.date,
        source: 'LOCAL'
      });

      if (response.success) {
        // Show success toast
        // toast({
        //   title: 'Tickets Printed Successfully!',
        //   description: `${bookingData.totalTickets} ticket(s) have been printed and saved to database.`,
        //   duration: 3000,
        // });
        
        // Mark the booked seats as booked in the store (don't reset all seats)
        const toggleSeatStatus = useBookingStore.getState().toggleSeatStatus;
        bookingData.seats.forEach((seat: any) => {
          toggleSeatStatus(seat.id, 'BOOKED');
        });
        
        // Clear checkout data completely after booking to avoid infinite loops
        setCheckoutData(null);
        
        // Stay on checkout page - user can manually navigate back when ready
        // Note: BookingHistory will automatically refetch data when the date changes
        // or when the user navigates to the history page
      } else {
        throw new Error(response.error?.message || 'Failed to save booking');
      }
    } catch (error) {
      console.error('Error saving booking:', error);
      // toast({
      //   title: 'Error Saving Booking',
      //   description: 'Failed to save booking to database. Please try again.',
      //   variant: 'destructive',
      //   duration: 5000,
      // });
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (fixed, collapsible) */}
      <div
        className={`fixed left-0 top-0 h-screen z-40 bg-white shadow-lg border-r overflow-y-scroll hide-scrollbar transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}
      >
        <nav className={`flex-1 flex flex-col gap-2 ${collapsed ? 'justify-center items-center p-0 m-0' : 'p-4'}`}>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                onDoubleClick={() => setCollapsed((c) => !c)}
                className={`transition-colors w-full
                  ${collapsed
                    ? `flex justify-center items-center aspect-square w-14 h-14 p-0 rounded-xl ${isActive ? 'bg-blue-100' : ''}`
                    : `flex flex-col justify-center items-center min-h-[96px] rounded-xl mb-4 ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`
                  }
                  ${isActive && !collapsed ? 'shadow' : ''}`}
                title={item.label}
              >
                <Icon className={`${collapsed ? 'w-6 h-6' : 'w-6 h-6 mb-2'}`} />
                <span className={`transition-all duration-200 ${collapsed ? 'opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100 w-auto'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>
        {/* Status Info */}
        <div className={`absolute bottom-0 left-0 right-0 transition-all duration-200
          ${collapsed
            ? 'w-14 h-14 flex flex-col justify-center items-center bg-gray-50 rounded-xl mb-2 mx-auto left-0 right-0'
            : 'p-4 border-t bg-gray-50 w-full'
          }`}
        >
          <div className={`flex items-center justify-between text-sm w-full ${collapsed ? 'flex-col gap-1 justify-center items-center' : ''}`}>
            <span className={`text-gray-600 transition-all duration-200 ${collapsed ? 'opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'}`}>Status:</span>
            <div className="flex items-center justify-center">
              <span className={`text-green-600 font-medium transition-all duration-200 ${collapsed ? 'opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'}`}>Online</span>
            </div>
          </div>
        </div>
      </div>
      {/* Header (fixed, immovable) */}
      <div className={`fixed top-0 right-0 z-30 h-20 bg-white shadow-sm border-b flex items-center px-6 transition-all duration-300 ${collapsed ? 'left-16' : 'left-64'}`}>
        <div className="flex items-center justify-between w-full">
          <div>
            {activeView === 'booking' ? (
              <h1 className="text-2xl font-bold text-black tracking-wide">SEAT BOOKING</h1>
            ) : activeView === 'checkout' ? (
              <h1 className="text-2xl font-bold text-black tracking-wide">CHECKOUT</h1>
            ) : activeView === 'confirmation' ? (
              <h1 className="text-2xl font-bold text-black tracking-wide">BOOKING CONFIRMATION</h1>
            ) : (
              <h1 className="text-2xl font-bold text-black tracking-wide">
                {activeView === 'history' && 'BOOKING HISTORY'}
                {activeView === 'reports' && 'REPORTS & ANALYTICS'}
                {activeView === 'settings' && 'SETTINGS'}
                {activeView === 'checkout' && 'SEAT BOOKING'}
              </h1>
            )}
            {activeView === 'booking' && (
              <p className="text-gray-600 mt-1">
                {format(new Date(selectedDate), 'dd/MM/yyyy')} • {getCurrentShowLabelDynamic()}
              </p>
            )}
            {activeView === 'checkout' && (
              <p className="text-gray-600 mt-1">
                {format(new Date(selectedDate), 'dd/MM/yyyy')} • {getCurrentShowLabelDynamic()}
              </p>
            )}


          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-600">{formatTo12Hour(currentTime)}</span>
              <Button
                variant="ghost"
                size="sm"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).electronAPI) {
                  (window as any).electronAPI.closeApp();
                } else {
                  window.close();
                }
              }}
                className="text-gray-600 hover:text-red-600 hover:bg-red-50"
              title="Close App"
              >
                <LogOut className="w-4 h-4" />
              </Button>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'} mt-20`}
      >
        {/* Content Area */}
        <div className="flex-1 p-0 hide-scrollbar">
          {activeView === 'booking' && (
            <SeatGrid 
              onProceed={(data) => { 
                setCheckoutData(data); 
                setActiveView('checkout'); 
                setIsExchangeMode(false); // Reset exchange mode when proceeding normally
              }} 
              showRefreshButton={false}
              showExchangeButton={isExchangeMode}
              onExchange={async () => {
                // Handle exchange button click - print tickets and return to checkout
                console.log('🔄 Exchange button clicked - printing tickets and returning to checkout');
                
                try {
                  // Get selected seats from the store
                  const selectedSeats = seats.filter(seat => seat.status === 'SELECTED');
                  
                  if (selectedSeats.length === 0) {
                    console.log('⚠️ No seats selected for printing');
                    return;
                  }
                  
                                     // Import the necessary services
                   const { useSettingsStore } = await import('@/store/settingsStore');
                   const printerService = await import('@/services/printerService');
                   const { ElectronPrinterService } = await import('@/services/electronPrinterService');
                  
                  // Get movie for current show from settings
                  const { getMovieForShow } = useSettingsStore.getState();
                  const currentMovie = getMovieForShow(selectedShow);
                  
                  if (!currentMovie) {
                    console.error('❌ No movie found for show:', selectedShow);
                    return;
                  }
                  
                  // Get show time details from settings store
                  const { getShowTimes } = useSettingsStore.getState();
                  const showTimes = getShowTimes();
                  const currentShowTime = showTimes.find(show => show.key === selectedShow);
                  
                  if (!currentShowTime) {
                    console.error('❌ No show time found for:', selectedShow);
                    return;
                  }
                  
                  // Convert 24-hour time to 12-hour format for display
                  const showtime = currentShowTime.startTime;
                  
                  // Get printer configuration
                  const printerInstance = printerService.default.getInstance();
                  const printerConfig = printerInstance.getPrinterConfig();
                  
                  if (!printerConfig || !printerConfig.name) {
                    console.error('❌ No printer configured');
                    return;
                  }
                  
                                                     // Use Electron printer service
                           const electronPrinterService = ElectronPrinterService.getInstance();
                  
                                     // Group seats by class and row
                   const { getPriceForClass } = useSettingsStore.getState();
                  
                  const groups = selectedSeats.reduce((acc, seat) => {
                    const seatClass = getSeatClassByRow(seat.row);
                    const classLabel = seatClass?.label || 'UNKNOWN';
                    const price = getPriceForClass(classLabel);
                    
                    const key = `${classLabel}|${seat.row}`;
                    if (!acc[key]) {
                      acc[key] = {
                        classLabel,
                        row: seat.row,
                        seats: [],
                        price: 0,
                        seatIds: [],
                      };
                    }
                    acc[key].seats.push(seat.number);
                    acc[key].price += price;
                    acc[key].seatIds.push(seat.id);
                    return acc;
                  }, {} as Record<string, any>);
                  
                  console.log('[TIME] FRONTEND TIME DEBUG:');
                  console.log('[TIME] showtime variable:', showtime);
                  console.log('[TIME] showtime type:', typeof showtime);
                  console.log('[TIME] showtime length:', showtime?.length);
                  console.log('[TIME] currentShowTime object:', currentShowTime);
                  console.log('[TIME] currentShowTime.startTime:', currentShowTime?.startTime);
                  console.log('[TIME] currentShowTime.endTime:', currentShowTime?.endTime);
                  
                  const ticketGroups = Object.values(groups).map(group => ({
                    theaterName: printerConfig.theaterName || getTheaterConfig().name,
                    location: printerConfig.location || getTheaterConfig().location,
                    date: selectedDate,
                    showTime: showtime,
                    showKey: selectedShow,
                    movieName: currentMovie.name,
                    movieLanguage: currentMovie.language,
                    classLabel: group.classLabel,
                    row: group.row,
                    seatRange: formatSeatNumbers(group.seats),
                    seatCount: group.seats.length,
                    individualPrice: group.price / group.seats.length,
                    totalPrice: group.price,
                    isDecoupled: false,
                    seatIds: group.seatIds,
                    transactionId: 'TXN' + Date.now()
                  }));
                  
                                     console.log('🖨️ Preparing to print grouped tickets via Electron:', ticketGroups);
                   
                   // Print each ticket group using Electron
                   let allPrinted = true;
                   for (const ticketGroup of ticketGroups) {
                     const formattedTicket = electronPrinterService.formatTicketForThermal(ticketGroup);
                     const printSuccess = await electronPrinterService.printTicket(formattedTicket, printerConfig.name, currentMovie);
                    
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
                  
                                     // Save booking to backend
                   const { createBooking } = await import('@/services/api');
                  
                  // Enhance seats with class and price information
                  const enhancedSeats = selectedSeats.map(seat => {
                    const seatClass = getSeatClassByRow(seat.row);
                    const classLabel = seatClass?.label || 'UNKNOWN';
                    const price = getPriceForClass(classLabel);
                    
                    return {
                      id: seat.id,
                      row: seat.row,
                      number: seat.number,
                      classLabel,
                      price,
                    };
                  });
                  
                  const response = await createBooking({
                    tickets: enhancedSeats,
                    total: enhancedSeats.reduce((sum, seat) => sum + seat.price, 0),
                    totalTickets: enhancedSeats.length,
                    timestamp: new Date().toISOString(),
                    show: selectedShow,
                    screen: currentMovie.screen,
                    movie: currentMovie.name,
                    date: selectedDate,
                    source: 'LOCAL'
                  });
                  
                  if (response.success) {
                    // Mark all selected seats as booked in the store
                    selectedSeats.forEach(seat => toggleSeatStatus(seat.id, 'BOOKED'));
                    console.log('[PRINT] Tickets printed and booking saved successfully');
                  } else {
                    console.error('❌ Failed to save booking to backend');
                  }
                  
                } catch (error) {
                  console.error('❌ Error in exchange button:', error);
                }
                
                // Return to checkout page
                setIsExchangeMode(false);
                setActiveView('checkout');
              }}
            />
          )}

          {activeView === 'history' && (
            <Suspense fallback={<div className="flex items-center justify-center p-8">Loading booking history...</div>}>
              <BookingHistory />
            </Suspense>
          )}
          {activeView === 'reports' && (
            <Suspense fallback={<div className="flex items-center justify-center p-8">Loading reports...</div>}>
              <BoxVsOnlineReport />
            </Suspense>
          )}
          {activeView === 'settings' && (
            <Suspense fallback={<div className="flex items-center justify-center p-8">Loading settings...</div>}>
              <Settings />
            </Suspense>
          )}

          {activeView === 'checkout' && (
            <Checkout
              checkoutData={checkoutData}
              onBookingComplete={handleBookingComplete}
              onManualShowSelection={handleManualShowSelection}
              onClearCheckoutData={() => setCheckoutData(null)}
              onNavigateToSeatGrid={() => {
                setIsExchangeMode(true);
                setActiveView('booking');
              }}
            />
          )}

        </div>
      </div>
    </div>
  );
};

export default Index;