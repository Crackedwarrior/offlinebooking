/**
 * Seat Grid Preview - Shows a smaller version of the seat grid with full data loading
 * Allows bookie to see and interact with seat availability in a compact format
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { getSeatStatus } from '@/services/api';
import { SEAT_CLASSES, getSeatClassByRow } from '@/lib/config';
import { seatsByRow } from '@/lib/seatMatrix';

interface SeatGridPreviewProps {
  selectedShow: string;
  selectedDate: string;
}

export const SeatGridPreview: React.FC<SeatGridPreviewProps> = ({
  selectedShow,
  selectedDate
}) => {
  console.log('🎯 SeatGridPreview component rendered!');
  console.log('🎯 Props:', { selectedShow, selectedDate });
  
  const { seats, syncSeatStatus, toggleSeatStatus } = useBookingStore();
  const [loading, setLoading] = useState(false);
  
  console.log('🎯 SeatGridPreview: seats count:', seats.length);

  // Load seat data when show or date changes (same as main seat grid)
  useEffect(() => {
    const loadSeatData = async () => {
      if (!selectedShow || !selectedDate) return;
      
      setLoading(true);
      try {
        console.log('🔄 SeatGridPreview: Loading seat data for', { selectedShow, selectedDate });
        
        const response = await getSeatStatus({ date: selectedDate, show: selectedShow as any });
        if (response.success && response.data) {
          const { bookedSeats, bmsSeats, selectedSeats } = response.data as any;
          const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
          const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
          const selectedSeatIds = selectedSeats ? selectedSeats.map((seat: any) => seat.seatId) : [];
          
          syncSeatStatus(bookedSeatIds, bmsSeatIds, selectedSeatIds);
          console.log('✅ SeatGridPreview: Seat data loaded successfully');
        }
      } catch (error) {
        console.error('❌ SeatGridPreview: Failed to load seat data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSeatData();
  }, [selectedShow, selectedDate, syncSeatStatus]);

  // Handle seat click (same as main seat grid)
  const handleSeatClick = useCallback((seatId: string, currentStatus: string) => {
    console.log('🪑 SeatGridPreview: Seat clicked', { seatId, currentStatus });
    
    if (currentStatus === 'AVAILABLE') {
      toggleSeatStatus(seatId, 'SELECTED');
    } else if (currentStatus === 'SELECTED') {
      toggleSeatStatus(seatId, 'AVAILABLE');
    }
  }, [toggleSeatStatus]);

  // Get seats for current show/date (same filtering as main seat grid)
  const showSeats = seats.filter(seat =>
    seat.row && seat.number &&
    (seat.status === 'AVAILABLE' || seat.status === 'BOOKED' || seat.status === 'BMS_BOOKED' || seat.status === 'SELECTED')
  );

  // Build seat map like original SeatGrid
  const seatMap = showSeats.reduce((acc, seat) => {
    acc[`${seat.row}${seat.number}`] = seat;
    return acc;
  }, {} as Record<string, any>);

  // Get seat segments like original SeatGrid
  const seatSegments = SEAT_CLASSES.map(cls => ({
    label: cls.label,
    rows: cls.rows
  }));


  const getSeatColor = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 'bg-red-500 hover:bg-red-600';
      case 'BMS_BOOKED':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'SELECTED':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-green-500 hover:bg-green-600';
    }
  };

  const getSeatIcon = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return '🔒';
      case 'BMS_BOOKED':
        return '🌐';
      case 'SELECTED':
        return '✓';
      default:
        return '';
    }
  };

  console.log('🎯 SeatGridPreview: About to render with', { seatSegments: seatSegments.length, showSeats: showSeats.length });
  
  return (
    <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm w-full flex flex-col min-h-0 overflow-x-hidden">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">Seat Map</h4>
        {loading && (
          <div className="flex items-center gap-1 text-blue-600">
            <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Loading...</span>
          </div>
        )}
      </div>
      
      {/* Original SeatGrid layout structure */}
      <div className="bg-gray-50 p-3 rounded border flex-1 min-h-0 flex flex-col max-h-[40vh] md:max-h-[45vh] lg:max-h-[50vh]">
        <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-auto scrollbar-thin">
          <div className="space-y-4 mb-4 w-full">
            {seatSegments.map((segment, segIdx) => (
              <div key={segment.label}>
                <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">{segment.label}</div>
                <div className="space-y-2">
                  {segment.rows.map(row => {
                    // Special layout for BOX seats to match theater arrangement
                    const isBoxRow = row.startsWith('BOX');
                    
                    return (
                      <div key={row} className="flex flex-row items-center w-full">
                        <div className="w-16 text-right font-semibold text-gray-700 pr-2 text-xs">
                          {row.replace(/^[^-]+-/, '')}
                        </div>
                        <div className={`flex justify-center w-full`}>
                          <div
                            className={`grid ${isBoxRow ? 'gap-0.5' : 'gap-1'}`}
                            style={{ 
                              // For BOX rows, set total columns to match STAR CLASS so alignment is relative to it
                              // Otherwise, use the native row length
                              gridTemplateColumns: (() => {
                                if (!isBoxRow) return `repeat(${seatsByRow[row].length}, minmax(0, 1fr))`;
                                const starRowKey = Object.keys(seatsByRow).find(k => k.startsWith('SC-')) as string | undefined;
                                const starCols = starRowKey ? (seatsByRow as any)[starRowKey].length : undefined;
                                const boxLen = (seatsByRow as any)[row].length;
                                const totalCols = starCols ? starCols : boxLen + 1; // fallback: one-column offset
                                return `repeat(${totalCols}, minmax(0, 1fr))`;
                              })()
                            }}
                          >
                            {/* Leading placeholders to create alignment offset ONLY for BOX rows */}
                            {isBoxRow && (() => {
                              const placeholders = [] as JSX.Element[];
                              for (let i = 0; i < 1; i++) {
                                placeholders.push(<div key={`box-offset-start-${row}-${i}`} className="w-5 h-5" style={{ visibility: 'hidden' }} />);
                              }
                              return placeholders;
                            })()}
                            {seatsByRow[row].map((seatNum, idx) => {
                              if (seatNum === '') {
                                return <div key={idx} className="w-5 h-5" style={{ visibility: 'hidden' }} />;
                              }
                              const seat = seatMap[`${row}${seatNum}`];
                              if (!seat) return <div key={idx} className="w-5 h-5 bg-gray-200" />;
                              
                              const finalClassName = `w-5 h-5 rounded-sm font-medium text-[10px] border border-gray-400 transition-all cursor-pointer hover:scale-110 text-white ${getSeatColor(seat.status)}`;
                              
                              return (
                                <button
                                  key={seat.id || `${row}-${seatNum}`}
                                  className={finalClassName}
                                  title={`${seat.id} - ${seat.status}`}
                                  onClick={() => handleSeatClick(seat.id, seat.status)}
                                  disabled={seat.status === 'BOOKED' || seat.status === 'BMS_BOOKED'}
                                >
                                  {seat.number}
                                </button>
                              );
                            })}
                            {/* Trailing placeholders so BOX rows keep same total columns as STAR CLASS */}
                            {isBoxRow && (() => {
                              const starRowKey = Object.keys(seatsByRow).find(k => k.startsWith('SC-')) as string | undefined;
                              const starCols = starRowKey ? (seatsByRow as any)[starRowKey].length : undefined;
                              const boxLen = (seatsByRow as any)[row].length;
                              const totalCols = starCols ? starCols : boxLen + 1;
                              const trailing = Math.max(totalCols - 1 - boxLen, 0);
                              return Array.from({ length: trailing }).map((_, i) => (
                                <div key={`box-offset-end-${row}-${i}`} className="w-5 h-5" style={{ visibility: 'hidden' }} />
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {segIdx < seatSegments.length - 1 && (
                  <div className="border-b border-gray-200 my-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Original SeatGrid legend style */}
      <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>BMS</span>
        </div>
      </div>
      
      {/* Custom scrollbar styles */}
      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default SeatGridPreview;