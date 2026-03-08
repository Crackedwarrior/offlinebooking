/**
 * TicketList Component
 * Displays list of ticket groups
 */

import React from 'react';
import { formatSeatNumbers, type TicketGroup } from '@/utils/ticketGrouping';

interface TicketListProps {
  groups: TicketGroup[];
  selectedGroupIdxs: number[];
  onToggleSelection: (idx: number) => void;
  onDoubleClickDecouple: (seatIds: string[]) => void;
}

const rowLabel = (row: string) => row.replace(/^[^-]+-/, '');

export const TicketList: React.FC<TicketListProps> = ({
  groups,
  selectedGroupIdxs,
  onToggleSelection,
  onDoubleClickDecouple
}) => {
  if (groups.length === 0) return null;

  return (
    <div className="px-5 pb-2">
      <div 
        className="max-h-24 grid gap-3 overflow-y-auto hide-scrollbar"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gridAutoRows: 'minmax(36px, auto)' }}
      >
        {groups.map((g, idx) => {
          const summaryLeft = `${g.classLabel.split(' ')[0]} ${rowLabel(g.row)} (${formatSeatNumbers(g.seats)}) ×${g.seats.length}`;
          const summaryRight = `₹${g.price.toLocaleString('en-IN')}`;
          const isSelected = selectedGroupIdxs.includes(idx);
          
          return (
            <button
              key={g.classLabel + g.row + g.seats.join(',')}
              className={`relative w-full inline-flex items-center justify-between gap-3 text-sm font-medium transition border rounded-md px-4 py-2 bg-white shadow ${
                isSelected ? 'ring-2 ring-blue-300 border-blue-300' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onToggleSelection(idx)}
              onDoubleClick={() => onDoubleClickDecouple(g.seatIds)}
              title="Click to select for Delete; double-click to split"
            >
              <span className="pointer-events-none absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#fefcf6] border border-gray-200" />
              <span className="pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#fefcf6] border border-gray-200" />
              <span className="inline-flex items-center gap-2 text-gray-900 font-mono">
                {summaryLeft}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-6 border-l border-dashed border-gray-300" />
                <span className="text-gray-900 font-mono">{summaryRight}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

