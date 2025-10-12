import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getSeatStatus } from '@/services/api';
import { convertTo12Hour, parseTimeToMinutes, getCurrentTimeMinutes } from '@/utils/timeUtils';
import type { Show } from '@/types/api';

export const useShowManagement = (onManualShowSelection?: (showKey: string) => void) => {
  const { selectedShow, setSelectedShow, selectedDate, loadBookingForDate, syncSeatStatus, toggleSeatStatus } = useBookingStore();
  const { getMovieForShow } = useSettingsStore();
  const showTimes = useSettingsStore(state => state.showTimes);

  // State for show dropdown
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);
  const [showDropdownRef, setShowDropdownRef] = useState<HTMLDivElement | null>(null);

  /**
   * Dynamic show details from settings
   */
  const getShowDetails = useMemo(() => {
    try {
      const enabledShowTimes = showTimes.filter(show => show.enabled);
      return enabledShowTimes.reduce((acc, show) => {
        acc[show.key] = {
          label: show.label,
          timing: `${convertTo12Hour(show.startTime)} - ${convertTo12Hour(show.endTime)}`,
          price: 0
        };
        return acc;
      }, {} as Record<string, { label: string; timing: string; price: number }>);
    } catch (error) {
      console.log('[ERROR] Error accessing settings store, using fallback');
      return {
        'MORNING': { label: 'Morning Show', timing: '10:00 AM - 12:00 PM', price: 0 },
        'MATINEE': { label: 'Matinee Show', timing: '2:00 PM - 5:00 PM', price: 0 },
        'EVENING': { label: 'Evening Show', timing: '6:00 PM - 9:00 PM', price: 0 },
        'NIGHT': { label: 'Night Show', timing: '9:30 PM - 12:30 AM', price: 0 }
      };
    }
  }, [showTimes]);

  /**
   * Function to get the current show based on time
   */
  const getCurrentShowByTime = useCallback(() => {
    const currentTime = getCurrentTimeMinutes();
    console.log('[SHOW] getCurrentShowByTime called - currentTime:', currentTime);
    
    const enabledShowTimes = showTimes.filter(show => show.enabled);
    if (enabledShowTimes.length === 0) {
      console.log('[SHOW] getCurrentShowByTime: No enabled shows found');
      return null;
    }
    const sortedShows = [...enabledShowTimes].sort((a, b) => {
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });
    
    console.log('[SHOW] Available shows:', sortedShows.map(s => ({key: s.key, start: s.startTime, end: s.endTime})));
    
    for (let i = 0; i < sortedShows.length; i++) {
      const show = sortedShows[i];
      const startMinutes = parseTimeToMinutes(show.startTime);
      const endMinutes = parseTimeToMinutes(show.endTime);
      const nextShow = sortedShows[i + 1];
      let nextShowStartMinutes: number | null = null;
      if (nextShow) {
        // FIXED: Use parseTimeToMinutes instead of broken manual parsing
        nextShowStartMinutes = parseTimeToMinutes(nextShow.startTime);
      }
      // Simple logic: Is current time within this show's range?
      let isActive = false;
      if (endMinutes < startMinutes) {
        // Overnight show (e.g., 11:30 PM - 2:30 AM)
        isActive = currentTime >= startMinutes || currentTime < endMinutes;
      } else {
        // Normal show (e.g., 2:00 PM - 5:00 PM)
        isActive = currentTime >= startMinutes && currentTime < endMinutes;
      }
      
      console.log(`[SHOW] Checking show ${show.key}:`, {
        startMinutes,
        endMinutes,
        currentMinutes: currentTime,
        isActive
      });
      
      if (isActive) {
        console.log('[SHOW] getCurrentShowByTime returning:', show.key);
        return show;
      }
    }
    for (let i = sortedShows.length - 1; i >= 0; i--) {
      const show = sortedShows[i];
      const startMinutes = parseTimeToMinutes(show.startTime);
      if (currentTime >= startMinutes) {
        console.log('[SHOW] getCurrentShowByTime returning (fallback):', show.key);
        return show;
      }
    }
    const fallbackShow = sortedShows[0] || null;
    console.log('[SHOW] getCurrentShowByTime returning (default):', fallbackShow ? fallbackShow.key : null);
    return fallbackShow;
  }, [showTimes]);

  /**
   * Optimized function to check if a show is the current time show
   */
  const isCurrentTimeShow = useCallback((showKey: string) => {
    const currentTime = getCurrentTimeMinutes();
    const show = showTimes.find(s => s.key === showKey);
    if (!show) return false;

    // Use robust parser that supports both 12-hour (e.g., "2:00 PM") and 24-hour formats
    const startMinutes = parseTimeToMinutes(show.startTime);
    const endMinutes = parseTimeToMinutes(show.endTime);

    // Check if this show is currently running
    let isInRange = false;
    if (endMinutes < startMinutes) {
      // Overnight window
      isInRange = currentTime >= startMinutes || currentTime < endMinutes;
    } else {
      isInRange = currentTime >= startMinutes && currentTime < endMinutes;
    }

    if (isInRange) {
      return true; // Show is currently running
    }

    // Check if this is the next show and current show has ended
    const currentIndex = showTimes.findIndex(s => s.key === showKey);
    const prevShow = showTimes[currentIndex - 1];
    
    if (prevShow) {
      const prevShowEndMinutes = parseTimeToMinutes(prevShow.endTime);
      const prevShowStartMinutes = parseTimeToMinutes(prevShow.startTime);
      
      let prevShowHasEnded = false;
      if (prevShowEndMinutes < prevShowStartMinutes) {
        // Previous show was overnight
        prevShowHasEnded = currentTime >= prevShowEndMinutes;
      } else {
        // Previous show was normal
        prevShowHasEnded = currentTime >= prevShowEndMinutes;
      }
      
      // If previous show has ended and this show hasn't started yet, show "Current Show"
      if (prevShowHasEnded && currentTime < startMinutes) {
        return true;
      }
    }

    return false;
  }, [showTimes]);

  /**
   * Check if a show is accessible (current or future)
   */
  const isShowAccessible = useCallback((show: any) => {
    // console.log('🎯 FULL SHOW OBJECT:', show);
    // console.log('🎯 show.startTime:', show.startTime, 'show.endTime:', show.endTime);
    
    const currentTime = getCurrentTimeMinutes();
    const startMinutes = parseTimeToMinutes(show.startTime);
    const endMinutes = parseTimeToMinutes(show.endTime);
    
    // console.log('🎯 isShowAccessible check:', {
    //   showKey: show.key,
    //   showLabel: show.label,
    //   currentTime,
    //   startMinutes,
    //   endMinutes,
    //   startTime: show.startTime,
    //   endTime: show.endTime,
    //   fullShowObject: show
    // });
    
    let isAccessible;
    if (endMinutes < startMinutes) {
      const isCurrentlyRunning = currentTime >= startMinutes || currentTime < endMinutes;
      const isFutureShow = currentTime < startMinutes;
      isAccessible = isCurrentlyRunning || isFutureShow;
      // console.log('🎯 Overnight show logic:', { isCurrentlyRunning, isFutureShow, isAccessible });
    } else {
      const isCurrentlyRunning = currentTime >= startMinutes && currentTime < endMinutes;
      const isFutureShow = currentTime < startMinutes;
      isAccessible = isCurrentlyRunning || isFutureShow;
      // console.log('🎯 Normal show logic:', { isCurrentlyRunning, isFutureShow, isAccessible });
    }
    
    // console.log('🎯 Final accessibility result:', { showKey: show.key, isAccessible });
    return isAccessible;
  }, []);

  /**
   * Handle show selection
   */
  const handleShowSelect = useCallback(async (showKey: string, onManualShowSelection?: (showKey: string) => void) => {
    console.log('[SHOW] handleShowSelect: Received showKey:', showKey);
    console.log('[SHOW] handleShowSelect: Current store selectedShow:', useBookingStore.getState().selectedShow);
    
    const currentSelectedSeats = useBookingStore.getState().seats.filter(seat => seat.status === 'SELECTED');
    // console.log('🎯 Clearing selected seats:', currentSelectedSeats.length);
    
    if (currentSelectedSeats.length > 0) {
      currentSelectedSeats.forEach(seat => {
        toggleSeatStatus(seat.id, 'AVAILABLE');
      });
    }
    
    // console.log('🎯 Calling manual show selection handler');
    
    if (onManualShowSelection) {
      console.log('[SHOW] handleShowSelect: Calling onManualShowSelection with:', showKey);
      onManualShowSelection(showKey);
    } else {
      console.warn('[SHOW] No manual selection handler available, using direct store update');
      console.log('[SHOW] handleShowSelect: Setting selectedShow directly to:', showKey);
      setSelectedShow(showKey as any);
    }
    
    setShowDropdownOpen(false);
    
    setTimeout(async () => {
      try {
        // console.log('🎯 Loading booking data for:', { selectedDate, showKey });
        await loadBookingForDate(selectedDate, showKey as any);
        
        try {
          // console.log('🎯 Fetching seat status for:', { selectedDate, showKey });
          const response = await getSeatStatus({ date: selectedDate, show: showKey as Show });
          
          if (response.success && response.data) {
            const { bookedSeats, bmsSeats } = response.data as any;
            const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
            const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
            
            // console.log('🎯 Syncing seat status:', { bookedCount: bookedSeatIds.length, bmsCount: bmsSeatIds.length });
            syncSeatStatus(bookedSeatIds, bmsSeatIds);
          }
        } catch (seatError) {
          console.error('[ERROR] Failed to fetch seat status for ${showKey}:', seatError);
        }
      } catch (error) {
        console.error('[ERROR] Failed to load seats for show ${showKey}:', error);
      }
    }, 100);
  }, [selectedDate, loadBookingForDate, syncSeatStatus, toggleSeatStatus, setSelectedShow]);

  /**
   * Handle show dropdown interactions
   */
  const handleShowCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // console.log('🎯 handleShowCardClick called:', { 
    //   count: (e as any).detail || 1,
    //   selectedShow,
    //   currentDropdownState: showDropdownOpen
    // });
    
    const count = (e as any).detail || 1;
    if (count === 1) {
      // console.log('🎯 Single click - no action');
      return;
    }
    if (count === 2) {
      // console.log('🎯 Double click - toggling dropdown');
      setShowDropdownOpen(prev => {
        // console.log('🎯 Dropdown state changing from', prev, 'to', !prev);
        return !prev;
      });
      return;
    }
    if (count >= 3) {
      console.log('[SHOW] TRIPLE-CLICK: Before selection - selectedShow:', selectedShow);
      console.log('[SHOW] TRIPLE-CLICK: Current store selectedShow:', useBookingStore.getState().selectedShow);
      
      const currentShow = getCurrentShowByTime();
      console.log('[SHOW] TRIPLE-CLICK: getCurrentShowByTime returned:', currentShow);
      
      const currentShowKey = currentShow ? currentShow.key : null;
      console.log('[SHOW] TRIPLE-CLICK: Extracted key:', currentShowKey);
      
      if (currentShowKey && currentShowKey !== selectedShow) {
        console.log('[SHOW] TRIPLE-CLICK: About to call handleShowSelect with:', currentShowKey);
        handleShowSelect(currentShowKey, onManualShowSelection);
      } else {
        console.log('[SHOW] TRIPLE-CLICK: No action needed - same show or no current show');
      }
    }
  }, [selectedShow, getCurrentShowByTime, handleShowSelect, showDropdownOpen, onManualShowSelection]);

  /**
   * Handle clicks outside dropdown
   */
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

  /**
   * Refresh the "Current Time" badge periodically so it reflects clock time
   */
  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTimeTick(t => (t + 1) % 1000000), 30000);
    return () => clearInterval(id);
  }, []);

  const currentShowStatus = useMemo(() => {
    const status: Record<string, boolean> = {};
    showTimes.forEach(show => {
      status[show.key] = isCurrentTimeShow(show.key);
    });
    return status;
  }, [showTimes, isCurrentTimeShow, timeTick]);

  return {
    showDropdownOpen,
    setShowDropdownOpen,
    showDropdownRef,
    setShowDropdownRef,
    getShowDetails,
    getCurrentShowByTime,
    handleShowSelect,
    handleShowCardClick,
    currentShowStatus,
    convertTo12Hour,
    isShowAccessible,
    selectedShow,
    selectedDate
  };
};