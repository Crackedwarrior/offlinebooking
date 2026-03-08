/**
 * Seat Grid Preview - Shows a smaller version of the seat grid with full data loading
 * Allows bookie to see and interact with seat availability in a compact format
 * Refactored to use the same hooks and components as SeatGrid for consistency
 */

import React, { useEffect } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Globe, X } from 'lucide-react';
import SeatGridRows from './SeatGridRows';
import ScreenIcon from './ScreenIcon';
import { useBmsMode } from '../hooks/useBmsMode';
import { useSeatStatus } from '../hooks/useSeatStatus';
import { useMoveMode } from '../hooks/useMoveMode';
import { useSeatClick } from '../hooks/useSeatClick';
import { useSeatMap } from '../hooks/useSeatMap';
import { useSeatSegments } from '../hooks/useSeatSegments';
import { useSeatStatistics } from '../hooks/useSeatStatistics';
import { useSettingsStore } from '@/store/settingsStore';

interface SeatGridPreviewProps {
  selectedShow: string;
  selectedDate: string;
  externalBmsMode?: boolean;
  onBmsModeChange?: (mode: boolean) => void;
}

const PREVIEW_VERTICAL_OFFSET = 250; // approximate height of show selector + ticket bar

const SeatGridPreview: React.FC<SeatGridPreviewProps> = ({
  selectedShow,
  selectedDate,
  externalBmsMode,
  onBmsModeChange
}) => {
  const seats = useBookingStore(state => state.seats);
  const { getPriceForClass } = useSettingsStore();

  // Use the same hooks as SeatGrid for consistent behavior
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
  const { selectedSeats, availableCount, bookedCount, bmsBookedCount } = useSeatStatistics({
    seats,
    getPriceForClass
  });

  const { moveMode, executeMove, cancelMoveMode, clickCount, setClickCount, clickTimer, setClickTimer } = useMoveMode({
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

  // Fetch seat status when component mounts or date/show changes
  // OPTIMIZED: Removed fetchSeatStatus from dependencies - it's now stable and won't change
  // This prevents unnecessary fetches when seats are updated (e.g., on class card clicks)
  useEffect(() => {
    if (selectedDate && selectedShow) {
      fetchSeatStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedShow]); // Only fetch when date/show actually changes

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

  const previewHeight = `calc(100vh - ${PREVIEW_VERTICAL_OFFSET}px)`;
  const selectedCount = selectedSeats.length;

  return (
    <div
      className="px-2 pt-2 pb-2 bg-[#FAFAFA] w-full flex flex-col flex-1 min-h-0 overflow-hidden border border-gray-200/50 shadow-sm"
      style={{ height: previewHeight }}
    >
      {/* Loading Spinner */}
      {loadingSeats && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
          <LoadingSpinner text="Loading seats..." />
        </div>
      )}
      
      {/* Header with Mark BMS button (only when not controlled externally) */}
      {externalBmsMode === undefined && (
        <div className="flex-none flex items-center justify-end pr-2 pb-2">
          <Button
            onClick={toggleBmsMode}
            disabled={loadingSeats}
            size="sm"
            variant={bmsMode ? "default" : "outline"}
            className={`${bmsMode ? "bg-blue-600 hover:bg-blue-700 text-white" : ""} p-2`}
            title={bmsMode ? "Exit BMS Mode" : "Mark BMS"}
          >
            {bmsMode ? (
              <X className="w-5 h-5" />
            ) : (
              <Globe className="w-5 h-5" />
            )}
          </Button>
        </div>
      )}
      
      <div className="px-2 pb-2 flex-1 min-h-0 flex flex-col h-full">
        <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden hide-scrollbar">
          <SeatGridRows
            seatSegments={seatSegments}
            seatMap={seatMap}
            bmsMode={bmsMode}
            onSeatClick={handleSeatClick}
          />
          
          <div className="mt-3 mb-2">
            <ScreenIcon />
          </div>
        </div>
      </div>
      
      {/* Preview-specific footer with legend */}
      <div className="mt-4 flex justify-between items-center text-xs text-gray-600">
        <div className="text-[11px] uppercase tracking-[0.3em] text-gray-400">Preview</div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#ffe082]" />
            <span>Available</span>
            <span className="font-mono text-gray-400">({availableCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-gray-200" />
            <span>Selected</span>
            <span className="font-mono text-gray-400">({selectedCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#b87333]" />
            <span>Booked</span>
            <span className="font-mono text-gray-400">({bookedCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-sky-300" />
            <span>BMS</span>
            <span className="font-mono text-gray-400">({bmsBookedCount})</span>
          </div>
        </div>
      </div>
      
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
  );
};

// OPTIMIZED: Memoize to prevent unnecessary re-renders
export default React.memo(SeatGridPreview);
