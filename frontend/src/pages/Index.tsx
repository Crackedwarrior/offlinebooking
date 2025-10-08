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
import { getShowKeyFromNow, getShowLabelByKey, formatTo12Hour } from '@/lib/time';
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

  // Custom hook to get current show label dynamically
  const getCurrentShowLabelDynamic = useCallback(() => {
    try {
      console.log('🎯 getCurrentShowLabelDynamic called');
      console.log('🎯 showTimes from store:', showTimes);
      
      const enabledShowTimes = showTimes.filter(show => show.enabled);
      console.log('🎯 enabledShowTimes:', enabledShowTimes);
      
      if (enabledShowTimes.length === 0) {
        console.log('🎯 No enabled shows found');
        return 'No shows available';
      }
      
      const key = getShowKeyFromNow(enabledShowTimes as any);
      console.log('🎯 getShowKeyFromNow returned key:', key);
      
      const label = key ? getShowLabelByKey(enabledShowTimes as any, key) : enabledShowTimes[0].label;
      console.log('🎯 Final label returned:', label);
      
      return label;
    } catch (error) {
      console.log('❌ Error in getCurrentShowLabelDynamic, using fallback:', error);
      return getCurrentShowLabel();
    }
  }, [showTimes]);

  // Update current time every 5 minutes (less frequent to reduce unnecessary re-renders)
  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = new Date();
      const oldTime = currentTime;
      
      // Only update if the minute has changed (to prevent unnecessary re-renders)
      if (newTime.getMinutes() !== oldTime.getMinutes()) {
        setCurrentTime(newTime);
      }
    }, 60000); // Check every minute instead of every 5 minutes
    return () => clearInterval(interval);
  }, [currentTime]);

  // ✅ AUTO-NAVIGATE TO SEAT GRID ON FIRST LOAD - Trigger seat data loading
  useEffect(() => {
    if (isFirstLoad) {
      console.log('🔄 First app load detected - auto-navigating to seat grid to load data...');
      
      // Navigate to seat grid to trigger seat data loading
      setActiveView('booking');
      setIsExchangeMode(true);
      
      // After a short delay, navigate back to checkout
      setTimeout(() => {
        console.log('🔄 Auto-navigating back to checkout after seat data load...');
        setIsExchangeMode(false);
        setActiveView('checkout');
        setIsFirstLoad(false); // Mark as no longer first load
      }, 1000); // 1 second delay
    }
  }, [isFirstLoad]);


  // Helper: get current show key based on time (using dynamic settings)
  const getCurrentShowKey = useCallback(() => {
    try {
      // Get enabled show times from the hook
      const enabledShowTimes = showTimes.filter(show => show.enabled);
      
      if (enabledShowTimes.length === 0) {
        console.log('⚠️ No shows available in settings, using fallback: EVENING');
        return 'EVENING'; // Default fallback
      }
      
      const now = currentTime; // Use the current time state
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      
      console.log('🕐 Current time analysis:', {
        currentTime: now.toLocaleTimeString(),
        currentTimeMinutes,
        enabledShows: enabledShowTimes.map(s => ({ key: s.key, start: s.startTime, end: s.endTime }))
      });
      
      // Find the current show based on time ranges from settings
      // A show should remain active until the next show starts
      for (let i = 0; i < enabledShowTimes.length; i++) {
        const show = enabledShowTimes[i];
        
        // Parse 12-hour format times
        const parseTime = (timeStr: string) => {
          const [timePart, period] = timeStr.split(' ');
          const [hour, min] = timePart.split(':').map(Number);
          let hour24 = hour;
          if (period === 'PM' && hour !== 12) hour24 += 12;
          if (period === 'AM' && hour === 12) hour24 = 0;
          return hour24 * 60 + min;
        };
        
        const startMinutes = parseTime(show.startTime);
        const endMinutes = parseTime(show.endTime);
        
        // Find the next show's start time
        const nextShow = enabledShowTimes[i + 1];
        let nextShowStartMinutes = null;
        if (nextShow) {
          nextShowStartMinutes = parseTime(nextShow.startTime);
        }
        
        // Simple logic: Is current time within this show's range?
        let isActive = false;
        if (endMinutes < startMinutes) {
          // Overnight show (e.g., 11:30 PM - 2:30 AM)
          isActive = currentTimeMinutes >= startMinutes || currentTimeMinutes < endMinutes;
        } else {
          // Normal show (e.g., 2:00 PM - 5:00 PM)
          isActive = currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
        }
        
        // Debug logging to understand show selection
        console.log(`🔍 Checking show ${show.key}:`, {
          startTime: show.startTime,
          endTime: show.endTime,
          startMinutes,
          endMinutes,
          currentTimeMinutes,
          isActive
        });
        
        if (isActive) {
          return show.key;
        }
      }
      
      // If no show is active, find the most recent show that has ended
      for (let i = enabledShowTimes.length - 1; i >= 0; i--) {
        const show = enabledShowTimes[i];
        
        // Parse 12-hour format times
        const parseTime = (timeStr: string) => {
          const [timePart, period] = timeStr.split(' ');
          const [hour, min] = timePart.split(':').map(Number);
          let hour24 = hour;
          if (period === 'PM' && hour !== 12) hour24 += 12;
          if (period === 'AM' && hour === 12) hour24 = 0;
          return hour24 * 60 + min;
        };
        
        const startMinutes = parseTime(show.startTime);
        
        if (currentTimeMinutes >= startMinutes) {
          return show.key;
        }
      }
      
      // Default to first show if no match
      return enabledShowTimes[0]?.key || 'EVENING';
    } catch (error) {
      console.error('❌ Error in getCurrentShowKey:', error);
      return 'EVENING'; // Simple fallback without hardcoded timings
    }
  }, [showTimes]); // Add showTimes as dependency

  // State to track if user has manually selected a show
  const [userManuallySelectedShow, setUserManuallySelectedShow] = useState(false);

  // Handler for manual show selection
  const handleManualShowSelection = useCallback((showKey: string) => {
    // console.log(`🎯 Manual show selection: ${showKey}`);
    // console.log('🎯 Setting userManuallySelectedShow to true');
    setUserManuallySelectedShow(true);
    // console.log('🎯 Calling setSelectedShow with:', showKey);
    setSelectedShow(showKey as ShowTime);
    setTimeout(() => {
      // console.log('🔄 Resetting manual selection flag after 10 minutes');
      setUserManuallySelectedShow(false);
    }, 10 * 60 * 1000); // 10 minutes
  }, [setSelectedShow]);

  // Dynamic show selection based on current time and settings store
  useEffect(() => {
    // console.log('🔄 Auto-update effect running:', {
    //   userManuallySelectedShow,
    //   selectedShow,
    //   currentTime: currentTime.toLocaleTimeString(),
    //   activeView
    // });
    
    // Don't auto-update if user has manually selected a show
    if (userManuallySelectedShow) {
      // console.log('🚫 Auto-update blocked: User manually selected show');
      return;
    }
    
    // Get the current show based on time and settings store
    const currentShowKey = getCurrentShowKey();
    
    // Only update if the selected show doesn't match the current time show
    if (selectedShow !== currentShowKey) {
      console.log(`🔄 Auto-updating show: ${selectedShow} → ${currentShowKey}`);
      setSelectedShow(currentShowKey as ShowTime);
    } else {
      // console.log('✅ No auto-update needed: show already matches current time');
    }
  }, [currentTime, showTimes, getCurrentShowKey, selectedShow, setSelectedShow, userManuallySelectedShow]); // Depend on showTimes to re-run when settings change

  // Reset manual selection flag when navigating away from checkout
  // REMOVED: This was causing the flag to reset immediately when navigating between views
  // The flag should only reset after the 10-minute timeout or when manually reset

  // Manual test function to debug dynamic show selection
  const testDynamicShowSelection = () => {
    const currentShowKey = getCurrentShowKey();
    console.log('🧪 Test function called');
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
      
      const response = await createBooking({
        tickets: enhancedSeats,
        total: bookingData.totalAmount,
        totalTickets: bookingData.totalTickets,
        timestamp: bookingData.timestamp,
        show: bookingData.show,
        screen: bookingData.screen,
        movie: bookingData.movie,
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
              <h2 className="text-xl font-semibold">Seat Booking</h2>
            ) : activeView === 'checkout' ? (
              <h2 className="text-xl font-semibold">Checkout</h2>
            ) : activeView === 'confirmation' ? (
              <h2 className="text-xl font-semibold">Booking Confirmation</h2>
            ) : (
              <h2 className="text-xl font-semibold">
                {activeView === 'history' && 'Booking History'}
                {activeView === 'reports' && 'Reports & Analytics'}
                {activeView === 'settings' && 'Settings'}
                
              </h2>
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
                  
                  console.log('🕐 FRONTEND TIME DEBUG:');
                  console.log('🕐 showtime variable:', showtime);
                  console.log('🕐 showtime type:', typeof showtime);
                  console.log('🕐 showtime length:', showtime?.length);
                  console.log('🕐 currentShowTime object:', currentShowTime);
                  console.log('🕐 currentShowTime.startTime:', currentShowTime?.startTime);
                  console.log('🕐 currentShowTime.endTime:', currentShowTime?.endTime);
                  
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
                    console.log('✅ Tickets printed and booking saved successfully');
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