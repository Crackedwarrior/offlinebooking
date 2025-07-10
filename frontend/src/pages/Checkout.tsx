import { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import ShowSelector from '@/components/ShowSelector';
import { getCurrentShowLabel } from '@/lib/utils';
import TicketPrint from '@/components/TicketPrint';
import { useRef } from 'react';
import SeatGrid from '@/components/SeatGrid';

const CLASS_INFO = [
  { key: 'BOX', label: 'BOX', color: 'bg-cyan-200', price: 150, rows: ['BOX-A', 'BOX-B', 'BOX-C'] },
  { key: 'STAR', label: 'STAR CLASS', color: 'bg-cyan-300', price: 150, rows: ['SC-A', 'SC-B', 'SC-C', 'SC-D'] },
  { key: 'CLASSIC', label: 'CLASSIC', color: 'bg-orange-200', price: 120, rows: ['CB-A', 'CB-B', 'CB-C', 'CB-D', 'CB-E', 'CB-F', 'CB-G', 'CB-H'] },
  { key: 'FIRST', label: 'FIRST CLASS', color: 'bg-pink-200', price: 70, rows: ['FC-A', 'FC-B', 'FC-C', 'FC-D', 'FC-E', 'FC-F', 'FC-G'] },
  { key: 'SECOND', label: 'SECOND CLASS', color: 'bg-gray-200', price: 50, rows: ['SC2-A', 'SC2-B'] },
];

const showOptions = ['Morning', 'Matinee', 'Evening', 'Night'];

const SHOW_DETAILS = {
  'Morning': { label: 'Morning Show', timing: '11:45 AM - 1:45 PM', price: 150 },
  'Matinee': { label: 'Matinee Show', timing: '2:00 PM - 5:00 PM', price: 150 },
  'Evening': { label: 'Evening Show', timing: '6:00 PM - 9:00 PM', price: 150 },
  'Night': { label: 'Night Show', timing: '9:00 PM - 12:00 PM', price: 150 },
};

function getCurrentShowKey() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes >= 360 && totalMinutes < 720) return 'Morning';
  if (totalMinutes >= 720 && totalMinutes < 1020) return 'Matinee';
  if (totalMinutes >= 1020 && totalMinutes < 1230) return 'Evening';
  return 'Night';
}

const Checkout = () => {
  const { seats, selectedShow, setSelectedShow, selectedDate, toggleSeatStatus, loadBookingForDate } = useBookingStore();
  const [ungroupKey, setUngroupKey] = useState(0); // for triggering ungroup
  const [decoupledSeatIds, setDecoupledSeatIds] = useState<string[]>([]);
  const [showDropdownOpen, setShowDropdownOpen] = useState(false);
  const showDropdownRef = useRef<HTMLDivElement>(null);
  // Block move state for passing to SeatGrid
  const [blockMove, setBlockMove] = useState<null | { row: string, start: number, length: number, seatIds: string[] }>(null);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showDropdownRef.current && !showDropdownRef.current.contains(event.target as Node)) {
        setShowDropdownOpen(false);
      }
    }
    if (showDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdownOpen]);

  // Handler for show selection
  const handleShowSelect = (showKey: string) => {
    setSelectedShow(showKey);
    loadBookingForDate(selectedDate, showKey);
    setShowDropdownOpen(false);
  };

  // Group selected seats by class
  const selectedSeats = seats.filter(seat => seat.status === 'booked');
  const classCounts = CLASS_INFO.map(cls => {
    const count = selectedSeats.filter(seat => cls.rows.includes(seat.row)).length;
    return { ...cls, count };
  });
  const total = classCounts.reduce((sum, cls) => sum + cls.count * cls.price, 0);

  // For TicketPrint: map to required format, only include 'booked' seats
  const ticketSeats = selectedSeats
    .filter(seat => seat.status === 'booked')
    .map(seat => {
      const cls = CLASS_INFO.find(c => c.rows.includes(seat.row));
      return {
        id: seat.id,
        row: seat.row,
        number: seat.number,
        classLabel: cls?.label || seat.row,
        price: cls?.price || 0,
      };
    });

  // Handler for ungrouping tickets (decoupling logic)
  const handleUnfork = async (groupSeats: {id: string}[]) => {
    setDecoupledSeatIds(prev => Array.from(new Set([...prev, ...groupSeats.map(s => s.id)])));
    // Set all to available
    groupSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'available');
    });
    // Wait for state to update
    await new Promise(res => setTimeout(res, 50));
    // Set all to booked (individually)
    groupSeats.forEach(seat => {
      toggleSeatStatus(seat.id, 'booked');
    });
    setUngroupKey(prev => prev + 1);
  };

  // Handler for deleting tickets
  const handleDeleteTickets = (seatIds: string[]) => {
    seatIds.forEach(id => toggleSeatStatus(id, 'available'));
  };

  // Handler for regrouping tickets
  const handleRegroup = (seatId: string) => {
    setDecoupledSeatIds(prev => prev.filter(id => id !== seatId));
  };

  // Handler for resetting all tickets
  const handleResetTickets = () => {
    selectedSeats.forEach(seat => toggleSeatStatus(seat.id, 'available'));
    setDecoupledSeatIds([]);
    setUngroupKey(prev => prev + 1);
  };

  const movieName = 'KALANK';
  const movieLanguage = 'HINDI';

  return (
    <div className="w-full h-full flex flex-row gap-x-6 px-6 pt-4 pb-4 items-start">
      <div className="flex-[3] flex flex-col">
        <div className="font-bold text-xl mb-0 ml-0">Checkout Summary</div>
        <div className="mt-4">
          <div className="flex w-full max-w-5xl pt-0">
            {/* Show Box */}
            <div className="flex flex-col border border-gray-200 bg-white w-[200px] h-[120px] px-6 py-2 relative cursor-pointer select-none rounded-l-xl shadow-md transition-transform hover:-translate-y-1 hover:shadow-lg"
              onDoubleClick={() => setShowDropdownOpen((open) => !open)}
              ref={showDropdownRef}
            >
              <span className="font-bold text-lg mb-1 inline whitespace-nowrap">{`${movieName} (${movieLanguage})`}</span>
              <span className="text-sm mb-2 whitespace-nowrap mt-1">{SHOW_DETAILS[selectedShow]?.timing || ''}</span>
              <span className="absolute right-3 bottom-2 text-base font-semibold">{(() => {
                const totalSeats = seats.length;
                const bookedSeats = seats.filter(seat => seat.status === 'booked').length;
                return `${bookedSeats}/${totalSeats}`;
              })()}</span>
              {/* Dropdown for show selection */}
              {showDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-[220px] bg-white rounded-xl shadow-lg border z-50 p-2 space-y-2" style={{minWidth: 200}}>
                  {Object.keys(SHOW_DETAILS).map((showKey) => (
                    <div
                      key={showKey}
                      className={`p-3 rounded-lg cursor-pointer flex flex-col border transition-all ${selectedShow === showKey ? 'bg-blue-100 border-blue-400' : 'hover:bg-gray-100 border-transparent'}`}
                      onClick={() => handleShowSelect(showKey)}
                    >
                      <span className="font-bold text-base">{SHOW_DETAILS[showKey].label}</span>
                      <span className="text-xs text-gray-600">{SHOW_DETAILS[showKey].timing}</span>
                      <span className="text-xs text-gray-500 mt-1">{(() => {
                        // Show seat stats for this show
                        // For now, just show placeholder, can be extended to fetch real stats
                        if (showKey === selectedShow) {
                          const totalSeats = seats.length;
                          const bookedSeats = seats.filter(seat => seat.status === 'booked').length;
                          return `Booked: ${bookedSeats}/${totalSeats}`;
                        } else {
                          // Could load stats for other shows if needed
                          return '';
                        }
                      })()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Class Boxes */}
            {CLASS_INFO.map((cls, i) => {
              const total = seats.filter(seat => cls.rows.includes(seat.row)).length;
              const available = seats.filter(seat => cls.rows.includes(seat.row) && seat.status !== 'booked').length;
              const sold = seats.filter(seat => cls.rows.includes(seat.row) && seat.status === 'booked').length;
              const price = cls.price;
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
              else if (i === CLASS_INFO.length - 1) cardClass = 'rounded-r-xl -ml-2';
              else cardClass = 'rounded-none -ml-2';
              // On click, book the first available seat in the class (prefer first row)
              const handleClassCardClick = () => {
                let blockSet = false;
                for (const row of cls.rows) {
                  const availableSeat = seats
                    .filter(seat => seat.row === row && seat.status === 'available')
                    .sort((a, b) => a.number - b.number)[0];
                  if (availableSeat) {
                    toggleSeatStatus(availableSeat.id, 'booked');
                    setTimeout(() => {
                      // After booking, check all rows in this class for the largest contiguous block
                      let largestBlock = null;
                      for (const checkRow of cls.rows) {
                        const rowSeats = useBookingStore.getState().seats.filter(seat => seat.row === checkRow).sort((a, b) => a.number - b.number);
                        let block = [];
                        for (const seat of rowSeats) {
                          if (seat.status === 'booked') {
                            if (block.length === 0 || seat.number === block[block.length - 1].number + 1) {
                              block.push(seat);
                            } else {
                              if (!largestBlock || block.length > largestBlock.length) largestBlock = [...block];
                              block = [seat];
                            }
                          } else {
                            if (!largestBlock || block.length > largestBlock.length) largestBlock = [...block];
                            block = [];
                          }
                        }
                        if (!largestBlock || block.length > largestBlock.length) largestBlock = [...block];
                      }
                      if (largestBlock && largestBlock.length > 1) {
                        setBlockMove({ row: largestBlock[0].row, start: largestBlock[0].number, length: largestBlock.length, seatIds: largestBlock.map(s => s.id) });
                      } else {
                        setBlockMove(null);
                      }
                    }, 50);
                    blockSet = true;
                    break;
                  }
                }
                if (!blockSet) setBlockMove(null);
              };
              return (
                <div
                  key={cls.key}
                  className={`flex flex-col justify-between w-[200px] h-[120px] px-6 py-2 relative border border-white shadow-md transition-transform hover:-translate-y-1 hover:shadow-lg cursor-pointer ${colorMap[cls.label]} ${cardClass}`}
                  onClick={handleClassCardClick}
                >
                  <div>
                    <span className="font-bold text-lg whitespace-nowrap text-left">{cls.label}</span>
                    <span className="block text-sm text-gray-700 text-left">{total} ({available})</span>
                  </div>
                  <div className="flex items-center justify-between w-full absolute left-0 bottom-2 px-6">
                    <span className="text-[10px] font-semibold">{sold}</span>
                    <span className="text-lg font-bold text-right">₹{price}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Total directly under grid, left-aligned */}
        <div className="w-full max-w-5xl flex justify-start mt-2 ml-0">
          <span className="text-xl font-bold">Total: <span className="text-2xl">₹ {total}</span></span>
        </div>
      </div>
      {/* TicketPrint Panel aligned right */}
      <div className="flex-[1] h-full">
        <TicketPrint key={ungroupKey} selectedSeats={ticketSeats} onUnfork={handleUnfork} onDelete={handleDeleteTickets} decoupledSeatIds={decoupledSeatIds} onRegroup={handleRegroup} onReset={handleResetTickets} />
      </div>
    </div>
  );
};

export default Checkout; 