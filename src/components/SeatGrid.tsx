import { useState } from 'react';
import { useBookingStore, SeatStatus, Seat } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { seatsByRow } from '@/lib/seatMatrix';

const seatSegments = [
  { label: 'BOX', rows: ['BOX-A', 'BOX-B', 'BOX-C'] },
  { label: 'Rs. 150 STAR CLASS', rows: ['SC-A', 'SC-B', 'SC-C', 'SC-D'] },
  { label: 'Rs. 120 CLASSIC BALCONY', rows: ['CB-A', 'CB-B', 'CB-C', 'CB-D', 'CB-E', 'CB-F', 'CB-G', 'CB-H'] },
  { label: 'FIRST CLASS', rows: ['FC-A', 'FC-B', 'FC-C', 'FC-D', 'FC-E', 'FC-F', 'FC-G'] },
  { label: 'SECOND CLASS', rows: ['SC2-A', 'SC2-B'] }
];

const SeatGrid = () => {
  const { seats, toggleSeatStatus } = useBookingStore();
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  // Map seats for quick lookup by row and number
  const seatMap = seats.reduce((acc, seat) => {
    acc[`${seat.row}-${seat.number}`] = seat;
    return acc;
  }, {} as Record<string, Seat>);

  const getSeatColor = (status: SeatStatus) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'booked': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'blocked': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'bms-booked': return 'bg-blue-500 hover:bg-blue-600 text-white';
      default: return 'bg-gray-300';
    }
  };

  const getSeatIcon = (status: SeatStatus) => {
    switch (status) {
      case 'available': return '✓';
      case 'booked': return '✗';
      case 'blocked': return '⚠';
      case 'bms-booked': return '🌐';
      default: return '';
    }
  };

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat.id);
  };

  const handleStatusChange = (newStatus: SeatStatus) => {
    if (selectedSeat) {
      toggleSeatStatus(selectedSeat, newStatus);
      setSelectedSeat(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Seat Selection</h3>
        <div className="text-sm text-gray-600">
          Screen 1 • Total: {seats.length} seats
        </div>
      </div>

      {/* Seat Segments with Headers and Lines */}
      <div className="w-full overflow-x-auto">
        <div className="space-y-8 mb-6 min-w-max">
          {seatSegments.map((segment, segIdx) => (
            <div key={segment.label}>
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{segment.label}</div>
              <div className="space-y-3">
                {segment.rows.map(row => (
                  <div key={row} className="flex items-center justify-center space-x-2">
                    <div className="w-16 text-center font-semibold text-gray-700">
                      {row.replace(/^[^-]+-/, '')}
                    </div>
                    <div className="flex space-x-1">
                      {seatsByRow[row].map((seatNum, idx) => {
                        if (seatNum === '') {
                          return <div key={idx} className="w-12 h-12" />;
                        }
                        const seat = seatMap[`${row}-${seatNum}`];
                        if (!seat) return <div key={idx} className="w-12 h-12 bg-gray-200" />;
                        return (
                          <button
                            key={seat.id}
                            onClick={() => handleSeatClick(seat)}
                            className={`
                              w-12 h-12 rounded-lg font-medium text-sm border-2 transition-all
                              ${getSeatColor(seat.status)}
                              ${selectedSeat === seat.id ? 'ring-4 ring-purple-300 scale-110' : ''}
                            `}
                            title={`${seat.id} - ${seat.status}`}
                          >
                            <div className="text-xs">{seat.number}</div>
                            <div className="text-xs">{getSeatIcon(seat.status)}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {segIdx < seatSegments.length - 1 && (
                <div className="border-b border-gray-200 my-6" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* [CHECKPOINT] Screen moved below the seat grid as requested */}
      {/* Screen Indicator */}
      <div className="mb-8">
        <div className="bg-gray-800 text-white text-center py-3 rounded-lg mb-4">
          <span className="text-lg font-medium">🎬 SCREEN</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm">Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm">Booked</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-sm">Blocked</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm">BMS Booked</span>
        </div>
      </div>

      {/* Quick Actions for Selected Seat */}
      {selectedSeat && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">Selected: Seat {selectedSeat}</span>
            <button
              onClick={() => setSelectedSeat(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Button
              onClick={() => handleStatusChange('available')}
              className="bg-green-500 hover:bg-green-600 text-xs py-1"
            >
              Make Available
            </Button>
            <Button
              onClick={() => handleStatusChange('booked')}
              className="bg-red-500 hover:bg-red-600 text-xs py-1"
            >
              Book Seat
            </Button>
            <Button
              onClick={() => handleStatusChange('blocked')}
              className="bg-yellow-500 hover:bg-yellow-600 text-xs py-1"
            >
              Block Seat
            </Button>
            <Button
              onClick={() => handleStatusChange('bms-booked')}
              className="bg-blue-500 hover:bg-blue-600 text-xs py-1"
            >
              Mark BMS
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatGrid;
