import { useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import ShowSelector from '@/components/ShowSelector';

const CLASS_INFO = [
  { key: 'BOX', label: 'BOX', color: 'bg-cyan-200', price: 150, rows: ['BOX-A', 'BOX-B', 'BOX-C'] },
  { key: 'STAR', label: 'STAR CLASS', color: 'bg-cyan-300', price: 150, rows: ['SC-A', 'SC-B', 'SC-C', 'SC-D'] },
  { key: 'CLASSIC', label: 'CLASSIC', color: 'bg-orange-200', price: 120, rows: ['CB-A', 'CB-B', 'CB-C', 'CB-D', 'CB-E', 'CB-F', 'CB-G', 'CB-H'] },
  { key: 'FIRST', label: 'FIRST CLASS', color: 'bg-pink-200', price: 70, rows: ['FC-A', 'FC-B', 'FC-C', 'FC-D', 'FC-E', 'FC-F', 'FC-G'] },
  { key: 'SECOND', label: 'SECOND CLASS', color: 'bg-gray-200', price: 50, rows: ['SC2-A', 'SC2-B'] },
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
    <div className="w-full h-full px-4 pt-4 pb-4 flex flex-col">
      {/* Checkout Summary Heading */}
      <div className="font-bold text-xl mb-3 ml-0">Checkout Summary</div>
      {/* Wrap the grid in a relative container and add the badge: */}
      {/* Replace the grid with a modern, responsive flex layout */}
      <div className="flex w-full max-w-5xl mt-4">
        {/* Show Box */}
        <div className="flex flex-col items-start justify-between border-r border-gray-200 bg-white min-w-[156px] px-6 py-4 rounded-l-xl h-[130px]">
          <span className="font-bold text-lg mb-1">KALANK (HINDI)</span>
          <span className="text-sm mb-2">6:00 P.M - 9:00 P.M</span>
          <span className="text-base font-semibold">{(() => {
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
            BOX: 'bg-cyan-100',
            'STAR CLASS': 'bg-cyan-300',
            CLASSIC: 'bg-yellow-100',
            'FIRST CLASS': 'bg-pink-200',
            'SECOND CLASS': 'bg-gray-200',
          };
          return (
            <div
              key={cls.key}
              className={`flex flex-col justify-between min-w-[152px] h-[130px] px-6 py-4 relative border-r border-gray-200 ${colorMap[cls.label]}`}
            >
              <div>
                <span className="block font-bold text-lg mb-1 text-left">{cls.label}</span>
                <span className="block text-sm text-gray-700 mb-2 text-left">{total} ({available})</span>
              </div>
              <span className="absolute bottom-2 left-2 text-[10px] bg-gray-200 rounded-full px-2 py-0.5 border border-gray-300 font-semibold">
                {sold}
              </span>
              <div className="flex items-center justify-end w-full">
                <span className="text-lg font-bold text-right">₹{price}</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Total on the right, outside the grid */}
      <div className="w-full max-w-5xl flex justify-end mt-2">
        <span className="text-xl font-bold">Total: <span className="text-2xl">₹ {total}</span></span>
      </div>
    </div>
  );
};

export default Checkout; 