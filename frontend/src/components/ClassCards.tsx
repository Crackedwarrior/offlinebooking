/**
 * Class Cards component extracted from Checkout.tsx
 * Industry standard: Presentational component focused on UI
 */

import React from 'react';
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

  // Get selected seats for display
  const selectedSeats = seats.filter(seat => seat.status === 'SELECTED');

  return (
    <>
      {createClassInfo.map((cls, i) => {
        const total = seats.filter(seat => cls.rows.includes(seat.row)).length;
        const available = seats.filter(seat => cls.rows.includes(seat.row) && seat.status !== 'BOOKED' && seat.status !== 'BMS_BOOKED').length;
        const sold = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'BOOKED').length;
        const bmsBooked = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'BMS_BOOKED').length;
        const selected = selectedSeats.filter(seat => cls.rows.includes(seat.row)).length;
        const price = getPriceForClass(cls.label);
        
        // Original color mapping
        const colorMap = {
          BOX: 'bg-cyan-200',
          'STAR CLASS': 'bg-cyan-400',
          CLASSIC: 'bg-yellow-200',
          'FIRST CLASS': 'bg-pink-300',
          'SECOND CLASS': 'bg-gray-300',
        };
        
        // Determine border radius and negative margin
        let cardClass = '';
        if (i === 0) cardClass = 'rounded-none -ml-2';
        else if (i === createClassInfo.length - 1) cardClass = 'rounded-r-xl -ml-2';
        else cardClass = 'rounded-none -ml-2';
        
        return (
          <div
            key={cls.key}
            className={`flex flex-col justify-between w-[200px] h-[120px] px-6 py-2 relative border border-white shadow-md transition-transform ${
              isAccessible ? 'hover:-translate-y-1 hover:shadow-lg cursor-pointer' : 'cursor-not-allowed opacity-50'
            } ${colorMap[cls.label as keyof typeof colorMap]} ${cardClass}`}
            onClick={() => isAccessible && onClassClick(cls)}
          >
            <div>
              <span className="font-bold text-lg whitespace-nowrap text-left">{cls.label}</span>
              <span className="block text-sm text-gray-700 text-left">{total} ({available})</span>
              {bmsBooked > 0 && (
                <span className="block text-xs text-blue-600 text-left">BMS: {bmsBooked}</span>
              )}
              {selected > 0 && (
                <span className="block text-xs text-green-600 font-semibold text-left">Selected: {selected}</span>
              )}
            </div>
            <div className="flex items-center justify-between w-full absolute left-0 bottom-2 px-6">
              <span className="text-[10px] font-semibold">{sold}</span>
              <span className="text-lg font-bold text-right">₹{price}</span>
            </div>
          </div>
        );
      })}
    </>
  );
};
