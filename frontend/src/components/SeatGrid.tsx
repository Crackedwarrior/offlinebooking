import React, { useState, useRef, useEffect } from 'react';
import { useBookingStore, SeatStatus, Seat } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { seatsByRow } from '@/lib/seatMatrix';
import { RotateCcw, Loader2, Globe, X } from 'lucide-react';
import { SEAT_CLASSES, getSeatClassByRow } from '@/lib/config';
import { useSettingsStore } from '@/store/settingsStore';
import { getSeatStatus, saveBmsSeatStatus } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export const seatSegments = SEAT_CLASSES.map(cls => ({
  label: cls.label,
  rows: cls.rows
}));

interface SeatGridProps {
  onProceed?: (data: any) => void;
  hideProceedButton?: boolean;
  hideRefreshButton?: boolean;
}

const SeatGrid = ({ onProceed, hideProceedButton = false, hideRefreshButton = false }: SeatGridProps) => {
  const { seats, toggleSeatStatus, selectedDate, selectedShow } = useBookingStore();
  const { getPriceForClass } = useSettingsStore();
  const { toast } = useToast();
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [bmsMode, setBmsMode] = useState(false);

  // Fetch seat status from database
  const fetchSeatStatus = async () => {
    if (!selectedDate || !selectedShow) return;
    
    setLoadingSeats(true);
    try {
      console.log('🔍 Fetching seat status for:', { date: selectedDate, show: selectedShow });
      const response = await getSeatStatus({ date: selectedDate, show: selectedShow });
      
      if (response.success && response.data) {
        console.log('📊 Seat status response:', response.data);
        
        // Update seat status based on database data
        const bookedSeats = response.data.bookedSeats || [];
        const bmsSeats = response.data.bmsSeats || [];
        const bookedSeatIds = new Set(bookedSeats.map((seat: any) => seat.seatId));
        const bmsSeatIds = new Set(bmsSeats.map((seat: any) => seat.seatId));
        
        console.log('🔍 Debugging seat status:');
        console.log('  - Total booked seats from API:', bookedSeats.length);
        console.log('  - Total BMS seats from API:', bmsSeats.length);
        console.log('  - Booked seat IDs:', Array.from(bookedSeatIds));
        console.log('  - BMS seat IDs:', Array.from(bmsSeatIds));
        console.log('  - Sample booked seats:', bookedSeats.slice(0, 5));
        console.log('  - Sample BMS seats:', bmsSeats.slice(0, 5));
        
        // Reset all seats to available first
        useBookingStore.getState().initializeSeats();
        
        // Mark booked seats as booked
        bookedSeatIds.forEach(seatId => {
          useBookingStore.getState().toggleSeatStatus(seatId, 'booked');
        });
        
        // Mark BMS seats as bms-booked
        bmsSeatIds.forEach(seatId => {
          useBookingStore.getState().toggleSeatStatus(seatId, 'bms-booked');
        });
        
        console.log(`✅ Updated ${bookedSeatIds.size} seats as booked and ${bmsSeatIds.size} seats as BMS`);
        
        // Check if any seat IDs weren't found
        const allSeatIds = seats.map(s => s.id);
        const notFoundBookedSeats = Array.from(bookedSeatIds).filter(id => !allSeatIds.includes(id));
        const notFoundBmsSeats = Array.from(bmsSeatIds).filter(id => !allSeatIds.includes(id));
        
        if (notFoundBookedSeats.length > 0) {
          console.warn('⚠️ Some booked seat IDs from API not found in seat matrix:', notFoundBookedSeats);
        }
        if (notFoundBmsSeats.length > 0) {
          console.warn('⚠️ Some BMS seat IDs from API not found in seat matrix:', notFoundBmsSeats);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching seat status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load seat status from database.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSeats(false);
    }
  };

  // Simplified reset handler
  const handleResetSeats = () => {
    if (window.confirm('Are you sure you want to reset all seats to available? This action cannot be undone.')) {
      useBookingStore.getState().initializeSeats();
    }
  };

  // Toggle BMS mode
  const toggleBmsMode = () => {
    setBmsMode(!bmsMode);
    if (bmsMode) {
      toast({
        title: 'BMS Mode Disabled',
        description: 'Exited BMS marking mode',
      });
    } else {
      toast({
        title: 'BMS Mode Enabled',
        description: 'Click seats to mark them as BMS (Book My Show)',
      });
    }
  };

  // Map seats for quick lookup
  const seatMap = seats.reduce((acc, seat) => {
    acc[`${seat.row}${seat.number}`] = seat;
    return acc;
  }, {} as Record<string, Seat>);

  // Simplified seat color logic
  const getSeatColor = (status: SeatStatus) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600 text-white cursor-pointer';
      case 'selected': return 'bg-yellow-500 hover:bg-yellow-600 text-white cursor-pointer';
      case 'booked': return 'bg-red-500 text-white cursor-not-allowed opacity-70';
      case 'blocked': return 'bg-gray-400 text-white cursor-not-allowed opacity-70';
      case 'bms-booked': return 'bg-blue-500 text-white cursor-not-allowed opacity-70';
      default: return 'bg-gray-300 cursor-not-allowed';
    }
  };

  // Simplified seat icon logic
  const getSeatIcon = (status: SeatStatus) => {
    switch (status) {
      case 'available': return '✓';
      case 'selected': return '●';
      case 'booked': return '✗';
      case 'blocked': return '⚠';
      case 'bms-booked': return '🌐';
      default: return '';
    }
  };

  // Enhanced seat click handler with BMS mode
  const handleSeatClick = async (seat: Seat) => {
    if (bmsMode) {
      // BMS Mode: Toggle between available and bms-booked
      if (seat.status === 'available') {
        toggleSeatStatus(seat.id, 'bms-booked');
        // Save to backend
        try {
          await saveBmsSeatStatus([seat.id], 'BMS_BOOKED');
          console.log(`✅ Saved BMS status for seat ${seat.id}`);
        } catch (error) {
          console.error('❌ Failed to save BMS status:', error);
          // Revert the change if backend save failed
          toggleSeatStatus(seat.id, 'available');
          toast({
            title: 'Error',
            description: 'Failed to save BMS status. Please try again.',
            variant: 'destructive',
          });
        }
      } else if (seat.status === 'bms-booked') {
        toggleSeatStatus(seat.id, 'available');
        // Save to backend
        try {
          await saveBmsSeatStatus([seat.id], 'AVAILABLE');
          console.log(`✅ Removed BMS status for seat ${seat.id}`);
        } catch (error) {
          console.error('❌ Failed to remove BMS status:', error);
          // Revert the change if backend save failed
          toggleSeatStatus(seat.id, 'bms-booked');
          toast({
            title: 'Error',
            description: 'Failed to remove BMS status. Please try again.',
            variant: 'destructive',
          });
        }
      }
      // Don't allow BMS marking on already booked or selected seats
    } else {
      // Normal Mode: Only allow interaction with available and selected seats
      // BMS seats should NOT be bookable in normal mode
      if (seat.status === 'available') {
        toggleSeatStatus(seat.id, 'selected');
      } else if (seat.status === 'selected') {
        toggleSeatStatus(seat.id, 'available');
      }
      // Ignore clicks on booked, blocked, or bms-booked seats in normal mode
    }
  };

  // Helper to get class label for a seat
  const getClassLabel = (row: string) => {
    const seatClass = getSeatClassByRow(row);
    return seatClass?.label || '';
  };

  // Selected seats and total amount
  const selectedSeats = seats.filter(seat => seat.status === 'selected');
  const totalAmount = selectedSeats.reduce((sum, seat) => {
    const seatClass = getSeatClassByRow(seat.row);
    const price = seatClass ? getPriceForClass(seatClass.label) : 0;
    return sum + price;
  }, 0);

  // Statistics for legend
  const availableCount = seats.filter(seat => seat.status === 'available').length;
  const bookedCount = seats.filter(seat => seat.status === 'booked').length;
  const blockedCount = seats.filter(seat => seat.status === 'blocked').length;
  const bmsBookedCount = seats.filter(seat => seat.status === 'bms-booked').length;

  // Get sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    const handleStorage = () => {
      setSidebarCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    handleStorage();
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Fetch seat status when component mounts or date/show changes
  useEffect(() => {
    if (selectedDate && selectedShow) {
      console.log('🔄 SeatGrid: Date or show changed, fetching seat status');
      console.log('  - Current date:', selectedDate);
      console.log('  - Current show:', selectedShow);
      console.log('  - Effect triggered for show:', selectedShow);
      fetchSeatStatus();
    } else {
      console.log('⚠️ SeatGrid: Missing date or show:', { selectedDate, selectedShow });
    }
  }, [selectedDate, selectedShow]);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Seat Selection</h3>
          {bmsMode && (
            <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              <Globe className="w-4 h-4" />
              BMS Mode Active
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {!hideRefreshButton && (
            <Button
              onClick={toggleBmsMode}
              disabled={loadingSeats}
              size="sm"
              variant={bmsMode ? "default" : "outline"}
              className={bmsMode ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {bmsMode ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Exit BMS Mode
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Mark BMS
                </>
              )}
            </Button>
          )}
          <div className="text-sm text-gray-600">
            Screen 1 • Total: {seats.length} seats
          </div>
        </div>
      </div>

      {/* BMS Mode Instructions */}
      {bmsMode && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-800">BMS Marking Mode</h4>
          </div>
          <p className="text-sm text-blue-700">
            Click on available seats to mark them as BMS (Book My Show) booked. 
            Click again on BMS seats to unmark them. BMS seats will appear in blue and cannot be booked in normal mode.
          </p>
        </div>
      )}

      {/* Seat Segments with Headers */}
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
                          const seat = seatMap[`${row}${seatNum}`];
                          if (!seat) return <div key={idx} className="w-12 h-12 bg-gray-200" />;
                          
                          return (
                            <button
                              key={seat.id || `${row}-${seatNum}`}
                              className={`w-9 h-9 rounded-md font-medium text-xs border transition-all ${
                                bmsMode && seat.status === 'bms-booked' 
                                  ? 'bg-blue-500 text-white cursor-pointer hover:bg-blue-600' 
                                  : getSeatColor(seat.status)
                              }`}
                              title={`${seat.id} - ${seat.status}${bmsMode ? ' (BMS Mode)' : ''}`}
                              onClick={() => handleSeatClick(seat)}
                              disabled={seat.status === 'booked' || seat.status === 'blocked' || (!bmsMode && seat.status === 'bms-booked')}
                            >
                              <div className="text-xs">{seat.number}</div>
                              <div className="text-xs">{getSeatIcon(seat.status)}</div>
                            </button>
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

      {/* Enhanced Legend */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm">Available</span>
          <span className="text-xs text-gray-500 font-mono">({availableCount})</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-sm">Selected</span>
          <span className="text-xs text-gray-500 font-mono">({selectedSeats.length})</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm">Booked</span>
          <span className="text-xs text-gray-500 font-mono">({bookedCount})</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-sm">BMS Booked</span>
          <span className="text-xs text-gray-500 font-mono">({bmsBookedCount})</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
          <span className="text-sm">Blocked</span>
          <span className="text-xs text-gray-500 font-mono">({blockedCount})</span>
        </div>
      </div>

      {/* Screen Indicator */}
      <div className="mb-8">
        <div className="bg-gray-800 text-white text-center py-3 rounded-lg mb-4">
          <span className="text-lg font-medium">🎬 SCREEN</span>
        </div>
      </div>

      {/* Fixed Bottom Panel - Only show if not hidden */}
      {!hideProceedButton && (
        <div className={
          `fixed bottom-0 z-[9999] bg-white border-t border-gray-200 flex flex-row items-center justify-between px-6 py-4 shadow-lg animate-fade-in transition-all duration-300
          ${sidebarCollapsed ? 'left-16 w-[calc(100%-4rem)]' : 'left-64 w-[calc(100%-16rem)]'}
          left-0 w-full md:left-auto md:w-auto`
        } style={{ zIndex: 9999, position: 'fixed', bottom: 0 }}>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-all cursor-pointer"
            style={{ 
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              pointerEvents: 'auto',
              zIndex: 9999
            }}
            onClick={() => {
              console.log('Proceed button clicked!');
              console.log('onProceed function:', onProceed);
              console.log('selectedSeats:', selectedSeats);
              if (onProceed) {
                onProceed({ selectedSeats, totalAmount, seats });
              }
            }}
          >
            Proceed to Checkout
          </Button>
          <div className="flex flex-row items-center gap-4 ml-4">
            <span className="font-medium text-gray-700">Selected: {selectedSeats.length} seats</span>
            <span className="font-medium text-gray-700">Total: ₹{totalAmount}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatGrid;
