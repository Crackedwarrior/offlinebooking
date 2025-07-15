
import { useState, useEffect } from 'react';
import { useBookingStore, ShowTime } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Download, Eye, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { seatsByRow } from '@/lib/seatMatrix';
// import SeatsBookedByClass from './SeatsBookedByClass';
import { seatSegments } from './SeatGrid';
import BookingViewerModal from './BookingViewerModal'; // To be created
import { downloadBookingPdf } from "../utils/downloadBookingPdf";
import { formatSafeDate } from "../utils/formatDate";

interface Booking {
  id: string;
  date: string;
  show: string;
  seats: any[];
  totalIncome: number;
  // Add other fields as needed
}

const BookingHistory = () => {
  // Remove selectedDate and selectedShow from destructuring
  const { bookingHistory, loadBookingForDate, seats } = useBookingStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'date-asc' | 'income' | 'income-asc'>('date');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      setError(null);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/api/bookings`);
        if (!res.ok) throw new Error('Failed to fetch bookings');
        const data = await res.json();
        setBookings(data);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading booking history...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  const handleLoadBooking = (date: string, show: ShowTime) => {
    loadBookingForDate(date, show);
  };

  const handleViewBooking = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/bookings/${id}`);
      const data = await res.json();
      setSelectedBooking(data);
      setViewerOpen(true);
    } catch (err) {
      console.error('Failed to fetch booking details', err);
    }
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/${id}/pdf`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `booking-${id}.pdf`;
      link.click();
    } catch (error) {
      console.error("Failed to download PDF:", error);
    }
  };

  const getBookingStats = (seats: any[]) => {
    return {
      total: seats.length,
      booked: seats.filter(s => s.status === 'booked').length,
      bmsBooked: seats.filter(s => s.status === 'bms-booked').length,
      blocked: seats.filter(s => s.status === 'blocked').length,
      available: seats.filter(s => s.status === 'available').length,
    };
  };

  // Group history by date
  const historyByDate = bookingHistory.reduce((acc, booking) => {
    if (!acc[booking.date]) acc[booking.date] = [];
    acc[booking.date].push(booking);
    return acc;
  }, {} as Record<string, typeof bookingHistory>);

  // Find booking for selected date and show
  const selectedDateStr = format(new Date(selectedDate || ''), 'yyyy-MM-dd');
  const bookingForSelected = bookingHistory.find(
    b => b.date === selectedDateStr && b.show === selectedShow
  );
  const stats = getBookingStats(bookingForSelected ? bookingForSelected.seats : seats);
  const occupancyRate = ((stats.booked + stats.bmsBooked) / (stats.total || 1) * 100).toFixed(1);

  const showOrder = ['Morning', 'Matinee', 'Evening', 'Night'];

  const ReadOnlySeatGrid = ({ seats }: { seats: any[] }) => {
    // Map seats for quick lookup by row and number
    const seatMap = seats.reduce((acc, seat) => {
      acc[`${seat.row}-${seat.number}`] = seat;
      return acc;
    }, {} as Record<string, any>);
    return (
      <div className="space-y-4">
        {Object.keys(seatsByRow).map(row => (
          <div key={row} className="flex items-center">
            <div className="w-16 text-right pr-2 text-xs font-semibold text-gray-500">{row.replace(/^[^-]+-/, '')}</div>
            <div className="flex gap-1">
              {seatsByRow[row].map((seatNum, idx) => {
                if (seatNum === '') return <div key={idx} className="w-6 h-6" style={{ visibility: 'hidden' }} />;
                const seat = seatMap[`${row}-${seatNum}`];
                let color = 'bg-gray-200';
                if (seat) {
                  if (seat.status === 'available') color = 'bg-green-400';
                  if (seat.status === 'booked') color = 'bg-red-400';
                  if (seat.status === 'blocked') color = 'bg-yellow-400';
                  if (seat.status === 'bms-booked') color = 'bg-blue-400';
                }
                return <div key={idx} className={`w-6 h-6 rounded text-[10px] flex items-center justify-center border ${color}`}>{seatNum}</div>;
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Apply filters and sorting
  const filteredBookings = bookings
    .filter(b => !selectedDate || b.date.startsWith(selectedDate))
    .filter(b => !selectedShow || b.show === selectedShow)
    .sort((a, b) => {
      if (sortBy === 'income') return (b.totalIncome ?? 0) - (a.totalIncome ?? 0);
      if (sortBy === 'income-asc') return (a.totalIncome ?? 0) - (b.totalIncome ?? 0);
      if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      return new Date(b.date).getTime() - new Date(a.date).getTime(); // default newest first
    });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Booking History</h2>
      <div className="flex items-center gap-4 mb-4">
        <input
          type="date"
          value={selectedDate || ''}
          onChange={(e) => setSelectedDate(e.target.value || null)}
          className="border rounded px-2 py-1"
        />
        <select value={selectedShow || ''} onChange={(e) => setSelectedShow(e.target.value || null)} className="border rounded px-2 py-1">
          <option value="">All Shows</option>
          <option value="MORNING">Morning</option>
          <option value="MATINEE">Matinee</option>
          <option value="EVENING">Evening</option>
          <option value="NIGHT">Night</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'income')} className="border rounded px-2 py-1">
          <option value="date">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="income">Highest Income</option>
          <option value="income-asc">Lowest Income</option>
        </select>
                      </div>
      {filteredBookings.length === 0 ? (
        <div className="text-gray-500 text-center">No bookings found yet.</div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 border border-gray-100">
                <div>
                  <div className="font-semibold text-lg mb-1">{formatDate(booking.date)}, {booking.show} Show</div>
                  <div className="text-gray-600 text-sm">{booking.seats?.length || 0} seats booked</div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-green-700 font-bold text-lg">₹ {booking.totalIncome}</div>
                  <Button
                    className="ml-2"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(booking.id)}
                  >
                    📥 Download PDF
                  </Button>
                  <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={() => handleViewBooking(booking.id)}>View</button>
                </div>
          </div>
            ))}
        </div>
      )}
      {/* BookingViewerModal integration (to be implemented) */}
      {selectedBooking && (
        <BookingViewerModal
          open={viewerOpen}
          booking={selectedBooking}
          onClose={() => setViewerOpen(false)}
          seatCounts={getSeatCounts(selectedBooking.seats)}
        />
      )}
    </div>
  );
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Helper for seat counts
function getSeatCounts(seats: any[] = []) {
  return seats.reduce((acc, seat) => {
    acc[seat.status] = (acc[seat.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export default BookingHistory;
