import { useState, useRef, useEffect } from 'react';
import { useBookingStore, SeatStatus, Seat } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { seatsByRow } from '@/lib/seatMatrix';
import { RotateCcw } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
// Remove Drawer imports

export const seatSegments = [
  { label: 'BOX', rows: ['BOX-A', 'BOX-B', 'BOX-C'] },
  { label: 'STAR CLASS', rows: ['SC-A', 'SC-B', 'SC-C', 'SC-D'] },
  { label: 'CLASSIC', rows: ['CB-A', 'CB-B', 'CB-C', 'CB-D', 'CB-E', 'CB-F', 'CB-G', 'CB-H'] },
  { label: 'FIRST CLASS', rows: ['FC-A', 'FC-B', 'FC-C', 'FC-D', 'FC-E', 'FC-F', 'FC-G'] },
  { label: 'SECOND CLASS', rows: ['SC2-A', 'SC2-B'] }
];

const SeatGrid = ({ onProceed }: { onProceed?: (data: any) => void }) => {
  const { seats, toggleSeatStatus } = useBookingStore();
  // Remove drawerOpen state and anySelected logic

  // Remove selectedSeat and actionPanelRef logic

  // Add the reset handler
  const handleResetSeats = () => {
    if (window.confirm('Are you sure you want to reset all seats to available? This action cannot be undone.')) {
      useBookingStore.getState().initializeSeats();
    }
  };

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

  // Replace handleSeatClick and handleStatusChange with inline logic
  // const handleSeatClick = (seat: Seat) => {
  //   setSelectedSeat(seat.id);
  // };

  // const handleStatusChange = (newStatus: SeatStatus) => {
  //   if (selectedSeat) {
  //     toggleSeatStatus(selectedSeat, newStatus);
  //     setSelectedSeat(null);
  //   }
  // };

  const availableCount = seats.filter(seat => seat.status === 'available').length;
  const bookedCount = seats.filter(seat => seat.status === 'booked').length;
  const blockedCount = seats.filter(seat => seat.status === 'blocked').length;
  const bmsBookedCount = seats.filter(seat => seat.status === 'bms-booked').length;

  // Pricing for each class
  const classPrices: Record<string, number> = {
    'BOX': 300,
    'STAR CLASS': 250,
    'CLASSIC': 200,
    'FIRST CLASS': 150,
    'SECOND CLASS': 100
  };
  // Helper to get class label for a seat
  const getClassLabel = (row: string) => {
    for (const seg of seatSegments) {
      if (seg.rows.includes(row)) return seg.label;
    }
    return '';
  };
  // Selected seats and total amount
  const selectedSeats = seats.filter(seat => seat.status === 'booked' || seat.status === 'bms-booked');
  const totalAmount = selectedSeats.reduce((sum, seat) => sum + (classPrices[getClassLabel(seat.row)] || 0), 0);

  // Get sidebar collapsed state from localStorage (to match Index.tsx logic)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    // Listen for sidebar collapse changes (if you have a global state, use that instead)
    const handleStorage = () => {
      setSidebarCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    handleStorage();
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Remove useNavigate

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* Remove Drawer for seat selection */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Seat Selection</h3>
            <button
              onClick={handleResetSeats}
              title="Reset All Seats"
              className="p-0 m-0 bg-transparent border-none shadow-none hover:bg-transparent focus:outline-none"
              style={{ lineHeight: 0 }}
            >
              <RotateCcw className="w-5 h-5 text-red-500 hover:text-red-700" />
            </button>
          </div>
          <div className="text-sm text-gray-600">
            Screen 1 • Total: {seats.length} seats
          </div>
        </div>

        {/* Seat Segments with Headers and Lines */}
        <div className="w-full overflow-x-auto">
          <div className="space-y-8 mb-6 w-full overflow-hidden">
            {seatSegments.map((segment, segIdx) => (
              <div key={segment.label}>
                <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{segment.label}</div>
                <div className="space-y-3">
                  {segment.rows.map(row => (
                    <div key={row} className="flex flex-row items-center w-full">
                      <div className="w-24 text-right font-semibold text-gray-700 pr-3">
                        {row.replace(/^[^-]+-/, '')}
                      </div>
                      <div className="flex justify-center w-full">
                        <div
                          className="grid gap-1"
                          style={{ gridTemplateColumns: `repeat(${seatsByRow[row].length}, minmax(0, 1fr))` }}
                        >
                          {seatsByRow[row].map((seatNum, idx) => {
                            if (seatNum === '') {
                              return <div key={idx} className="w-9 h-9" style={{ visibility: 'hidden' }} />;
                            }
                            const seat = seatMap[`${row}-${seatNum}`];
                            if (!seat) return <div key={idx} className="w-12 h-12 bg-gray-200" />;
                            return (
                              <ContextMenu key={seat.id}>
                                <ContextMenuTrigger asChild>
                                  <button
                                    data-seat-button
                                    className={`w-9 h-9 rounded-md font-medium text-xs border transition-all ${getSeatColor(seat.status)}`}
                                    title={`${seat.id} - ${seat.status}`}
                                    onClick={e => {
                                      e.preventDefault();
                                      if (seat.status === 'available') {
                                        toggleSeatStatus(seat.id, 'booked');
                                      } else if (seat.status === 'booked') {
                                        toggleSeatStatus(seat.id, 'available');
                                      }
                                      // Popup will open automatically via effect
                                    }}
                                  >
                                    <div className="text-xs">{seat.number}</div>
                                    <div className="text-xs">{getSeatIcon(seat.status)}</div>
                                  </button>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem onClick={() => toggleSeatStatus(seat.id, 'available')}>Make Available</ContextMenuItem>
                                  <ContextMenuItem onClick={() => toggleSeatStatus(seat.id, 'booked')}>Book Seat</ContextMenuItem>
                                  <ContextMenuItem onClick={() => toggleSeatStatus(seat.id, 'blocked')}>Block Seat</ContextMenuItem>
                                  <ContextMenuItem onClick={() => toggleSeatStatus(seat.id, 'bms-booked')}>Mark BMS</ContextMenuItem>
                                </ContextMenuContent>
                              </ContextMenu>
                            );
                          })}
                        </div>
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

        {/* Legend */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Available</span>
            <span className="text-xs text-gray-500 font-mono">({availableCount})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm">Booked</span>
            <span className="text-xs text-gray-500 font-mono">({bookedCount})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Blocked</span>
            <span className="text-xs text-gray-500 font-mono">({blockedCount})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">BMS Booked</span>
            <span className="text-xs text-gray-500 font-mono">({bmsBookedCount})</span>
          </div>
        </div>

        {/* Screen Indicator */}
        <div className="mb-8">
          <div className="bg-gray-800 text-white text-center py-3 rounded-lg mb-4">
            <span className="text-lg font-medium">🎬 SCREEN</span>
          </div>
        </div>

        {/* Quick Actions for Selected Seat */}
        {/* The action panel is removed, so this section is no longer needed. */}
      </div>

      {/* Fixed Bottom Panel for Selected Seats */}
      {selectedSeats.length > 0 && (
        <div className={`
          fixed bottom-0 z-50 bg-white border-t border-gray-200 flex flex-row items-center justify-between px-6 py-4 shadow-lg animate-fade-in transition-all duration-300
          ${sidebarCollapsed ? 'left-16 w-[calc(100%-4rem)]' : 'left-64 w-[calc(100%-16rem)]'}
          left-0 w-full md:left-auto md:w-auto
        `}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-all" onClick={() => onProceed && onProceed({ selectedSeats, totalAmount, seats })}>
            Proceed
          </button>
          <div className="flex flex-row items-center gap-4 ml-4">
            <span className="font-medium text-gray-700">Selected Seats: {selectedSeats.length}</span>
            <span className="font-medium text-gray-700">Total: ₹ {totalAmount}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default SeatGrid;
