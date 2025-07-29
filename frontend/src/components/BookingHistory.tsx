
import { useState } from 'react';
import { useBookingStore, ShowTime } from '@/store/bookingStore';
import { seatSegments } from './SeatGrid';
import BookingViewerModal from './BookingViewerModal';
import { formatSafeDate } from '../utils/formatDate';
import { SHOW_TIMES, getSeatPrice, SEAT_CLASSES } from '@/lib/config';

const showOrder: { key: ShowTime; label: string }[] = SHOW_TIMES.map(show => ({
  key: show.enumValue,
  label: show.label
}));

const classLabelMap: Record<string, string> = SEAT_CLASSES.reduce((acc, cls) => {
  acc[cls.label] = cls.label;
  return acc;
}, {} as Record<string, string>);

const BookingHistory = () => {
  const { bookingHistory, seats, loadBookingForDate } = useBookingStore();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Helper to get all bookings for a date
  const bookingsForDate = bookingHistory.filter(b => b.date === selectedDate);

  // Helper to get booking for a date and show
  const getBooking = (date: string, show: ShowTime) =>
    bookingHistory.find(b => b.date === date && b.show === show);

  // Helper to get seat stats for a booking or fallback to current seats
  const getStats = (booking: any) => {
    const src = booking ? booking.seats : seats;
    const total = src.length;
    const available = src.filter((s: any) => s.status === 'available').length;
    const booked = src.filter((s: any) => s.status === 'booked').length;
    const bms = src.filter((s: any) => s.status === 'bms-booked').length;
    const blocked = src.filter((s: any) => s.status === 'blocked').length;
    const occupancy = ((booked + bms) / (total || 1) * 100).toFixed(1);
    return { total, available, booked, bms, blocked, occupancy };
  };

  // Helper to get seat class breakdown for a booking or fallback to current seats
  const getClassCounts = (booking: any) => {
    const src = booking ? booking.seats : seats;
    return seatSegments.map(seg => ({
      label: classLabelMap[seg.label] || seg.label,
      count: src.filter((s: any) => seg.rows.includes(s.row) && s.status === 'booked').length,
    }));
  };

  // Gross income (sum of all bookings for the date)
  const grossIncome = bookingsForDate.reduce((sum, b) => {
    if (typeof (b as any).totalIncome === 'number') return sum + (b as any).totalIncome;
    // Calculate if not present
    return sum + b.seats.reduce((seatSum: number, seat: any) => seatSum + getSeatPrice(seat.row), 0);
  }, 0);

  // Recent bookings (last 3 for the date)
  const recentBookings = bookingsForDate.slice(-3).reverse();

  // UI
  return (
    <div className="flex flex-col md:flex-row gap-8 p-8">
      {/* Left panel: Date picker, class table, recent bookings */}
      <div className="w-full md:w-1/3 space-y-6">
        {/* Date Picker */}
        <div>
          <label className="block font-semibold mb-2">Select Date</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        {/* Seats Booked by Class Table */}
        <div>
          <div className="font-semibold mb-2">Seats Booked by Class</div>
          <table className="w-full border rounded overflow-hidden text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3 text-left">Seat Class</th>
                <th className="py-2 px-3 text-right">Seats Booked</th>
              </tr>
            </thead>
            <tbody>
              {getClassCounts(null).map((row, i) => (
                <tr key={row.label} className="border-b last:border-b-0">
                  <td className="py-2 px-3">{row.label}</td>
                  <td className="py-2 px-3 text-right">{row.count}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50">
                <td className="py-2 px-3">Total</td>
                <td className="py-2 px-3 text-right">{getClassCounts(null).reduce((sum, r) => sum + r.count, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <div>
            <div className="font-semibold mb-2 mt-6">Recent Bookings</div>
            <ul className="space-y-2">
              {recentBookings.map((b, i) => (
                <li key={i} className="bg-gray-50 rounded p-2 flex flex-col">
                  <span className="text-xs text-gray-500">{b.show} • {formatSafeDate(b.date)}</span>
                  <span className="font-semibold">{b.seats.length} seats</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Gross Income */}
        <div className="mt-6">
          <div className="font-semibold mb-1">Gross Income</div>
          <div className="text-2xl font-bold">₹ {grossIncome}</div>
        </div>
      </div>
      {/* Right panel: Show-wise booking stats */}
      <div className="flex-1 space-y-6">
        <div className="font-semibold text-lg mb-4">Bookings for {formatSafeDate(selectedDate)}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showOrder.map(show => {
            const booking = getBooking(selectedDate, show.key);
            const stats = getStats(booking);
            return (
              <div key={show.key} className="bg-white rounded-xl shadow p-6 flex flex-col gap-2 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-base">{show.label}</span>
                  <span className="text-xs text-gray-400">{booking ? '' : 'Live (unsaved)'}</span>
                </div>
                <div className="flex gap-2 text-center">
                  <div className="flex-1">
                    <div className="text-lg font-bold">{stats.total}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-green-600">{stats.available}</div>
                    <div className="text-xs text-gray-500">Available</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-red-600">{stats.booked}</div>
                    <div className="text-xs text-gray-500">Booked</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-blue-600">{stats.bms}</div>
                    <div className="text-xs text-gray-500">BMS</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-purple-600">{stats.occupancy}%</div>
                    <div className="text-xs text-gray-500">Occupied</div>
                  </div>
                </div>
                {booking && (
                  <button
                    className="mt-3 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                    onClick={() => { setSelectedBooking(booking); setViewerOpen(true); }}
                  >
                    View Details
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* BookingViewerModal integration */}
      {selectedBooking && (
        <BookingViewerModal
          open={viewerOpen}
          booking={selectedBooking}
          onClose={() => setViewerOpen(false)}
          seatCounts={(() => {
            const src = selectedBooking.seats || [];
            return src.reduce((acc: Record<string, number>, seat: any) => {
              acc[seat.status] = (acc[seat.status] || 0) + 1;
              return acc;
            }, {});
          })()}
        />
      )}
    </div>
  );
};

export default BookingHistory;
