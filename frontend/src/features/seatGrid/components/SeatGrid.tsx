import React, { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SeatGridErrorBoundary } from '@/components/SpecializedErrorBoundaries';
import SeatGridHeader from './SeatGridHeader';
import SeatGridRows from './SeatGridRows';
import SeatGridFooter from './SeatGridFooter';
import ScreenIcon from './ScreenIcon';
import { useBmsMode } from '../hooks/useBmsMode';
import { useSeatStatus } from '../hooks/useSeatStatus';
import { useMoveMode } from '../hooks/useMoveMode';
import { useSeatClick } from '../hooks/useSeatClick';
import { useSeatMap } from '../hooks/useSeatMap';
import { useSeatSegments } from '../hooks/useSeatSegments';
import { useSeatStatistics } from '../hooks/useSeatStatistics';
import { SEAT_CLASSES } from '@/lib/config';

// Export seatSegments for backward compatibility with BookingHistory.tsx
export const seatSegments = SEAT_CLASSES.map(cls => ({
  label: cls.label,
  rows: cls.rows
}));

interface SeatGridProps {
  onProceed?: (data: any) => void;
  hideProceedButton?: boolean;
  hideRefreshButton?: boolean;
  showRefreshButton?: boolean;
  disableAutoFetch?: boolean;
  showExchangeButton?: boolean;
  onExchange?: () => void;
  overrideShow?: string;
  overrideDate?: string;
  hideBMSMarking?: boolean;
  bmsMode?: boolean;
  onBmsModeChange?: (mode: boolean) => void;
}

const SeatGrid = ({ 
  onProceed, 
  hideProceedButton = false, 
  hideRefreshButton = false, 
  showRefreshButton = false, 
  disableAutoFetch = false, 
  showExchangeButton = false, 
  onExchange, 
  overrideShow, 
  overrideDate, 
  hideBMSMarking = false, 
  bmsMode: externalBmsMode, 
  onBmsModeChange 
}: SeatGridProps) => {
  const { 
    selectedDate: globalSelectedDate, 
    selectedShow: globalSelectedShow, 
    seats
  } = useBookingStore();
  
  // Use override values if provided, otherwise use global store values
  const selectedDate = overrideDate || globalSelectedDate;
  const selectedShow = (overrideShow as any) || globalSelectedShow;
  const { getPriceForClass } = useSettingsStore();

  // Hooks for business logic
  const { bmsMode, toggleBmsMode, processBmsBatch, pendingBmsUpdates, setPendingBmsUpdates, batchTimeoutRef } = useBmsMode({
    externalBmsMode,
    onBmsModeChange,
    selectedDate,
    selectedShow
  });

  const { fetchSeatStatus, loadingSeats } = useSeatStatus({
    selectedDate,
    selectedShow
  });

  const { seatMap } = useSeatMap(seats);
  const { seatSegments } = useSeatSegments();
  const { selectedSeats, totalAmount, availableCount, bookedCount, blockedCount, bmsBookedCount } = useSeatStatistics({
    seats,
    getPriceForClass
  });

  const { moveMode, setMoveMode, executeMove, cancelMoveMode, clickCount, setClickCount, clickTimer, setClickTimer } = useMoveMode({
    selectedSeats,
    seats,
    selectedDate,
    selectedShow,
    bmsMode
  });

  const { handleSeatClick } = useSeatClick({
    bmsMode,
    moveMode,
    processBmsBatch,
    pendingBmsUpdates,
    setPendingBmsUpdates,
    batchTimeoutRef,
    executeMove,
    clickCount,
    setClickCount,
    clickTimer,
    setClickTimer
  });

  // Get sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    const handleStorage = () => {
      setSidebarCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
    };
    
    const checkSidebarState = () => {
      const storedState = localStorage.getItem('sidebar-collapsed') === 'true';
      const mainContent = document.querySelector('[class*="ml-16"], [class*="ml-64"]');
      if (mainContent) {
        const computedStyle = window.getComputedStyle(mainContent);
        const marginLeft = computedStyle.marginLeft;
        const isCollapsed = marginLeft === '4rem' || marginLeft === '64px';
        setSidebarCollapsed(isCollapsed);
      } else {
        setSidebarCollapsed(storedState);
      }
    };
    
    window.addEventListener('storage', handleStorage);
    
    const observer = new MutationObserver(() => {
      checkSidebarState();
    });
    
    const mainContent = document.querySelector('main') || document.body;
    observer.observe(mainContent, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    checkSidebarState();
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      observer.disconnect();
    };
  }, []);

  // Fetch seat status when component mounts or date/show changes
  // OPTIMIZED: Removed fetchSeatStatus from dependencies - it's now stable and won't change
  // This prevents unnecessary fetches when seats are updated (e.g., on class card clicks)
  useEffect(() => {
    if (selectedDate && selectedShow && !disableAutoFetch) {
      fetchSeatStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedShow, disableAutoFetch]); // Only fetch when date/show actually changes

  // Handle ESC key to cancel move mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && moveMode) {
        cancelMoveMode();
      }
    };

    if (moveMode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [moveMode, cancelMoveMode]);

  return (
    <SeatGridErrorBoundary>
      <div 
        className="bg-[#FAFAFA] rounded-lg shadow-sm border border-gray-200/50 px-2 py-6 flex flex-col min-h-0 overflow-hidden"
        style={{ 
          height: !hideProceedButton ? 'calc(100vh - 160px)' : '100%',
          maxHeight: !hideProceedButton ? 'calc(100vh - 160px)' : '100%'
        }}
      >
        <SeatGridHeader
          showRefreshButton={showRefreshButton}
          hideRefreshButton={hideRefreshButton}
          hideBMSMarking={hideBMSMarking}
          externalBmsMode={externalBmsMode}
          bmsMode={bmsMode}
          toggleBmsMode={toggleBmsMode}
          loadingSeats={loadingSeats}
          fetchSeatStatus={fetchSeatStatus}
          moveMode={moveMode}
          cancelMoveMode={cancelMoveMode}
        />

        {/* Container between header and checkout button */}
        <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
          {/* Scrollable Seat Segments */}
          <div 
            className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden hide-scrollbar"
            style={{ 
              paddingTop: '0px',
              paddingBottom: '0px',
              marginBottom: '0px'
            }}
          >
            <SeatGridRows
              seatSegments={seatSegments}
              seatMap={seatMap}
              bmsMode={bmsMode}
              onSeatClick={handleSeatClick}
            />
            
            <ScreenIcon />
          </div>
        </div>

        <SeatGridFooter
          hideProceedButton={hideProceedButton}
          showExchangeButton={showExchangeButton}
          selectedSeats={selectedSeats}
          totalAmount={totalAmount}
          availableCount={availableCount}
          bookedCount={bookedCount}
          bmsBookedCount={bmsBookedCount}
          onProceed={onProceed}
          onExchange={onExchange}
          seats={seats}
          sidebarCollapsed={sidebarCollapsed}
        />
        
        {/* Hide scrollbar styles */}
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            width: 0px;
            height: 0px;
            background: transparent;
          }
          .hide-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
        `}</style>
      </div>
    </SeatGridErrorBoundary>
  );
};

export default SeatGrid;
