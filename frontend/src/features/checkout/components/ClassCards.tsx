/**
 * Class Cards component extracted from Checkout.tsx
 * Industry standard: Presentational component focused on UI
 */

import React, { useMemo } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';

interface ClassCardsProps {
  createClassInfo: any[];
  onClassClick: (cls: any) => void;
  isAccessible?: boolean;
}

export const ClassCards: React.FC<ClassCardsProps> = ({ 
  createClassInfo, 
  onClassClick, 
  isAccessible = true 
}) => {
  const { seats } = useBookingStore();
  const { getPriceForClass } = useSettingsStore();

  // Memoize selected seats to prevent recalculation on every render
  const selectedSeats = useMemo(() => 
    seats.filter(seat => seat.status === 'SELECTED'),
    [seats]
  );

  // Memoize class statistics to prevent recalculation on every render
  const classStats = useMemo(() => {
    const stats = new Map<string, {
      total: number;
      available: number;
      sold: number;
      bmsBooked: number;
      selected: number;
    }>();

    createClassInfo.forEach(cls => {
      const classSeats = seats.filter(seat => cls.rows.includes(seat.row));
      stats.set(cls.key, {
        total: classSeats.length,
        available: classSeats.filter(seat => seat.status !== 'BOOKED' && seat.status !== 'BMS_BOOKED').length,
        sold: classSeats.filter(seat => seat.status === 'BOOKED').length,
        bmsBooked: classSeats.filter(seat => seat.status === 'BMS_BOOKED').length,
        selected: selectedSeats.filter(seat => cls.rows.includes(seat.row)).length,
      });
    });

    return stats;
  }, [seats, selectedSeats, createClassInfo]);

  return (
    <>
      {createClassInfo.map((cls, i) => {
        const stats = classStats.get(cls.key) || {
          total: 0,
          available: 0,
          sold: 0,
          bmsBooked: 0,
          selected: 0,
        };
        const { total, available, sold, bmsBooked, selected } = stats;
        const price = getPriceForClass(cls.label);
        
        // Original color mapping
        const colorMap = {
          BOX: 'bg-cyan-200',
          'STAR CLASS': 'bg-cyan-400',
          CLASSIC: 'bg-yellow-200',
          'FIRST CLASS': 'bg-pink-300',
          'SECOND CLASS': 'bg-gray-300',
        };
        
        // Determine uniform rectangular card styling (no rounded corners, no gaps)
        const cardClass = 'rounded-none';
        
        // Display label mapping (visual only, does not affect logic)
        const displayLabel = cls.label
          .replace('STAR CLASS', 'STAR')
          .replace('FIRST CLASS', 'FIRST')
          .replace('SECOND CLASS', 'SECOND');
        
        return (
          <div
            key={cls.key}
            className={`class-card relative z-0 flex flex-col flex-1 basis-[160px] min-w-[160px] h-[84px] px-4 py-2 border border-white/40 shadow-sm transition ${
              isAccessible ? 'cursor-pointer hover:brightness-105 hover:shadow-md' : 'cursor-not-allowed opacity-50'
            } ${colorMap[cls.label as keyof typeof colorMap]} ${cardClass}`}
            onClick={() => isAccessible && onClassClick(cls)}
          >
            {/* Row 1: LABEL  total(available) ........ sold */}
            <div className="flex items-center justify-between w-full mx-3">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-bold text-lg whitespace-nowrap">{displayLabel}</span>
                <span className="text-sm text-gray-700 whitespace-nowrap">{total} ({available})</span>
              </div>
              <span className="text-[10px] font-semibold pr-2">{sold}</span>
            </div>

            {/* Row 2: BMS: x  SEL: y  ₹price */}
            <div className="mt-1 flex items-center justify-between w-full mx-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-blue-700">BMS: {bmsBooked}</span>
                <span className="text-xs text-green-700">Selected: {selected}</span>
              </div>
              <span className="text-lg font-bold pr-1">₹{price}</span>
            </div>
          </div>
        );
      })}
    </>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(ClassCards);
