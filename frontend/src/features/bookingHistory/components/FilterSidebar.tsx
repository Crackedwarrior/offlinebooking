/**
 * FilterSidebar Component
 * Left vertical filter bar for BookingHistory
 */

import React from 'react';
import { ShowTime } from '@/store/bookingStore';
import type { ShowInfo } from '@/types/bookingHistory';
import type { BookingAccentTheme } from '../utils/accentThemes';

interface FilterSidebarProps {
  selectedShow: ShowTime | null;
  showOrder: ShowInfo[];
  onToggleFilter: () => void;
  accentTheme: BookingAccentTheme;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  selectedShow,
  showOrder,
  onToggleFilter,
  accentTheme
}) => {
  return (
    <div className="w-8 md:w-10 flex-shrink-0 self-stretch">
      <div className="sticky top-0 h-full">
        <div
          className="h-full w-full rounded-md border flex flex-col items-center justify-center transition-colors duration-300"
          style={{
            backgroundColor: accentTheme.sidebarBackground,
            borderColor: accentTheme.sidebarBorder,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)'
          }}
        >
          <span
            className="[writing-mode:vertical-rl] rotate-180 leading-tight text-[11px] font-semibold text-center transition-colors duration-300"
            style={{ color: accentTheme.sidebarText }}
          >
            {selectedShow
              ? `Showing data for: ${showOrder.find(s => s.key === selectedShow)?.label ?? ''}`
              : 'Showing aggregated data for: All Shows'}
          </span>
          <button
            onClick={onToggleFilter}
            className="mt-2 underline [writing-mode:vertical-rl] rotate-180 text-[10px] font-medium transition-colors duration-300"
            style={{ color: accentTheme.sidebarButton }}
          >
            {selectedShow ? 'Clear Filter' : 'Filter by Show'}
          </button>
        </div>
      </div>
    </div>
  );
};

