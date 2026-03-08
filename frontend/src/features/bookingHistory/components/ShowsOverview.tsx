/**
 * ShowsOverview Component
 * Displays show cards with stats and date picker
 */

import React, { memo } from 'react';
import { ShowTime } from '@/store/bookingStore';
import type { ShowInfo, ShowStats } from '@/types/bookingHistory';
import type { BookingAccentTheme } from '../utils/accentThemes';

interface ShowsOverviewProps {
  selectedShow: ShowTime | null;
  showOrder: ShowInfo[];
  allStats: Record<ShowTime, ShowStats>;
  onShowSelect: (show: ShowTime) => void;
  onViewSeats: (show: ShowInfo) => void;
  accentTheme: BookingAccentTheme;
}

type ShowVariant = {
  accent: string;
  pill: string;
  button: string;
  buttonHover: string;
  text: string;
};

const SHOW_VARIANTS: Record<ShowTime, ShowVariant> = {
  MORNING: {
    accent: '#4F7BFF',
    pill: '#EEF4FF',
    button: '#1E3A8A',
    buttonHover: '#172554',
    text: '#111827'
  },
  MATINEE: {
    accent: '#F6AA1C',
    pill: '#FFF3D6',
    button: '#B45309',
    buttonHover: '#92400E',
    text: '#111827'
  },
  EVENING: {
    accent: '#F97316',
    pill: '#FFE7D0',
    button: '#C2410C',
    buttonHover: '#9A3412',
    text: '#111827'
  },
  NIGHT: {
    accent: '#1E3A8A',
    pill: '#E0E7FF',
    button: '#0F172A',
    buttonHover: '#020617',
    text: '#0F172A'
  }
};

// ShowCard component
const ShowCard = memo(({ 
  show, 
  stats, 
  isSelected, 
  hasAnySelection,
  onSelect,
  onViewSeats
}: { 
  show: ShowInfo; 
  stats: ShowStats; 
  isSelected: boolean; 
  hasAnySelection: boolean;
  onSelect: (show: ShowTime) => void;
  onViewSeats: (show: ShowInfo) => void;
}) => {
  const variant = SHOW_VARIANTS[show.key] ?? SHOW_VARIANTS.MORNING;

  return (
    <div
      data-show-card
      className={`relative overflow-hidden rounded-[18px] border bg-white p-3 md:p-4 cursor-pointer transition-all duration-300 ${
        isSelected 
          ? 'shadow-xl scale-[1.02] z-10' 
          : hasAnySelection
            ? 'shadow-sm opacity-60 blur-[1px]'
            : 'shadow-sm hover:shadow-md'
      }`}
      style={{
        borderColor: isSelected ? variant.accent : variant.accent + '33',
        boxShadow: isSelected ? `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 2px ${variant.accent}40` : undefined
      }}
      onClick={() => onSelect(show.key)}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{
          backgroundColor: variant.accent
        }}
      />
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-900 text-base">
          {show.label}
        </h3>
        {isSelected && (
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: variant.accent }}
          />
        )}
      </div>
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-2xl font-semibold text-gray-900">{stats.occupancy}%</div>
        <div
          className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-0.5"
          style={{ backgroundColor: variant.pill, color: variant.text }}
        >
          Occupancy
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[11px] md:text-xs mb-2">
        <div className="flex items-center justify-center gap-1">
          <span className="text-gray-600">Booked:</span>
          <span className="font-semibold text-green-600">{stats.booked}</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-gray-600">BMS:</span>
          <span className="font-semibold text-blue-600">{stats.bms}</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-gray-600">Available:</span>
          <span className="font-semibold text-gray-700">{stats.available}</span>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewSeats(show);
        }}
        className="w-full text-white text-sm font-semibold py-2 md:py-2.5 rounded-xl transition-colors duration-200"
        style={{
          backgroundColor: variant.button
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = variant.buttonHover;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = variant.button;
        }}
      >
        View Seats
      </button>
    </div>
  );
});

ShowCard.displayName = 'ShowCard';

export const ShowsOverview: React.FC<ShowsOverviewProps> = ({
  selectedShow,
  showOrder,
  allStats,
  onShowSelect,
  onViewSeats,
  accentTheme
}) => {
  const hasSelection = selectedShow !== null;

  return (
    <div className="flex-1 p-4 pb-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-300">
        {showOrder.map(show => {
          const stats = allStats[show.key] || { total: 590, available: 590, booked: 0, bms: 0, blocked: 0, occupancy: '0.0' };
          const isSelected = selectedShow === show.key;
          return (
            <ShowCard
              key={show.key} 
              show={show} 
              stats={stats} 
              isSelected={isSelected}
              hasAnySelection={hasSelection}
              onSelect={onShowSelect}
              onViewSeats={onViewSeats}
            />
          );
        })}
      </div>
    </div>
  );
};

