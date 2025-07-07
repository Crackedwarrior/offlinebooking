import { useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import ShowSelector from '@/components/ShowSelector';

const CLASS_INFO = [
  { key: 'BOX', label: 'BOX', color: 'bg-cyan-200', price: 300, rows: ['BOX-A', 'BOX-B', 'BOX-C'] },
  { key: 'STAR', label: 'STAR CLASS', color: 'bg-cyan-300', price: 250, rows: ['SC-A', 'SC-B', 'SC-C', 'SC-D'] },
  { key: 'CLASSIC', label: 'CLASSIC', color: 'bg-orange-200', price: 200, rows: ['CB-A', 'CB-B', 'CB-C', 'CB-D', 'CB-E', 'CB-F', 'CB-G', 'CB-H'] },
  { key: 'FIRST', label: 'FIRST CLASS', color: 'bg-pink-200', price: 150, rows: ['FC-A', 'FC-B', 'FC-C', 'FC-D', 'FC-E', 'FC-F', 'FC-G'] },
  { key: 'SECOND', label: 'SECOND CLASS', color: 'bg-gray-200', price: 100, rows: ['SC2-A', 'SC2-B'] },
];

const showOptions = ['Morning', 'Matinee', 'Evening', 'Night'];

const Checkout = () => {
  const { seats, selectedShow, setSelectedShow, selectedDate } = useBookingStore();
  const [show, setShow] = useState(selectedShow);

  // Group selected seats by class
  const selectedSeats = seats.filter(seat => seat.status === 'booked');
  const classCounts = CLASS_INFO.map(cls => {
    const count = selectedSeats.filter(seat => cls.rows.includes(seat.row)).length;
    return { ...cls, count };
  });
  const total = classCounts.reduce((sum, cls) => sum + cls.count * cls.price, 0);

  // For ticket card
  const tickets = selectedSeats.map(seat => {
    const cls = CLASS_INFO.find(c => c.rows.includes(seat.row));
    return {
      id: seat.id,
      label: `${cls?.label || seat.row} ${seat.row.replace(/^[^-]+-/, '')} ${seat.number}`,
      price: cls?.price || 0,
      color: cls?.color || 'bg-gray-100',
    };
  });

  return (
    <div className="w-full h-full px-8 pt-8 pb-4 flex flex-col items-center">
      {/* Checkout Summary Heading */}
      <div className="font-bold text-2xl mb-3 self-start">Checkout Summary</div>
      {/* 6-column grid */}
      <div className="grid grid-cols-6 gap-0 bg-white rounded-xl shadow p-0 mb-2 w-full max-w-5xl overflow-hidden">
        {/* Show Selector (first column, slightly wider) */}
        <div className="flex flex-col items-center justify-center border-r border-gray-200 bg-white min-w-[156px] px-6 py-6">
          <span className="font-semibold mb-2">Show</span>
          <select
            className="border rounded px-2 py-1 text-base"
            value={show}
            onChange={e => {
              setShow(e.target.value as typeof show);
              setSelectedShow(e.target.value as typeof show);
            }}
          >
            {showOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        {/* Class Summary Columns (exact colors from screenshot) */}
        <div className="flex flex-col items-center justify-center min-w-[152px] px-6 py-6" style={{background:'#b6f3fa'}}>
          <span className="font-bold text-lg">BOX</span>
          <span className="text-2xl font-bold">{classCounts[0].count} <span className="text-base font-normal">({classCounts[0].rows.reduce((acc, row) => acc + (seats.filter(s => s.row === row).length), 0)})</span></span>
          <span className="text-md font-semibold mt-1">₹{classCounts[0].price}</span>
        </div>
        <div className="flex flex-col items-center justify-center min-w-[152px] px-6 py-6" style={{background:'#3ee6fa'}}>
          <span className="font-bold text-lg">STAR CLASS</span>
          <span className="text-2xl font-bold">{classCounts[1].count} <span className="text-base font-normal">({classCounts[1].rows.reduce((acc, row) => acc + (seats.filter(s => s.row === row).length), 0)})</span></span>
          <span className="text-md font-semibold mt-1">₹{classCounts[1].price}</span>
        </div>
        <div className="flex flex-col items-center justify-center min-w-[152px] px-6 py-6" style={{background:'#ffd59a'}}>
          <span className="font-bold text-lg">CLASSIC</span>
          <span className="text-2xl font-bold">{classCounts[2].count} <span className="text-base font-normal">({classCounts[2].rows.reduce((acc, row) => acc + (seats.filter(s => s.row === row).length), 0)})</span></span>
          <span className="text-md font-semibold mt-1">₹{classCounts[2].price}</span>
        </div>
        <div className="flex flex-col items-center justify-center min-w-[152px] px-6 py-6" style={{background:'#ffb6d9'}}>
          <span className="font-bold text-lg">FIRST CLASS</span>
          <span className="text-2xl font-bold">{classCounts[3].count} <span className="text-base font-normal">({classCounts[3].rows.reduce((acc, row) => acc + (seats.filter(s => s.row === row).length), 0)})</span></span>
          <span className="text-md font-semibold mt-1">₹{classCounts[3].price}</span>
        </div>
        <div className="flex flex-col items-center justify-center min-w-[152px] px-6 py-6 rounded-tr-xl rounded-br-xl" style={{background:'#e6e8ea'}}>
          <span className="font-bold text-lg">SECOND CLASS</span>
          <span className="text-2xl font-bold">{classCounts[4].count} <span className="text-base font-normal">({classCounts[4].rows.reduce((acc, row) => acc + (seats.filter(s => s.row === row).length), 0)})</span></span>
          <span className="text-md font-semibold mt-1">₹{classCounts[4].price}</span>
        </div>
      </div>
      {/* Total on the right, outside the grid */}
      <div className="w-full max-w-5xl flex justify-end mt-2">
        <span className="text-xl font-bold">Total: <span className="text-2xl">₹ {total}</span></span>
      </div>
    </div>
  );
};

export default Checkout; 