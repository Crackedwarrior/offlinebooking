import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBookingStore, SeatStatus, Seat } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { seatsByRow } from '@/lib/seatMatrix';
import { RotateCcw, Loader2, Globe, X, Move } from 'lucide-react';
import { SEAT_CLASSES, getSeatClassByRow } from '@/lib/config';
import { useSettingsStore } from '@/store/settingsStore';
import { getSeatStatus, saveBmsSeatStatus, updateSeatStatus } from '@/services/api';
import { usePricing } from '@/hooks/use-pricing';
// import { useToast } from '@/hooks/use-toast';

export const seatSegments = SEAT_CLASSES.map(cls => ({
  label: cls.label,
  rows: cls.rows
}));

interface SeatGridProps {
  onProceed?: (data: any) => void;
  hideProceedButton?: boolean;
  hideRefreshButton?: boolean;
  showRefreshButton?: boolean;
  disableAutoFetch?: boolean;
}

const SeatGrid = ({ onProceed, hideProceedButton = false, hideRefreshButton = false, showRefreshButton = false, disableAutoFetch = false }: SeatGridProps) => {
  const { 
    selectedDate, 
    selectedShow, 
    seats, 
    syncSeatStatus, 
    toggleSeatStatus, 
    getBookingStats 
  } = useBookingStore();
  const { getPriceForClass } = useSettingsStore();
  const { pricingVersion } = usePricing(); // Add reactive pricing
  // const { toast } = useToast();
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [bmsMode, setBmsMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);

  // Memoize fetchSeatStatus to prevent unnecessary re-creations
  const fetchSeatStatus = useCallback(async () => {
    if (!selectedDate || !selectedShow) return;
    
    setLoadingSeats(true);
    try {
    
      const response = await getSeatStatus({ date: selectedDate, show: selectedShow });
      
      if (response.success && response.data) {
        const data: any = response.data;
        const bookedSeats = data.bookedSeats || [];
        const bmsSeats = data.bmsSeats || [];
        const selectedSeats = (data.selectedSeats || []) as Array<{ seatId: string }>;
        const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
        const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
        const selectedSeatIds = selectedSeats.map((seat: any) => seat.seatId);
        syncSeatStatus(bookedSeatIds, bmsSeatIds, selectedSeatIds);
        

        

        

        
        // Check if any seat IDs weren't found
        const allSeatIds = seats.map(s => s.id);
        const notFoundBookedSeats = bookedSeatIds.filter(id => !allSeatIds.includes(id as string));
        const notFoundBmsSeats = bmsSeatIds.filter(id => !allSeatIds.includes(id as string));
        
        if (notFoundBookedSeats.length > 0) {
          console.warn('⚠️ Some booked seat IDs from API not found in seat matrix:', notFoundBookedSeats);
        }
        if (notFoundBmsSeats.length > 0) {
          console.warn('⚠️ Some BMS seat IDs from API not found in seat matrix:', notFoundBmsSeats);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching seat status:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to load seat status from database.',
      //   variant: 'destructive',
      // });
    } finally {
      setLoadingSeats(false);
    }
  }, [selectedDate, selectedShow, syncSeatStatus, seats]);

  // Memoize other functions
  const handleResetSeats = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all seats to available? This action cannot be undone.')) {
      useBookingStore.getState().initializeSeats();
    }
  }, []);

  const toggleBmsMode = useCallback(() => {
    setBmsMode(!bmsMode);
    if (bmsMode) {
      // toast({
      //   title: 'BMS Mode Disabled',
      //   description: 'Exited BMS marking mode',
      // });
    } else {
      // toast({
      //   title: 'BMS Mode Enabled',
      //   description: 'Click seats to mark them as BMS (Book My Show)',
      // });
    }
  }, [bmsMode]);

  // Memoize seat map for performance
  const seatMap = useMemo(() => {
    const map = seats.reduce((acc, seat) => {
      acc[`${seat.row}${seat.number}`] = seat;
      return acc;
    }, {} as Record<string, Seat>);
    


    
    return map;
  }, [seats]);

  // Memoize seat color and icon functions
  const getSeatColor = useCallback((status: SeatStatus) => {
    const colorClass = (() => {
      switch (status) {
        case 'AVAILABLE': return 'bg-green-500 hover:bg-green-600 text-white cursor-pointer';
        case 'SELECTED': return 'bg-yellow-500 hover:bg-yellow-600 text-white cursor-pointer';
        case 'BOOKED': return 'bg-red-500 text-white cursor-not-allowed opacity-70';
        case 'BLOCKED': return 'bg-gray-400 text-white cursor-not-allowed opacity-70';
        case 'BMS_BOOKED': return 'bg-blue-500 text-white cursor-not-allowed opacity-70';
        default: return 'bg-gray-300 cursor-not-allowed';
      }
    })();
    

    
    return colorClass;
  }, []);

  const getSeatIcon = useCallback((status: SeatStatus) => {
    switch (status) {
      case 'AVAILABLE': return '✓';
      case 'SELECTED': return '✓';
      case 'BOOKED': return '✗';
      case 'BLOCKED': return '✗';
      case 'BMS_BOOKED': return '🌐';
      default: return '?';
    }
  }, []);

  // Enhanced seat click handler with BMS mode and move mode
  const handleSeatClick = async (seat: Seat) => {
    if (moveMode) {
      // Move Mode: Allow deselection of selected seats or moving to available seats
      if (seat.status === 'SELECTED') {
        // Allow deselection of selected seats in move mode
        toggleSeatStatus(seat.id, 'AVAILABLE');
      } else if (seat.status === 'AVAILABLE') {
        // Move block to this available seat
        await executeMove(seat);
      } else {
        // toast({
        //   title: 'Invalid Target',
        //   description: 'You can only move to available seats or deselect selected seats.',
        //   variant: 'destructive',
        // });
      }
      return;
    }

    if (bmsMode) {
      // BMS Mode: Toggle between available and bms-booked
      if (seat.status === 'AVAILABLE') {
        // Optimistically update UI first
        toggleSeatStatus(seat.id, 'BMS_BOOKED');
        
        // Save to backend
        try {
          await saveBmsSeatStatus([seat.id], 'BMS_BOOKED', selectedDate, selectedShow);
  
        } catch (error) {
          console.error('❌ Failed to save BMS status:', error);
          // Revert the change if backend save failed
          toggleSeatStatus(seat.id, 'AVAILABLE');
          // TODO: Add toast notification here
          // toast({
          //   title: 'Error',
          //   description: 'Failed to save BMS status. Please try again.',
          //   variant: 'destructive',
          // });
        }
      } else if (seat.status === 'BMS_BOOKED') {
        // Optimistically update UI first
        toggleSeatStatus(seat.id, 'AVAILABLE');
        
        // Save to backend
        try {
          await saveBmsSeatStatus([seat.id], 'AVAILABLE', selectedDate, selectedShow);
  
        } catch (error) {
          console.error('❌ Failed to remove BMS status:', error);
          // Revert the change if backend save failed
          toggleSeatStatus(seat.id, 'BMS_BOOKED');
          // TODO: Add toast notification here
          // toast({
          //   title: 'Error',
          //   description: 'Failed to remove BMS status. Please try again.',
          //   variant: 'destructive',
          // });
        }
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
  };

  // Helper to get class label for a seat
  const getClassLabel = (row: string) => {
    const seatClass = getSeatClassByRow(row);
    return seatClass?.label || '';
  };



  const cancelMoveMode = () => {
    setMoveMode(false);
    // toast({
    //   title: 'Move Mode Cancelled',
    //   description: 'Move mode has been cancelled.',
    // });
  };

  const clearSelection = () => {
    // Deselect all selected seats
    selectedSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'AVAILABLE');
    });
    
    if (moveMode) {
      setMoveMode(false);
    }
    
    // toast({
    //   title: 'Selection Cleared',
    //   description: 'All selected seats have been cleared.',
    // });
  };

  const executeMove = async (targetSeat: Seat) => {
    if (!moveMode || selectedSeats.length === 0) return;

    const blockSize = selectedSeats.length;
    const selectedClass = getClassLabel(selectedSeats[0].row);
    const targetClass = getClassLabel(targetSeat.row);

    // Check if target is in the same class
    if (selectedClass !== targetClass) {
      // toast({
      //   title: 'Invalid Location',
      //   description: 'You can only move seats within the same class.',
      //   variant: 'destructive',
      // });
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
        // toast({
        //   title: 'Insufficient Space',
        //   description: 'Not enough contiguous space at this location.',
        //   variant: 'destructive',
        // });
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
      console.log('✅ Seat move saved to backend:', seatUpdates);
    } catch (error) {
      console.error('❌ Failed to save seat move to backend:', error);
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
      // toast({
      //   title: 'Error',
      //   description: 'Failed to save seat move. Please try again.',
      //   variant: 'destructive',
      // });
      return;
    }

    setMoveMode(false);
    
    // toast({
    //   title: 'Block Moved',
    //   description: `Moved ${blockSize} seats to ${targetRow}${targetStartNumber}-${targetStartNumber + blockSize - 1}`,
    // });
  };

  // Get selected seats and calculate total amount
  const selectedSeats = seats.filter(seat => seat.status === 'SELECTED');
  const totalAmount = selectedSeats.reduce((total, seat) => {
    const seatClass = getSeatClassByRow(seat.row);
    const price = seatClass ? getPriceForClass(seatClass.label) : 0;
    return total + price;
  }, 0);
  
  // Debug: Log selected seats details
  useEffect(() => {
    if (selectedSeats.length > 0) {
      console.log('🎯 Selected Seats Details:', selectedSeats.map(seat => ({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        status: seat.status,
        class: getSeatClassByRow(seat.row)?.label
      })));
    }
  }, [selectedSeats]);

  // Calculate seat statistics - make them reactive
  const availableCount = useMemo(() => seats.filter(seat => seat.status === 'AVAILABLE').length, [seats]);
  const bookedCount = useMemo(() => seats.filter(seat => seat.status === 'BOOKED').length, [seats]);
  const blockedCount = useMemo(() => seats.filter(seat => seat.status === 'BLOCKED').length, [seats]);
  const bmsBookedCount = useMemo(() => seats.filter(seat => seat.status === 'BMS_BOOKED').length, [seats]);
  
  // Debug: Log seat statistics when they change
  useEffect(() => {
    const stats = {
      totalSeats: seats.length,
      available: availableCount,
      booked: bookedCount,
      bmsBooked: bmsBookedCount,
      blocked: blockedCount,
      selected: selectedSeats.length,
      selectedDate,
      selectedShow
    };
    
    console.log('🔍 SeatGrid - Seat Statistics Updated:', JSON.stringify(stats, null, 2));
    
    // Also log the actual seat status breakdown
    const statusBreakdown = seats.reduce((acc, seat) => {
      acc[seat.status] = (acc[seat.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('🔍 Seat Status Breakdown:', JSON.stringify(statusBreakdown, null, 2));
  }, [seats, availableCount, bookedCount, bmsBookedCount, blockedCount, selectedSeats.length, selectedDate, selectedShow]);

  // Get sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    const handleStorage = () => {
      setSidebarCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
    };
    
    const checkSidebarState = () => {
      // Check localStorage first
      const storedState = localStorage.getItem('sidebar-collapsed') === 'true';
      
      // Also check the actual main content margin to determine sidebar state
      const mainContent = document.querySelector('[class*="ml-16"], [class*="ml-64"]');
      if (mainContent) {
        const computedStyle = window.getComputedStyle(mainContent);
        const marginLeft = computedStyle.marginLeft;
        const isCollapsed = marginLeft === '4rem' || marginLeft === '64px';
        setSidebarCollapsed(isCollapsed);
      } else {
        setSidebarCollapsed(storedState);
      }
    };
    
    window.addEventListener('storage', handleStorage);
    checkSidebarState();
    
    // Check periodically to catch dynamic changes
    const interval = setInterval(checkSidebarState, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Fetch seat status when component mounts or date/show changes
  useEffect(() => {
    if (selectedDate && selectedShow && !disableAutoFetch) {
      fetchSeatStatus();
    }
  }, [selectedDate, selectedShow, disableAutoFetch]); // Removed fetchSeatStatus from dependencies

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
  }, [moveMode]);

  // Auto-enable move mode when contiguous block is selected
  useEffect(() => {
    if (selectedSeats.length > 1 && !moveMode && !bmsMode) {
      // Check if selected seats are contiguous
      const sortedSeats = selectedSeats.sort((a, b) => {
        if (a.row !== b.row) return a.row.localeCompare(b.row);
        return a.number - b.number;
      });

      // Verify contiguity
      let isContiguous = true;
      for (let i = 1; i < sortedSeats.length; i++) {
        const prev = sortedSeats[i - 1];
        const curr = sortedSeats[i];
        if (prev.row !== curr.row || curr.number !== prev.number + 1) {
          isContiguous = false;
          break;
        }
      }

      if (isContiguous) {
        setMoveMode(true);
        // toast({
        //   title: 'Move Mode Enabled',
        //   description: `You've selected ${selectedSeats.length} contiguous seats. Click anywhere to move the block. Press ESC to cancel.`,
        // });
      }
    } else if (selectedSeats.length <= 1 && moveMode) {
      // Exit move mode if less than 2 seats are selected
      setMoveMode(false);
    }
  }, [selectedSeats, moveMode, bmsMode]);

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
          {showRefreshButton ? (
            <Button
              onClick={fetchSeatStatus}
              disabled={loadingSeats}
              size="sm"
              variant="outline"
            >
              <RotateCcw className={`w-4 h-4 mr-2 ${loadingSeats ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          ) : !hideRefreshButton && (
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
                          
                          // Debug: Log seat details for first few seats to see what's happening
                          
                          const finalClassName = `w-9 h-9 rounded-md font-medium text-xs border transition-all ${
                            bmsMode && seat.status === 'BMS_BOOKED' 
                              ? 'bg-blue-500 text-white cursor-pointer hover:bg-blue-600' 
                              : getSeatColor(seat.status)
                          }`;
                          
                          // Force important classes for booked/BMS seats to ensure they're visible
                          const forceImportantClass = seat.status === 'BOOKED' 
                            ? '!bg-red-500 !text-white' 
                            : seat.status === 'BMS_BOOKED' 
                            ? '!bg-blue-500 !text-white' 
                            : '';
                          

                          
                          // Add inline styles as backup for booked/BMS seats
                          const inlineStyle = seat.status === 'BOOKED' 
                            ? { backgroundColor: '#ef4444', color: 'white' } // red-500
                            : seat.status === 'BMS_BOOKED' 
                            ? { backgroundColor: '#3b82f6', color: 'white' } // blue-500
                            : {};
                          
                          return (
                            <button
                              key={seat.id || `${row}-${seatNum}`}
                              className={`${finalClassName} ${forceImportantClass}`}
                              style={inlineStyle}
                              title={`${seat.id} - ${seat.status}${bmsMode ? ' (BMS Mode)' : ''}`}
                              onClick={() => handleSeatClick(seat)}
                              disabled={seat.status === 'BOOKED' || seat.status === 'BLOCKED' || (!bmsMode && seat.status === 'BMS_BOOKED')}
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
      <div className="grid grid-cols-4 gap-4 mb-6">
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
      </div>

      {/* Screen Indicator */}
      <div className="mb-8">
        <div className="bg-gray-800 text-white text-center py-3 rounded-lg mb-4">
          <span className="text-lg font-medium">🎬 SCREEN</span>
        </div>
      </div>

      {/* Fixed Bottom Panel - Only show if not hidden */}
      {!hideProceedButton && (
        <div 
          className="fixed bottom-0 z-[9999] bg-white border-t border-gray-200 flex flex-row items-center justify-between px-6 py-4 shadow-lg animate-fade-in transition-all duration-300"
          style={{ 
            zIndex: 9999, 
            position: 'fixed', 
            bottom: 0,
            left: sidebarCollapsed ? '4rem' : '16rem',
            right: 0
          }}
        >
          <div className="flex items-center gap-6">
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
                if (onProceed) {
                  onProceed({ selectedSeats, totalAmount, seats });
                }
              }}
            >
              Proceed to Checkout
            </Button>
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-700">Selected: {selectedSeats.length} seats</span>
              <span className="font-medium text-gray-700">Total: ₹{totalAmount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatGrid;