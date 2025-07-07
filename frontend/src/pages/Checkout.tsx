import { useState, useEffect } from 'react';
import { Calendar, Clock, History, Download, ChevronDown } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format } from 'date-fns';
import ShowSelector from '@/components/ShowSelector';

const CLASS_INFO = [
  { key: 'BOX', label: 'BOX', color: 'bg-cyan-200', price: 300, rows: ['BOX-A', 'BOX-B', 'BOX-C'] },
  { key: 'STAR', label: 'STAR CLASS', color: 'bg-cyan-300', price: 250, rows: ['SC-A', 'SC-B', 'SC-C', 'SC-D'] },
  { key: 'CLASSIC', label: 'CLASSIC', color: 'bg-orange-200', price: 200, rows: ['CB-A', 'CB-B', 'CB-C', 'CB-D', 'CB-E', 'CB-F', 'CB-G', 'CB-H'] },
  { key: 'FIRST', label: 'FIRST CLASS', color: 'bg-pink-200', price: 150, rows: ['FC-A', 'FC-B', 'FC-C', 'FC-D', 'FC-E', 'FC-F', 'FC-G'] },
  { key: 'SECOND', label: 'SECOND CLASS', color: 'bg-gray-200', price: 100, rows: ['SC2-A', 'SC2-B'] },
];

const sidebarItems = [
  { id: 'booking', label: 'Seat Booking', icon: Calendar },
  { id: 'history', label: 'Booking History', icon: History },
  { id: 'reports', label: 'Reports', icon: Download },
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
    <>
      {/* Summary Bar */}
      <div className="flex gap-4 mb-8 mt-8">
        {classCounts.map(cls => (
          <div key={cls.key} className={`rounded-lg px-6 py-4 flex flex-col items-center shadow-sm ${cls.color} min-w-[150px]`}>
            <span className="font-bold text-lg">{cls.label}</span>
            <span className="text-2xl font-bold">{cls.count} <span className="text-base font-normal">({cls.rows.reduce((acc, row) => acc + (seats.filter(s => s.row === row).length), 0)})</span></span>
            <span className="text-md font-semibold mt-1">₹{cls.price}</span>
          </div>
        ))}
      </div>
      {/* Tickets Card */}
      <div className="flex justify-end">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-lg">Tickets</span>
            <Button variant="ghost" size="icon" className="text-gray-400">
              <span className="text-xl">⟳</span>
            </Button>
          </div>
          <div className="space-y-2 mb-4">
            {tickets.length === 0 ? (
              <div className="text-gray-500">No tickets selected.</div>
            ) : (
              tickets.map(ticket => (
                <div key={ticket.id} className={`rounded-lg px-4 py-3 flex items-center justify-between ${ticket.color}`}>
                  <div>
                    <span className="font-semibold">{ticket.label}</span>
                    <span className="ml-2 text-gray-700 text-sm">Price: ₹{ticket.price}</span>
                  </div>
                  <input type="checkbox" className="ml-2" />
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">Total:</span>
            <span className="font-bold">₹ {total}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1">Delete</Button>
            <Button className="flex-1 bg-blue-600 text-white">Print Tickets</Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Checkout; 