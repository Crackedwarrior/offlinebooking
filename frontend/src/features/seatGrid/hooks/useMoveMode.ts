import { useState, useEffect, useCallback } from 'react';
import { Seat } from '@/store/bookingStore';
import { useBookingStore } from '@/store/bookingStore';
import { updateSeatStatus } from '@/services/api';
import { getSeatClassByRow } from '@/lib/config';
import { seatsByRow } from '@/lib/seatMatrix';

interface UseMoveModeProps {
  selectedSeats: Seat[];
  seats: Seat[];
  selectedDate?: string;
  selectedShow?: string;
  bmsMode: boolean;
}

/**
 * Hook for managing move mode state and logic
 * Extracted from SeatGrid for reusability
 */
export const useMoveMode = ({ 
  selectedSeats, 
  seats, 
  selectedDate, 
  selectedShow, 
  bmsMode 
}: UseMoveModeProps) => {
  const [moveMode, setMoveMode] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const { toggleSeatStatus } = useBookingStore();

  // Helper to get class label for a seat
  const getClassLabel = (row: string) => {
    const seatClass = getSeatClassByRow(row);
    return seatClass?.label || '';
  };

  const cancelMoveMode = useCallback(() => {
    setMoveMode(false);
  }, []);

  const executeMove = useCallback(async (targetSeat: Seat) => {
    if (!moveMode || selectedSeats.length === 0) return;

    const blockSize = selectedSeats.length;
    const selectedClass = getClassLabel(selectedSeats[0].row);
    const targetClass = getClassLabel(targetSeat.row);

    // Check if target is in the same class
    if (selectedClass !== targetClass) {
      return;
    }

    // Check if there's enough contiguous space starting from target seat
    const targetRow = targetSeat.row;
    const targetStartNumber = targetSeat.number;
    
    // Check if all required seats are available
    for (let i = 0; i < blockSize; i++) {
      const checkSeatNumber = targetStartNumber + i;
      const checkSeat = seats.find(seat => seat.row === targetRow && seat.number === checkSeatNumber);
      
      if (!checkSeat || checkSeat.status !== 'AVAILABLE') {
        return;
      }
    }

    // Execute the move
    const sortedSeats = selectedSeats.sort((a, b) => {
      if (a.row !== b.row) return a.row.localeCompare(b.row);
      return a.number - b.number;
    });

    // Prepare seat updates for backend
    const seatUpdates: Array<{ seatId: string; status: string }> = [];

    // Deselect current seats
    sortedSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'AVAILABLE');
      seatUpdates.push({ seatId: seat.id, status: 'AVAILABLE' });
    });

    // Select new seats
    for (let i = 0; i < blockSize; i++) {
      const newSeatNumber = targetStartNumber + i;
      const newSeat = seats.find(seat => seat.row === targetRow && seat.number === newSeatNumber);
      if (newSeat) {
        toggleSeatStatus(newSeat.id, 'SELECTED');
        seatUpdates.push({ seatId: newSeat.id, status: 'SELECTED' });
      }
    }

    // Save changes to backend
    try {
      await updateSeatStatus(seatUpdates, selectedDate, selectedShow);
      console.log('[SEAT] Seat move saved to backend:', seatUpdates);
    } catch (error) {
      console.error('[ERROR] Failed to save seat move to backend:', error);
      // Revert changes if backend save failed
      sortedSeats.forEach(seat => {
        toggleSeatStatus(seat.id, 'SELECTED');
      });
      for (let i = 0; i < blockSize; i++) {
        const newSeatNumber = targetStartNumber + i;
        const newSeat = seats.find(seat => seat.row === targetRow && seat.number === newSeatNumber);
        if (newSeat) {
          toggleSeatStatus(newSeat.id, 'AVAILABLE');
        }
      }
      return;
    }

    setMoveMode(false);
  }, [moveMode, selectedSeats, seats, selectedDate, selectedShow, toggleSeatStatus]);

  // Auto-enable move mode when contiguous block is selected
  useEffect(() => {
    if (selectedSeats.length > 1 && !moveMode && !bmsMode) {
      // Check if selected seats are contiguous
      const sortedSeats = selectedSeats.sort((a, b) => {
        if (a.row !== b.row) return a.row.localeCompare(b.row);
        return a.number - b.number;
      });

      // Verify contiguity using seat matrix to account for aisle gaps
      let isContiguous = true;
      for (let i = 1; i < sortedSeats.length; i++) {
        const prev = sortedSeats[i - 1];
        const curr = sortedSeats[i];
        
        if (prev.row !== curr.row) {
          isContiguous = false;
          break;
        }
        
        // Check if seats are actually contiguous in the seat matrix
        const rowKey = `${prev.row}`;
        const seatMatrix = seatsByRow[rowKey];
        
        if (!seatMatrix) {
          // Fallback to simple number check if matrix not found
          if (curr.number !== prev.number + 1) {
            isContiguous = false;
            break;
          }
        } else {
          // Find positions in the matrix
          const prevIndex = seatMatrix.indexOf(prev.number);
          const currIndex = seatMatrix.indexOf(curr.number);
          
          // Check if they are adjacent in the matrix (accounting for aisle gaps)
          const indicesAdjacent = prevIndex !== -1 && currIndex !== -1 && currIndex === prevIndex + 1;
          const numbersAdjacent = curr.number === prev.number + 1;
          
          if (!indicesAdjacent || !numbersAdjacent) {
            isContiguous = false;
            break;
          }
        }
      }

      if (isContiguous) {
        setMoveMode(true);
      }
    } else if (selectedSeats.length <= 1 && moveMode) {
      // Exit move mode if less than 2 seats are selected
      setMoveMode(false);
    }
  }, [selectedSeats, moveMode, bmsMode]);

  return {
    moveMode,
    setMoveMode,
    executeMove,
    cancelMoveMode,
    clickCount,
    setClickCount,
    clickTimer,
    setClickTimer
  };
};

