/**
 * SeatGridModal Component
 * Extracted from BookingHistory.tsx
 */

import React from 'react';
import SeatGrid from '@/features/seatGrid/components/SeatGrid';
import type { ShowInfo } from '@/types/bookingHistory';

interface SeatGridModalProps {
  showSeatGrid: boolean;
  selectedShowForSeats: ShowInfo | null;
  selectedDate: string;
  onClose: () => void;
}

export const SeatGridModal: React.FC<SeatGridModalProps> = ({
  showSeatGrid,
  selectedShowForSeats,
  selectedDate,
  onClose
}) => {
  if (!showSeatGrid || !selectedShowForSeats) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Seat Grid - {selectedShowForSeats.label}</h3>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Close Seat Grid
        </button>
      </div>
      <SeatGrid 
        hideProceedButton={true} 
        showRefreshButton={false}
        hideBMSMarking={true}
        overrideShow={selectedShowForSeats.key}
        overrideDate={selectedDate}
      />
    </div>
  );
};

