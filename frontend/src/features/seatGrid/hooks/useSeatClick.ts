import { useCallback } from 'react';
import { Seat } from '@/store/bookingStore';
import { useBookingStore } from '@/store/bookingStore';

interface UseSeatClickProps {
  bmsMode: boolean;
  moveMode: boolean;
  processBmsBatch: () => Promise<void>;
  pendingBmsUpdates: Map<string, 'BMS_BOOKED' | 'AVAILABLE'>;
  setPendingBmsUpdates: React.Dispatch<React.SetStateAction<Map<string, 'BMS_BOOKED' | 'AVAILABLE'>>>;
  batchTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  executeMove: (seat: Seat) => Promise<void>;
  clickCount: number;
  setClickCount: React.Dispatch<React.SetStateAction<number>>;
  clickTimer: NodeJS.Timeout | null;
  setClickTimer: React.Dispatch<React.SetStateAction<NodeJS.Timeout | null>>;
}

/**
 * Hook for handling seat click logic (normal mode, BMS mode, move mode)
 * Extracted from SeatGrid for reusability
 */
export const useSeatClick = ({
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
}: UseSeatClickProps) => {
  const { toggleSeatStatus } = useBookingStore();

  const handleSeatClick = useCallback(async (seat: Seat) => {
    console.log('[SEAT] Manual seat click detected:', seat.id);
    
    if (moveMode) {
      // Double-click detection for manual selection/deselection in move mode
      setClickCount(prev => prev + 1);
      
      if (clickTimer) {
        clearTimeout(clickTimer);
      }
      
      const timer = setTimeout(() => {
        // Single click - move mode behavior
        if (seat.status === 'SELECTED') {
          // Allow deselection of selected seats in move mode
          toggleSeatStatus(seat.id, 'AVAILABLE');
        } else if (seat.status === 'AVAILABLE') {
          // Move block to this available seat
          executeMove(seat);
        }
        setClickCount(0);
      }, 300);
      
      setClickTimer(timer);
      
      if (clickCount === 1) {
        // Double click - manual selection/deselection
        clearTimeout(timer);
        setClickCount(0);
        
        if (seat.status === 'SELECTED') {
          // Double-click to deselect
          toggleSeatStatus(seat.id, 'AVAILABLE');
          console.log('[SEAT] Double-click: Deselected seat', seat.id);
        } else if (seat.status === 'AVAILABLE') {
          // Double-click to select
          toggleSeatStatus(seat.id, 'SELECTED');
          console.log('[SEAT] Double-click: Selected seat', seat.id);
        }
      }
      return;
    }

    if (bmsMode) {
      // BMS Mode: Toggle between available and bms-booked with batching
      if (seat.status === 'AVAILABLE') {
        // Optimistically update UI first
        toggleSeatStatus(seat.id, 'BMS_BOOKED');
        
        // Add to batch for backend update
        setPendingBmsUpdates(prev => {
          const newMap = new Map(prev.set(seat.id, 'BMS_BOOKED'));
          
          // Process immediately if batch is getting large (20+ seats)
          const currentBatchSize = newMap.size;
          if (currentBatchSize >= 20) {
            // Clear existing timeout and process immediately
            if (batchTimeoutRef.current) {
              clearTimeout(batchTimeoutRef.current);
            }
            setTimeout(() => {
              processBmsBatch();
            }, 50); // Very short delay for large batches
          } else {
            // Normal debouncing for smaller batches
            if (batchTimeoutRef.current) {
              clearTimeout(batchTimeoutRef.current);
            }
            batchTimeoutRef.current = setTimeout(() => {
              processBmsBatch();
            }, 500); // 500ms debounce
          }
          
          return newMap;
        });
        
      } else if (seat.status === 'BMS_BOOKED') {
        // Optimistically update UI first
        toggleSeatStatus(seat.id, 'AVAILABLE');
        
        // Add to batch for backend update
        setPendingBmsUpdates(prev => {
          const newMap = new Map(prev.set(seat.id, 'AVAILABLE'));
          
          // Process immediately if batch is getting large (20+ seats)
          const currentBatchSize = newMap.size;
          if (currentBatchSize >= 20) {
            // Clear existing timeout and process immediately
            if (batchTimeoutRef.current) {
              clearTimeout(batchTimeoutRef.current);
            }
            setTimeout(() => {
              processBmsBatch();
            }, 50); // Very short delay for large batches
          } else {
            // Normal debouncing for smaller batches
            if (batchTimeoutRef.current) {
              clearTimeout(batchTimeoutRef.current);
            }
            batchTimeoutRef.current = setTimeout(() => {
              processBmsBatch();
            }, 500); // 500ms debounce
          }
          
          return newMap;
        });
      }
      // Don't allow BMS marking on already booked or selected seats
    } else {
      // Normal Mode: Only allow interaction with available and selected seats
      // BMS seats should NOT be bookable in normal mode
      if (seat.status === 'AVAILABLE') {
        toggleSeatStatus(seat.id, 'SELECTED');
      } else if (seat.status === 'SELECTED') {
        toggleSeatStatus(seat.id, 'AVAILABLE');
      }
      // Ignore clicks on booked, blocked, or bms-booked seats in normal mode
    }
  }, [
    moveMode,
    bmsMode,
    clickCount,
    clickTimer,
    executeMove,
    processBmsBatch,
    pendingBmsUpdates,
    setPendingBmsUpdates,
    batchTimeoutRef,
    setClickCount,
    setClickTimer,
    toggleSeatStatus
  ]);

  return { handleSeatClick };
};

