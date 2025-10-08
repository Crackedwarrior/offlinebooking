/**
 * Compact Seat Grid - A smaller version of the seat grid for the checkout page
 * Fits in the space below show cards without extending beyond page boundaries
 */

import React from 'react';
import { useBookingStore } from '@/store/bookingStore';

interface CompactSeatGridProps {
  selectedShow: string;
  selectedDate: string;
}

export const CompactSeatGrid: React.FC<CompactSeatGridProps> = ({
  selectedShow,
  selectedDate
}) => {
  const { seats } = useBookingStore();

  // Get seats for current show/date
  const showSeats = seats.filter(seat => 
    seat.row && seat.number && 
    (seat.status === 'AVAILABLE' || seat.status === 'BOOKED' || seat.status === 'BMS_BOOKED' || seat.status === 'SELECTED')
  );

  // Group seats by row for compact display
  const seatsByRow = showSeats.reduce((acc, seat) => {
    if (!acc[seat.row]) {
      acc[seat.row] = [];
    }
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<string, any[]>);

  // Get unique rows and sort them
  const rows = Object.keys(seatsByRow).sort();

  // Limit to first 4 rows for compact display
  const compactRows = rows.slice(0, 4);

  const getSeatColor = (status: string) => {
    switch (status) {
      case 'BOOKED':
      case 'BMS_BOOKED':
        return 'bg-red-400';
      case 'SELECTED':
        return 'bg-blue-500';
      default:
        return 'bg-green-400';
    }
  };

  const getSeatSize = (row: string) => {
    // Smaller sizes for compact display
    if (row.startsWith('A') || row.startsWith('B')) return 'w-2 h-2'; // BOX/STAR CLASS
    if (row.startsWith('C') || row.startsWith('D')) return 'w-1.5 h-1.5'; // CLASSIC
    if (row.startsWith('E') || row.startsWith('F')) return 'w-1.5 h-1.5'; // FIRST CLASS
    return 'w-1 h-1'; // SECOND CLASS
  };

  return (
    <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">Seat Grid Preview</h4>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-400 rounded"></div>
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded"></div>
            <span>Selected</span>
          </div>
        </div>
      </div>
      
      {/* Screen indicator */}
      <div className="text-center mb-2">
        <div className="inline-block px-2 py-1 bg-gray-200 rounded text-xs font-medium text-gray-700">
          🎬 SCREEN
        </div>
      </div>
      
      {/* Compact seat grid */}
      <div className="space-y-0.5">
        {compactRows.map((row) => {
          const rowSeats = seatsByRow[row] || [];
          const sortedSeats = rowSeats.sort((a, b) => a.number - b.number);
          
          return (
            <div key={row} className="flex items-center gap-1">
              <div className="w-4 text-xs font-medium text-gray-600 text-right">
                {row}
              </div>
              <div className="flex gap-0.5">
                {sortedSeats.slice(0, 15).map((seat) => (
                  <div
                    key={seat.id}
                    className={`${getSeatSize(row)} ${getSeatColor(seat.status)} rounded-sm border border-gray-300`}
                    title={`${seat.row}${seat.number} - ${seat.status}`}
                  />
                ))}
                {sortedSeats.length > 15 && (
                  <div className="w-3 h-2 text-xs text-gray-500 flex items-center justify-center">
                    +{sortedSeats.length - 15}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Compact summary stats */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="font-semibold text-green-600">
              {showSeats.filter(s => s.status === 'AVAILABLE').length}
            </div>
            <div className="text-gray-600">Available</div>
          </div>
          <div>
            <div className="font-semibold text-red-600">
              {showSeats.filter(s => s.status === 'BOOKED' || s.status === 'BMS_BOOKED').length}
            </div>
            <div className="text-gray-600">Booked</div>
          </div>
          <div>
            <div className="font-semibold text-blue-600">
              {showSeats.filter(s => s.status === 'SELECTED').length}
            </div>
            <div className="text-gray-600">Selected</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactSeatGrid;
