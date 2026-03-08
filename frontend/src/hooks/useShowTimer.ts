import { useEffect, useCallback } from 'react';
import { useBookingStore, ShowTime } from '@/store/bookingStore';
import { getShowKeyFromNow, parse12HourToMinutes } from '@/lib/time';

interface UseShowTimerProps {
  showTimes: Array<{ key: string; label: string; startTime: string; endTime: string; enabled: boolean }>;
  userManuallySelectedShow: boolean;
  setSelectedShow: (show: ShowTime) => void;
  setActiveView: (view: 'booking' | 'checkout' | 'confirmation' | 'history' | 'reports' | 'settings') => void;
  setIsExchangeMode: (mode: boolean) => void;
  setCurrentTime: (time: Date) => void;
  setPreviousCurrentShow: (show: string | null) => void;
  setUserManuallySelectedShow: (value: boolean) => void;
  hasPerformedInitialSync: boolean;
  setHasPerformedInitialSync: (value: boolean) => void;
}

export const useShowTimer = ({
  showTimes,
  userManuallySelectedShow,
  setSelectedShow,
  setActiveView,
  setIsExchangeMode,
  setCurrentTime,
  setPreviousCurrentShow,
  setUserManuallySelectedShow,
  hasPerformedInitialSync,
  setHasPerformedInitialSync,
}: UseShowTimerProps) => {
  // Helper: get current show key based on time
  // OPTIMIZED: Moved logic inline to avoid function recreation and dependency issues
  const getCurrentShowKey = useCallback(() => {
    try {
      const enabledShowTimes = showTimes.filter(show => show.enabled);
      if (enabledShowTimes.length === 0) {
        return 'EVENING';
      }
      const key = getShowKeyFromNow(enabledShowTimes as any);
      return key || enabledShowTimes[0].key || 'EVENING';
    } catch (error) {
      console.error('[ERROR] Error in getCurrentShowKey:', error);
      return 'EVENING';
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
      // OPTIMIZED: Only run this check ONCE on initial mount to prevent re-render loops
      if (!hasPerformedInitialSync) {
        // OPTIMIZED: Calculate inline to avoid function call overhead
        const enabledShowTimes = showTimes.filter(show => show.enabled);
        const currentShow = enabledShowTimes.length === 0 
          ? 'EVENING' 
          : (getShowKeyFromNow(enabledShowTimes as any) || enabledShowTimes[0].key || 'EVENING');
        const storedShow = useBookingStore.getState().selectedShow;
        
        console.log('[SHOW] Initial sync check:', { currentShow, storedShow, userManuallySelectedShow });
        
        if (currentShow && currentShow !== storedShow && !userManuallySelectedShow) {
          console.log(`[SHOW] INITIAL SYNC: Current show ${currentShow} differs from stored ${storedShow}, syncing now!`);
          setSelectedShow(currentShow as any);
          setPreviousCurrentShow(currentShow);
          
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
        
        // Mark initial sync as complete - this check will never run again
        setHasPerformedInitialSync(true);
      }
      
      // THEN: Find the next show transition time
      let nextTransitionTime = null;
      let nextTransitionShow = null;
      
      for (const show of enabledShowTimes) {
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
          
          console.log(`[SHOW] Auto-updating show to: ${nextTransitionShow}`);
          setSelectedShow(nextTransitionShow as any);
          setPreviousCurrentShow(nextTransitionShow);
          setUserManuallySelectedShow(false);
          
          // Navigate to seat grid to refresh seat data for the new show
          console.log('[NAV] Navigating to seat grid to load fresh data for new show...');
          setActiveView('booking');
          setIsExchangeMode(true);
          
          // After a short delay, navigate back to checkout
          setTimeout(() => {
            console.log('[NAV] Auto-navigating back to checkout after seat data load...');
            setIsExchangeMode(false);
            setActiveView('checkout');
          }, 1000);
          
          setCurrentTime(new Date());
          scheduleNextTransition();
        }, msUntilTransition);
        
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
  }, [showTimes, userManuallySelectedShow, setSelectedShow, hasPerformedInitialSync, setActiveView, setIsExchangeMode, setCurrentTime, setPreviousCurrentShow, setUserManuallySelectedShow, setHasPerformedInitialSync]);

  return { getCurrentShowKey };
};

