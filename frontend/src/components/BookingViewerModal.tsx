import React from 'react';

interface BookingViewerModalProps {
  booking: any;
  open: boolean;
  onClose: () => void;
  seatCounts: Record<string, number>;
}

const seatStatusColor = (status: string) => {
  switch (status) {
    case 'available': return 'bg-green-400';
    case 'booked': return 'bg-red-400';
    case 'blocked': return 'bg-yellow-400';
    case 'bms-booked': return 'bg-blue-400';
    default: return 'bg-gray-200';
  }
};

const seatStatusLabels: Record<string, string> = {
  'available': 'Available',
  'booked': 'Booked',
  'blocked': 'Blocked',
  'bms-booked': 'BMS Booked',
};

const BookingViewerModal: React.FC<BookingViewerModalProps> = ({ booking, open, onClose, seatCounts }) => {
  if (!open || !booking) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md relative mx-2">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={onClose}>&times;</button>
        <div className="font-bold text-xl mb-2">Booking Details</div>
        <div className="mb-2 text-gray-700">
          <div><span className="font-semibold">Date:</span> {formatDate(booking.date)}</div>
          <div><span className="font-semibold">Show:</span> {booking.show}</div>
          <div><span className="font-semibold">Total Seats:</span> {booking.seats?.length || 0}</div>
          <div><span className="font-semibold">Total Income:</span> ₹ {booking.totalIncome}</div>
        </div>
        <div className="mb-2 font-semibold">Seat Map:</div>
        <div className="grid grid-cols-8 gap-1 mb-2">
          {booking.seats?.map((seat: any) => (
            <div key={seat.id} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold border ${seatStatusColor(seat.status)}`}>{seat.number}</div>
          ))}
        </div>
        {/* Mini legend */}
        <div className="flex flex-wrap gap-2 mb-2 text-xs">
          {Object.entries(seatStatusLabels).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded ${seatStatusColor(status)}`}></span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        {/* Seat counts by category */}
        <div className="flex flex-wrap gap-4 text-xs mb-2">
          {Object.entries(seatStatusLabels).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1">
              <span className="font-semibold">{label}:</span>
              <span>{seatCounts[status] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default BookingViewerModal; 