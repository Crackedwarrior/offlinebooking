import { useState, useCallback, useRef, useEffect } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { saveBmsSeatStatus } from '@/services/api';

interface UseBmsModeProps {
  externalBmsMode?: boolean;
  onBmsModeChange?: (mode: boolean) => void;
  selectedDate?: string;
  selectedShow?: string;
}

/**
 * Hook for managing BMS (Book My Show) mode state and batch updates
 * Extracted from SeatGrid for reusability
 */
export const useBmsMode = ({ 
  externalBmsMode, 
  onBmsModeChange, 
  selectedDate, 
  selectedShow 
}: UseBmsModeProps) => {
  const [internalBmsMode, setInternalBmsMode] = useState(false);
  const [pendingBmsUpdates, setPendingBmsUpdates] = useState<Map<string, 'BMS_BOOKED' | 'AVAILABLE'>>(new Map());
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toggleSeatStatus } = useBookingStore();

  // Determine BMS mode (external takes precedence)
  const bmsMode = externalBmsMode !== undefined ? externalBmsMode : internalBmsMode;
  const setBmsMode = externalBmsMode !== undefined && onBmsModeChange 
    ? onBmsModeChange 
    : setInternalBmsMode;

  // Toggle BMS mode
  const toggleBmsMode = useCallback(() => {
    setBmsMode(!bmsMode);
  }, [bmsMode, setBmsMode]);

  // Batch BMS updates to reduce API calls
  const processBmsBatch = useCallback(async () => {
    if (pendingBmsUpdates.size === 0) return;
    
    const updates = Array.from(pendingBmsUpdates.entries());
    const bmsBookedSeats = updates.filter(([_, status]) => status === 'BMS_BOOKED').map(([seatId, _]) => seatId);
    const availableSeats = updates.filter(([_, status]) => status === 'AVAILABLE').map(([seatId, _]) => seatId);
    
    try {
      // Process BMS_BOOKED seats
      if (bmsBookedSeats.length > 0) {
        await saveBmsSeatStatus(bmsBookedSeats, 'BMS_BOOKED', selectedDate!, selectedShow!);
      }
      
      // Process AVAILABLE seats
      if (availableSeats.length > 0) {
        await saveBmsSeatStatus(availableSeats, 'AVAILABLE', selectedDate!, selectedShow!);
      }
      
      console.log(`[SEAT] Batch updated ${updates.length} BMS seat statuses`);
      setPendingBmsUpdates(new Map());
    } catch (error) {
      console.error('[ERROR] Failed to batch update BMS statuses:', error);
      // Revert all changes on error
      updates.forEach(([seatId, originalStatus]) => {
        const oppositeStatus = originalStatus === 'BMS_BOOKED' ? 'AVAILABLE' : 'BMS_BOOKED';
        toggleSeatStatus(seatId, oppositeStatus);
      });
      setPendingBmsUpdates(new Map());
    }
  }, [pendingBmsUpdates, selectedDate, selectedShow, toggleSeatStatus]);

  // Cleanup timeout on unmount and process any pending updates
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      // Process any pending updates before unmounting
      if (pendingBmsUpdates.size > 0) {
        processBmsBatch();
      }
    };
  }, [processBmsBatch, pendingBmsUpdates]);

  return {
    bmsMode,
    setBmsMode,
    toggleBmsMode,
    processBmsBatch,
    pendingBmsUpdates,
    setPendingBmsUpdates,
    batchTimeoutRef
  };
};

