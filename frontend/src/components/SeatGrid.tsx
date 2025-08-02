import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBookingStore, SeatStatus, Seat } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { seatsByRow } from '@/lib/seatMatrix';
import { RotateCcw, Loader2, Globe, X, Move } from 'lucide-react';
import { SEAT_CLASSES, getSeatClassByRow } from '@/lib/config';
import { useSettingsStore } from '@/store/settingsStore';
import { getSeatStatus, saveBmsSeatStatus } from '@/services/api';
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
  // const { toast } = useToast();
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [bmsMode, setBmsMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);

  // Memoize fetchSeatStatus to prevent unnecessary re-creations
  const fetchSeatStatus = useCallback(async () => {
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
        
        console.log('🔍 Debug seat IDs:', {
          bookedSeats: Array.from(bookedSeatIds),
          bmsSeats: Array.from(bmsSeatIds),
          totalSeats: seats.length,
          sampleSeatIds: seats.slice(0, 5).map(s => s.id),
          sampleSeatDetails: seats.slice(0, 5).map(s => ({ id: s.id, row: s.row, number: s.number, status: s.status }))
        });
        
        // Use the new syncSeatStatus function to properly sync seat status
        syncSeatStatus(Array.from(bookedSeatIds), Array.from(bmsSeatIds));
        
        console.log(`✅ Updated ${bookedSeatIds.size} seats as booked and ${bmsSeatIds.size} seats as BMS`);
        
        // Debug: Check actual seat statuses after sync
        const bookedSeatsAfterSync = seats.filter(s => s.status === 'booked');
        const bmsSeatsAfterSync = seats.filter(s => s.status === 'bms-booked');
        console.log('🔍 After sync - Actual seat statuses:', {
          totalSeats: seats.length,
          bookedSeats: bookedSeatsAfterSync.length,
          bmsSeats: bmsSeatsAfterSync.length,
          sampleBookedSeats: bookedSeatsAfterSync.slice(0, 3).map(s => ({ id: s.id, row: s.row, number: s.number })),
          sampleBmsSeats: bmsSeatsAfterSync.slice(0, 3).map(s => ({ id: s.id, row: s.row, number: s.number }))
        });
        
        // Debug: Check if seats are actually being rendered with correct status
        console.log('🎯 Seat Grid Debug - Checking seat rendering:', {
          selectedDate,
          selectedShow,
          seatsWithStatus: seats.filter(s => s.status !== 'available').slice(0, 5).map(s => ({
            id: s.id,
            row: s.row,
            number: s.number,
            status: s.status,
            color: s.status === 'booked' ? 'red' : s.status === 'bms-booked' ? 'blue' : 'green'
          }))
        });
        
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
    
    // Debug: Log seat map details
    const bookedSeatsInMap = Object.values(map).filter(s => s.status === 'booked');
    const bmsSeatsInMap = Object.values(map).filter(s => s.status === 'bms-booked');
    console.log('🗺️ Seat Map Debug:', {
      totalSeatsInMap: Object.keys(map).length,
      bookedSeatsInMap: bookedSeatsInMap.length,
      bmsSeatsInMap: bmsSeatsInMap.length,
      sampleBookedSeats: bookedSeatsInMap.slice(0, 3).map(s => ({ id: s.id, row: s.row, number: s.number, status: s.status })),
      sampleBmsSeats: bmsSeatsInMap.slice(0, 3).map(s => ({ id: s.id, row: s.row, number: s.number, status: s.status }))
    });
    
    return map;
  }, [seats]);

  // Memoize seat color and icon functions
  const getSeatColor = useCallback((status: SeatStatus) => {
    const colorClass = (() => {
      switch (status) {
        case 'available': return 'bg-green-500 hover:bg-green-600 text-white cursor-pointer';
        case 'selected': return 'bg-yellow-500 hover:bg-yellow-600 text-white cursor-pointer';
        case 'booked': return 'bg-red-500 text-white cursor-not-allowed opacity-70';
        case 'blocked': return 'bg-gray-400 text-white cursor-not-allowed opacity-70';
        case 'bms-booked': return 'bg-blue-500 text-white cursor-not-allowed opacity-70';
        default: return 'bg-gray-300 cursor-not-allowed';
      }
    })();
    
    // Debug: Log color classes for booked/BMS seats
    if (status === 'booked' || status === 'bms-booked') {
      console.log('🎨 Color class for status:', { status, colorClass });
    }
    
    return colorClass;
  }, []);

  const getSeatIcon = useCallback((status: SeatStatus) => {
    switch (status) {
      case 'available': return '✓';
      case 'selected': return '✓';
      case 'booked': return '✗';
      case 'blocked': return '✗';
      case 'bms-booked': return '🌐';
      default: return '?';
    }
  }, []);

  // Enhanced seat click handler with BMS mode and move mode
  const handleSeatClick = async (seat: Seat) => {
    if (moveMode) {
      // Move Mode: Allow deselection of selected seats or moving to available seats
      if (seat.status === 'selected') {
        // Allow deselection of selected seats in move mode
        toggleSeatStatus(seat.id, 'available');
      } else if (seat.status === 'available') {
        // Move block to this available seat
        executeMove(seat);
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
      if (seat.status === 'available') {
        toggleSeatStatus(seat.id, 'bms-booked');
        // Save to backend
        try {
          await saveBmsSeatStatus([seat.id], 'BMS_BOOKED', selectedDate, selectedShow);
          console.log(`✅ Saved BMS status for seat ${seat.id}`);
        } catch (error) {
          console.error('❌ Failed to save BMS status:', error);
          // Revert the change if backend save failed
          toggleSeatStatus(seat.id, 'available');
          // toast({
          //   title: 'Error',
          //   description: 'Failed to save BMS status. Please try again.',
          //   variant: 'destructive',
          // });
        }
      } else if (seat.status === 'bms-booked') {
        toggleSeatStatus(seat.id, 'available');
        // Save to backend
        try {
          await saveBmsSeatStatus([seat.id], 'AVAILABLE', selectedDate, selectedShow);
          console.log(`✅ Removed BMS status for seat ${seat.id}`);
        } catch (error) {
          console.error('❌ Failed to remove BMS status:', error);
          // Revert the change if backend save failed
          toggleSeatStatus(seat.id, 'bms-booked');
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
      toggleSeatStatus(seat.id, 'available');
    });
    
    if (moveMode) {
      setMoveMode(false);
    }
    
    // toast({
    //   title: 'Selection Cleared',
    //   description: 'All selected seats have been cleared.',
    // });
  };

  const executeMove = (targetSeat: Seat) => {
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
      
      if (!checkSeat || checkSeat.status !== 'available') {
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

    // Deselect current seats
    sortedSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'available');
    });

    // Select new seats
    for (let i = 0; i < blockSize; i++) {
      const newSeatNumber = targetStartNumber + i;
      const newSeat = seats.find(seat => seat.row === targetRow && seat.number === newSeatNumber);
      if (newSeat) {
        toggleSeatStatus(newSeat.id, 'selected');
      }
    }

    setMoveMode(false);
    // toast({
    //   title: 'Block Moved',
    //   description: `Moved ${blockSize} seats to ${targetRow}${targetStartNumber}-${targetStartNumber + blockSize - 1}`,
    // });
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
  
  // Debug: Log seat statistics when they change
  useEffect(() => {
    if (disableAutoFetch) {
      console.log('🔍 SeatGrid Preview Mode - Seat Statistics:', {
        totalSeats: seats.length,
        available: availableCount,
        booked: bookedCount,
        bmsBooked: bmsBookedCount,
        blocked: blockedCount,
        selectedDate,
        selectedShow
      });
    }
  }, [seats, availableCount, bookedCount, bmsBookedCount, blockedCount, selectedDate, selectedShow, disableAutoFetch]);

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
    if (selectedDate && selectedShow && !disableAutoFetch) {
      // Reduced logging to prevent console spam
      console.log('🔄 SeatGrid: Fetching seat status for:', { date: selectedDate, show: selectedShow });
      fetchSeatStatus();
    } else if (disableAutoFetch) {
      console.log('🚫 SeatGrid: Auto-fetch disabled for preview mode');
    } else {
      console.log('⚠️ SeatGrid: Missing date or show:', { selectedDate, selectedShow });
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
          {moveMode && (
            <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
              <Move className="w-4 h-4" />
              Move Mode Active
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

          {moveMode && (
            <Button
              onClick={cancelMoveMode}
              disabled={loadingSeats}
              size="sm"
              variant="outline"
              className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Move
            </Button>
          )}
          {selectedSeats.length > 0 && (
            <Button
              onClick={clearSelection}
              disabled={loadingSeats}
              size="sm"
              variant="outline"
              className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Selection
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
                          if (idx < 3 && (seat.status === 'booked' || seat.status === 'bms-booked')) {
                            const seatColorClass = getSeatColor(seat.status);
                            console.log('🎯 Rendering seat:', {
                              seatId: seat.id,
                              row: seat.row,
                              number: seat.number,
                              status: seat.status,
                              seatKey: `${row}${seatNum}`,
                              color: seat.status === 'booked' ? 'red' : seat.status === 'bms-booked' ? 'blue' : 'green',
                              cssClass: seatColorClass,
                              icon: getSeatIcon(seat.status),
                              visible: true
                            });
                          }
                          
                          const finalClassName = `w-9 h-9 rounded-md font-medium text-xs border transition-all ${
                            bmsMode && seat.status === 'bms-booked' 
                              ? 'bg-blue-500 text-white cursor-pointer hover:bg-blue-600' 
                              : getSeatColor(seat.status)
                          }`;
                          
                          // Force important classes for booked/BMS seats to ensure they're visible
                          const forceImportantClass = seat.status === 'booked' 
                            ? '!bg-red-500 !text-white' 
                            : seat.status === 'bms-booked' 
                            ? '!bg-blue-500 !text-white' 
                            : '';
                          
                          // Debug: Log the final CSS class for booked/BMS seats
                          if (seat.status === 'booked' || seat.status === 'bms-booked') {
                            console.log('🎨 Final CSS class for seat:', {
                              seatId: seat.id,
                              status: seat.status,
                              className: finalClassName,
                              hasBlueClass: finalClassName.includes('bg-blue-500'),
                              hasRedClass: finalClassName.includes('bg-red-500')
                            });
                          }
                          
                          // Add inline styles as backup for booked/BMS seats
                          const inlineStyle = seat.status === 'booked' 
                            ? { backgroundColor: '#ef4444', color: 'white' } // red-500
                            : seat.status === 'bms-booked' 
                            ? { backgroundColor: '#3b82f6', color: 'white' } // blue-500
                            : {};
                          
                          return (
                            <button
                              key={seat.id || `${row}-${seatNum}`}
                              className={`${finalClassName} ${forceImportantClass}`}
                              style={inlineStyle}
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