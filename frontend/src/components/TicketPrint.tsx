import React, { useState } from 'react';

// Types for seat and ticket group
interface Seat {
  id: string;
  row: string;
  number: number;
  classLabel: string;
  price: number;
}

interface TicketGroup {
  classLabel: string;
  row: string;
  seats: number[];
  price: number;
  seatIds: string[];
}

interface TicketPrintProps {
  selectedSeats: Seat[];
  onUnfork?: (groupSeats: { id: string }[]) => void;
  onDelete?: (seatIds: string[]) => void;
  decoupledSeatIds?: string[];
  onRegroup?: (seatId: string) => void;
  onReset?: () => void;
}

// Helper: group seats by class and row, and split into ranges/commas
function groupSeats(seats: Seat[], decoupledSeatIds: string[] = []): TicketGroup[] {
  // Group by class and row, but treat decoupled seats as their own group
  const groups: Record<string, TicketGroup> = {};
  seats.forEach(seat => {
    const isDecoupled = decoupledSeatIds.includes(seat.id);
    const key = isDecoupled ? `${seat.classLabel}|${seat.row}|${seat.id}` : `${seat.classLabel}|${seat.row}`;
    if (!groups[key]) {
      groups[key] = {
        classLabel: seat.classLabel,
        row: seat.row,
        seats: [],
        price: 0,
        seatIds: [],
      };
    }
    groups[key].seats.push(seat.number);
    groups[key].price += seat.price;
    groups[key].seatIds.push(seat.id);
  });
  // Sort seat numbers in each group
  Object.values(groups).forEach(g => g.seats.sort((a, b) => a - b));
  return Object.values(groups);
}

// Helper: format seat numbers as range or comma-separated
function formatSeatNumbers(seats: number[]): string {
  if (seats.length === 1) return seats[0].toString();
  // Check if continuous
  let ranges: string[] = [];
  let start = seats[0], end = seats[0];
  for (let i = 1; i <= seats.length; i++) {
    if (seats[i] === end + 1) {
      end = seats[i];
    } else {
      if (start === end) ranges.push(`${start}`);
      else ranges.push(`${start} - ${end}`);
      start = seats[i];
      end = seats[i];
    }
  }
  return ranges.join(', ');
}

const classColorMap: Record<string, string> = {
  'BOX': 'bg-cyan-200',
  'STAR CLASS': 'bg-cyan-400',
  'CLASSIC': 'bg-yellow-200',
  'FIRST CLASS': 'bg-pink-300',
  'SECOND CLASS': 'bg-gray-300',
};

const TicketPrint: React.FC<TicketPrintProps> = ({ selectedSeats, onUnfork, onDelete, decoupledSeatIds = [], onRegroup, onReset }) => {
  const groups = groupSeats(selectedSeats, decoupledSeatIds);
  const total = groups.reduce((sum, g) => sum + g.price, 0);
  const totalTickets = selectedSeats.length;
  const [selectedGroupIdxs, setSelectedGroupIdxs] = useState<number[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const toggleGroupSelection = (idx: number) => {
    setSelectedGroupIdxs(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleDelete = () => {
    if (!onDelete) return;
    const seatIdsToDelete = selectedGroupIdxs.flatMap(idx => groups[idx].seatIds);
    onDelete(seatIdsToDelete);
    setSelectedGroupIdxs([]);
  };

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const handleConfirmPrint = () => {
    setShowPrintModal(false);
    // Placeholder: replace with actual print logic
    alert('Printing tickets...');
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 w-80 relative flex flex-col" style={{height: '500px', marginTop: 0}}>
      {/* Reset icon at top right */}
      {onReset && (
        <button
          className="absolute top-2 right-2 text-red-500 hover:text-red-700 z-20"
          title="Reset all tickets"
          onClick={onReset}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M7 7H3V3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 7a9 9 0 1 1 2.12 9.17" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
      <div className="font-semibold text-lg px-4 pt-2 pb-3 border-b border-gray-200 mb-2">Tickets</div>
      {/* Scrollable ticket list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 max-h-80 px-2">
        {groups.map((g, idx) => {
          const isDecoupled = g.seatIds.length === 1 && decoupledSeatIds.includes(g.seatIds[0]);
          const colorClass = classColorMap[g.classLabel] || 'bg-cyan-300';
          return (
            <div
              key={g.classLabel + g.row + g.seats.join(',')}
              className={`rounded-2xl shadow-md px-6 py-3 mb-3 cursor-pointer relative transition border-2 flex flex-col justify-between ${colorClass} ${selectedGroupIdxs.includes(idx) ? 'border-blue-500 bg-blue-100' : 'border-transparent'}`}
              onClick={() => toggleGroupSelection(idx)}
            >
              {/* Top row: label left, fork icon then checkbox right */}
              <div className="flex items-start justify-between w-full">
                <div className="font-bold text-base">
                  {g.classLabel} {g.row.replace(/^[^-]+-/, '')} {formatSeatNumbers(g.seats)}
                </div>
                <div className="flex items-center gap-2 ml-1">
                  {/* Decouple (unfork) icon for grouped tickets */}
                  {onUnfork && g.seats.length > 1 && !isDecoupled && (
                    <button
                      className="text-blue-700 hover:text-blue-900 mt-1"
                      title="Ungroup tickets"
                      onClick={e => {
                        e.stopPropagation();
                        onUnfork(g.seatIds.map(id => ({ id })));
                      }}
                    >
                      {/* Simple Y fork icon, no arrowheads, rounded ends, smaller size */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 19V9" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round"/>
                        <path d="M12 9L7 5" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round"/>
                        <path d="M12 9L17 5" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                  <input
                    type="checkbox"
                    checked={selectedGroupIdxs.includes(idx)}
                    onChange={() => toggleGroupSelection(idx)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>
              {/* Bottom row: price left, counter right */}
              <div className="flex items-end justify-between w-full mt-1">
                <div className="text-sm font-semibold">Price: ₹{g.price}</div>
                <div className="text-xs font-semibold">{g.seats.length}</div>
              </div>
            </div>
          );
        })}
        {/* Add spacing below last ticket card */}
        <div className="mb-4"></div>
      </div>
      {/* Sticky action bar at bottom */}
      <div className="sticky bottom-0 left-0 bg-white pt-2 pb-1 z-10 px-4">
        <hr className="my-2" />
        <div className="flex justify-between items-center w-full mb-3">
          <span>
            <span className="font-semibold">Total:</span>
            <span className="text-xl font-bold ml-2">₹ {total}</span>
          </span>
          <span className="text-xs bg-gray-200 rounded-full px-3 py-1 font-semibold">
            {totalTickets} ticket{totalTickets !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex justify-between items-center w-full mt-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded" onClick={handlePrint}>Print Tickets</button>
          <button
            className="bg-red-100 text-red-700 hover:bg-red-200 font-semibold px-4 py-2 rounded disabled:opacity-50"
            disabled={selectedGroupIdxs.length === 0}
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>
      {/* Print confirmation modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[350px] max-w-full">
            <div className="font-bold text-lg mb-2">Confirm Print</div>
            <div className="mb-4 max-h-60 overflow-y-auto">
              {groups.map((g, idx) => (
                <div key={g.classLabel + g.row + g.seats.join(',')} className="mb-2 p-2 rounded border bg-gray-50">
                  <div className="font-semibold">{g.classLabel} {g.row.replace(/^[^-]+-/, '')} {formatSeatNumbers(g.seats)}</div>
                  <div className="text-sm">Price: ₹{g.price} &nbsp; | &nbsp; Count: {g.seats.length}</div>
                </div>
              ))}
            </div>
            <div className="font-semibold mb-2">Total: ₹{total} ({totalTickets} ticket{totalTickets !== 1 ? 's' : ''})</div>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-semibold" onClick={() => setShowPrintModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={handleConfirmPrint}>Confirm Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketPrint; 