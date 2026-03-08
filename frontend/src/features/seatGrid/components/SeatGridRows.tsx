import React from 'react';
import { Seat } from '@/store/bookingStore';
import { seatsByRow } from '@/lib/seatMatrix';
import SeatButton from './SeatButton';

interface SeatSegment {
  label: string;
  rows: string[];
}

interface SeatGridRowsProps {
  seatSegments: SeatSegment[];
  seatMap: Record<string, Seat>;
  bmsMode: boolean;
  onSeatClick: (seat: Seat) => void;
}

/**
 * Component for rendering seat grid rows
 * Extracted from SeatGrid for reusability
 */
const SeatGridRows: React.FC<SeatGridRowsProps> = ({
  seatSegments,
  seatMap,
  bmsMode,
  onSeatClick
}) => {
  return (
    <div className="space-y-1 mb-0 w-full px-2">
      {seatSegments.map((segment, segIdx) => {
        const displayLabel = segment.label === 'CLASSIC' ? 'CLASSIC BALCONY' : segment.label;
        
        return (
          <div key={segment.label} className="mb-1">
            {/* Section label on separate row */}
            <div className="mb-1">
              <div 
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F5F5F6]"
                style={{ 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <span className="text-xs font-normal text-[#1A1A1A] whitespace-nowrap" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>
                  {displayLabel}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              {segment.rows.map((row) => {
                return (
                  <div key={row} className="flex flex-row items-center w-full">
                    {/* Row label on left */}
                    <div className="w-16 text-right font-medium text-gray-600 pr-4 text-xs flex-shrink-0">
                      {row.replace(/^[^-]+-/, '')}
                    </div>
                    <div className="flex justify-center flex-1 min-w-0 overflow-hidden">
                      <div
                        className="grid gap-1"
                        style={{
                          maxWidth: '100%',
                          gridTemplateColumns: (() => {
                            const isBoxRow = row.startsWith('BOX');
                            if (!isBoxRow) return `repeat(${(seatsByRow as any)[row].length}, minmax(0, 1fr))`;
                            const starRowKey = Object.keys(seatsByRow).find(k => k.startsWith('SC-')) as string | undefined;
                            const starCols = starRowKey ? (seatsByRow as any)[starRowKey].length : undefined;
                            const boxLen = (seatsByRow as any)[row].length;
                            const totalCols = starCols ? starCols : boxLen + 2;
                            return `repeat(${totalCols}, minmax(0, 1fr))`;
                          })()
                        }}
                      >
                        {/* BOX rows: no leading offset so first seat aligns with Classic Balcony */}
                        {row.startsWith('BOX') && null}
                        {(seatsByRow as any)[row].map((seatNum: string, idx: number) => {
                          if (seatNum === '') {
                            return <div key={idx} className="w-10 h-10" style={{ visibility: 'hidden' }} />;
                          }
                          const seat = seatMap[`${row}${seatNum}`];
                          if (!seat) return <div key={idx} className="w-10 h-10" />;

                          return (
                            <SeatButton 
                              key={seat.id || `${row}-${seatNum}`}
                              seat={seat}
                              bmsMode={bmsMode}
                              onSeatClick={onSeatClick}
                            />
                          );
                        })}
                        {/* Trailing placeholders to keep BOX total columns equal to Star Class */}
                        {row.startsWith('BOX') &&
                          (() => {
                            const starRowKey = Object.keys(seatsByRow).find(k => k.startsWith('SC-')) as string | undefined;
                            const starCols = starRowKey ? (seatsByRow as any)[starRowKey].length : undefined;
                            const boxLen = (seatsByRow as any)[row].length;
                            const totalCols = starCols ? starCols : boxLen;
                            const trailing = Math.max(totalCols - boxLen, 0);
                            return Array.from({ length: trailing }).map((_, i) => (
                              <div key={`box-offset-end-${row}-${i}`} className="w-10 h-10" style={{ visibility: 'hidden' }} />
                            ));
                          })()}
                      </div>
                    </div>
                    {/* Row label on right */}
                    <div className="w-16 text-left font-medium text-gray-600 pl-4 text-xs flex-shrink-0">
                      {row.replace(/^[^-]+-/, '')}
                    </div>
                  </div>
                );
              })}
            </div>
            {segIdx < seatSegments.length - 1 && (
              <div className="my-2" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(SeatGridRows);

