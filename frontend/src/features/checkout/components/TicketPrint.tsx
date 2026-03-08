/**
 * TicketPrint Component
 * Main orchestrator for ticket printing UI
 * 
 * Refactored: Extracted logic into hooks and UI components
 * See: hooks/useTicketPrint.ts, components/tickets/
 */

import React, { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { PrintErrorBoundary } from '@/components/SpecializedErrorBoundaries';
import { groupSeats, formatSeatNumbers, type Seat, type TicketGroup } from '@/utils/ticketGrouping';
import { useTicketPrint } from '../hooks/useTicketPrint';
import { TicketList } from '@/components/tickets/TicketList';
import { TicketActions } from '@/components/tickets/TicketActions';

interface TicketPrintProps {
  selectedSeats: Seat[];
  onDelete?: (seatIds: string[]) => void;
  onReset?: () => void;
  selectedDate: string;
  onBookingComplete?: () => void;
  onDecouple?: (seatIds: string[]) => void;
  decoupledSeatIds?: string[];
}

const TicketPrint: React.FC<TicketPrintProps> = ({ 
  selectedSeats, 
  onDelete, 
  onReset, 
  selectedDate, 
  onBookingComplete,
  onDecouple,
  decoupledSeatIds = []
}) => {
  const groups = groupSeats(selectedSeats, decoupledSeatIds);
  const total = groups.reduce((sum, g) => sum + g.price, 0);
  const [selectedGroupIdxs, setSelectedGroupIdxs] = useState<number[]>([]);
  
  const selectedShow = useBookingStore(state => state.selectedShow);
  const { getMovieForShow } = useSettingsStore();
  const showTimesFromStore = useSettingsStore(state => state.showTimes);
  const currentShowDetails = showTimesFromStore.find(show => show.key === selectedShow);

  const { isPrinting, hasCompletedBooking, setHasCompletedBooking, handlePrint } = useTicketPrint(
    selectedSeats,
    selectedDate,
    groups,
    decoupledSeatIds
  );

  // Reset booking completed state when new seats are selected
  useEffect(() => {
    if (hasCompletedBooking && selectedSeats.length > 0) {
      setHasCompletedBooking(false);
    }
  }, [selectedSeats.length, hasCompletedBooking, setHasCompletedBooking]);

  // Determine print availability
  const movieForCurrentShow = getMovieForShow(selectedShow);
  const hasMovieAssigned = !!movieForCurrentShow;
  const hasTicketsSelected = selectedSeats.length > 0;
  const canPrint = hasMovieAssigned && hasTicketsSelected && !isPrinting && !hasCompletedBooking;

  const toggleGroupSelection = (idx: number) => {
    setSelectedGroupIdxs(prev => {
      const newSelection = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
      return newSelection;
    });
  };

  const handleDelete = () => {
    if (!onDelete) {
      console.error('[ERROR] onDelete function not provided');
      return;
    }
    
    const seatIdsToDelete = selectedGroupIdxs.flatMap(idx => groups[idx].seatIds);
    
    if (seatIdsToDelete.length === 0) {
      console.warn('[WARN] No seats selected for deletion');
      return;
    }
    
    onDelete(seatIdsToDelete);
    setSelectedGroupIdxs([]);
  };

  const handleDeleteButtonClick = () => {
    if (selectedGroupIdxs.length > 0) {
      handleDelete();
    } else if (onReset && selectedSeats.length > 0) {
      onReset();
      setSelectedGroupIdxs([]);
    }
  };

  const handleDoubleClickDecouple = (seatIds: string[]) => {
    if (!onDecouple) return;
    onDecouple(seatIds);
  };

  const canDeleteSelected = selectedGroupIdxs.length > 0 && !!onDelete;
  const canDeleteAll = selectedGroupIdxs.length === 0 && !!onReset;
  const canDeleteButton = selectedSeats.length > 0 && (canDeleteSelected || canDeleteAll);

  // Header date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(id);
  }, []);
  const formattedDate = currentDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <PrintErrorBoundary>
      <div className="w-full font-mono bg-[#fefcf6] shadow-[0_-6px_18px_rgba(0,0,0,0.08)] overflow-hidden border-t border-gray-200 rounded-none">
        {/* Header: total on left, timer on right */}
        <div className="px-5 pt-2 pb-0 flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900 select-none">₹{total.toLocaleString('en-IN')}</div>
          <div className="text-sm text-gray-700 select-none">{formattedDate}</div>
        </div>

        {/* Tickets list */}
        <TicketList
          groups={groups}
          selectedGroupIdxs={selectedGroupIdxs}
          onToggleSelection={toggleGroupSelection}
          onDoubleClickDecouple={handleDoubleClickDecouple}
        />

        {/* Footer Actions */}
        <TicketActions
          canDelete={canDeleteButton}
          canPrint={canPrint}
          isPrinting={isPrinting}
          onDelete={handleDeleteButtonClick}
          onPrint={() => handlePrint(onBookingComplete)}
        />
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
    </PrintErrorBoundary>
  );
};

export default TicketPrint;
