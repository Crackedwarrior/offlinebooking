import { useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import ShowSelector from '@/components/ShowSelector';
import { getCurrentShowLabel } from '@/lib/utils';
import TicketPrint from '@/components/TicketPrint';

const CLASS_INFO = [
  { key: 'BOX', label: 'BOX', color: 'bg-cyan-200', price: 150, rows: ['BOX-A', 'BOX-B', 'BOX-C'] },
  { key: 'STAR', label: 'STAR CLASS', color: 'bg-cyan-300', price: 150, rows: ['SC-A', 'SC-B', 'SC-C', 'SC-D'] },
  { key: 'CLASSIC', label: 'CLASSIC', color: 'bg-orange-200', price: 120, rows: ['CB-A', 'CB-B', 'CB-C', 'CB-D', 'CB-E', 'CB-F', 'CB-G', 'CB-H'] },
  { key: 'FIRST', label: 'FIRST CLASS', color: 'bg-pink-200', price: 70, rows: ['FC-A', 'FC-B', 'FC-C', 'FC-D', 'FC-E', 'FC-F', 'FC-G'] },
  { key: 'SECOND', label: 'SECOND CLASS', color: 'bg-gray-200', price: 50, rows: ['SC2-A', 'SC2-B'] },
];

const showOptions = ['Morning', 'Matinee', 'Evening', 'Night'];

const Checkout = () => {
  const { seats, selectedShow, setSelectedShow, selectedDate, toggleSeatStatus } = useBookingStore();
  const [show, setShow] = useState(selectedShow);
  const [ungroupKey, setUngroupKey] = useState(0); // for triggering ungroup
  const [decoupledSeatIds, setDecoupledSeatIds] = useState<string[]>([]);

  // Group selected seats by class
  const selectedSeats = seats.filter(seat => seat.status === 'booked');
  const classCounts = CLASS_INFO.map(cls => {
    const count = selectedSeats.filter(seat => cls.rows.includes(seat.row)).length;
    return { ...cls, count };
  });
  const total = classCounts.reduce((sum, cls) => sum + cls.count * cls.price, 0);

  // For TicketPrint: map to required format
  const ticketSeats = selectedSeats.map(seat => {
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

  return (
    <div className="w-full h-full flex flex-row gap-x-6 px-6 pt-4 pb-4 items-start">
      <div className="flex-[3] flex flex-col">
        <div className="font-bold text-xl mb-0 ml-0">Checkout Summary</div>
        <div className="mt-4">
          <div className="flex w-full max-w-5xl pt-0">
            {/* Show Box */}
            <div className="flex flex-col border-r border-gray-200 bg-white w-[200px] h-[140px] px-6 py-3 rounded-l-xl relative cursor-pointer hover:shadow-lg transition">
              <span className="font-bold text-lg mb-1">KALANK (HINDI)</span>
              <span className="text-sm mb-2 whitespace-nowrap mt-1">6:00 P.M - 9:00 P.M</span>
              <span className="absolute right-3 bottom-2 text-base font-semibold">{(() => {
                const totalSeats = seats.length;
                const bookedSeats = seats.filter(seat => seat.status === 'booked').length;
                return `${bookedSeats}/${totalSeats}`;
              })()}</span>
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
              return (
                <div
                  key={cls.key}
                  className={`flex flex-col justify-between w-[200px] h-[140px] px-6 py-3 relative border-r border-gray-200 ${colorMap[cls.label]}`}
                >
                  <div>
                    <span className="block font-bold text-lg mb-1 text-left">{cls.label}</span>
                    <span className="block text-sm text-gray-700 mb-2 text-left">{total} ({available})</span>
                  </div>
                  <span className="absolute left-3 bottom-2 text-[10px] font-semibold">
                    {sold}
                  </span>
                  <div className="flex items-center justify-end w-full">
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