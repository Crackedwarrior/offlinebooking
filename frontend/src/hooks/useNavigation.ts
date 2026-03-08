/**
 * Hook for navigation logic
 * Extracted from Index.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { ShowTime, useBookingStore } from '@/store/bookingStore';
import { useShowTimer } from '@/hooks/useShowTimer';
import { useSettingsStore } from '@/store/settingsStore';

export const useNavigation = () => {
  const [activeView, setActiveView] = useState<'booking' | 'checkout' | 'confirmation' | 'history' | 'reports' | 'settings'>('checkout');
  const [collapsed, setCollapsed] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [userManuallySelectedShow, setUserManuallySelectedShow] = useState(false);
  const [previousCurrentShow, setPreviousCurrentShow] = useState<string | null>(null);
  const [hasPerformedInitialSync, setHasPerformedInitialSync] = useState(false);
  const [isExchangeMode, setIsExchangeMode] = useState(false);

  const showTimes = useSettingsStore(state => state.showTimes);
  const { setSelectedShow } = useBookingStore();

  // Use show timer hook for smart show transitions
  const { getCurrentShowKey } = useShowTimer({
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
  });

  // Update current time every second for display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // AUTO-NAVIGATE TO SEAT GRID ON FIRST LOAD - Trigger seat data loading
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

  // Handler for manual show selection
  const handleManualShowSelection = useCallback((showKey: string) => {
    console.log(`[SHOW] Manual show selection: ${showKey}`);
    setUserManuallySelectedShow(true);
    setSelectedShow(showKey as ShowTime);
    
    // Navigate to seat grid to refresh seat data for the new show
    setActiveView('booking');
    setIsExchangeMode(true);
    
    // After a short delay, navigate back to checkout
    setTimeout(() => {
      setIsExchangeMode(false);
      setActiveView('checkout');
    }, 1000);
  }, [setSelectedShow]);

  // Dynamic show selection based on current time and settings store
  // OPTIMIZED: Only run once on mount, removed getCurrentShowKey from dependencies
  useEffect(() => {
    if (previousCurrentShow === null) {
      const currentShowKey = getCurrentShowKey();
      console.log(`[SHOW] Initializing current show tracker: ${currentShowKey}`);
      setPreviousCurrentShow(currentShowKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    activeView,
    setActiveView,
    collapsed,
    setCollapsed,
    currentTime,
    isExchangeMode,
    setIsExchangeMode,
    handleManualShowSelection,
    userManuallySelectedShow
  };
};

