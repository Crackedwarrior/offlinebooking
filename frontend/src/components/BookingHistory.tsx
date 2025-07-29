
import { useState, useEffect } from 'react';
import { useBookingStore, ShowTime } from '@/store/bookingStore';
import { seatSegments } from './SeatGrid';
import BookingViewerModal from './BookingViewerModal';
import { formatSafeDate } from '../utils/formatDate';
import { SHOW_TIMES, getSeatPrice, SEAT_CLASSES } from '@/lib/config';
import { getBookings } from '@/services/api';
import { toast } from '@/hooks/use-toast';

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
  const [databaseBookings, setDatabaseBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch bookings from database
  const fetchBookings = async (date: string) => {
    setLoading(true);
    try {
      const response = await getBookings({ date });
      console.log('📊 Fetched bookings for date:', date, response);
      console.log('📊 Response structure:', {
        success: response.success,
        dataType: typeof response.data,
        dataIsArray: Array.isArray(response.data),
        dataKeys: response.data ? Object.keys(response.data) : 'null',
        dataValue: response.data
      });
      
      if (response.success) {
        // The API service wraps the response, so we need to access response.data.data
        const bookings = Array.isArray(response.data) ? response.data : [];
        console.log('📊 Setting database bookings:', bookings);
        setDatabaseBookings(bookings);
      } else {
        console.error('Failed to fetch bookings:', response.error);
        toast({
          title: 'Error',
          description: 'Failed to load booking history from database.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings when date changes
  useEffect(() => {
    fetchBookings(selectedDate);
  }, [selectedDate]);

  // Remove auto-refresh for now to prevent infinite loop
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchBookings(selectedDate);
  //   }, 5000);
    
  //   return () => clearInterval(interval);
  // }, [selectedDate, fetchBookings]);

  // Helper to get all bookings for a date (from database)
  const bookingsForDate = databaseBookings;

  // Helper to get booking for a date and show
  const getBooking = (date: string, show: ShowTime) => {
    // Convert date to ISO format for comparison
    const dateObj = new Date(date);
    const dateISO = dateObj.toISOString().split('T')[0];
    
    return (databaseBookings || []).find(b => {
      // Extract date part from database date (which is in ISO format)
      const dbDate = new Date(b.date).toISOString().split('T')[0];
      return dbDate === dateISO && b.show === show;
    });
  };

  // Helper to get seat stats for a booking or fallback to current seats
  const getStats = (showKey: ShowTime) => {
    // Get all bookings for this show on the selected date
    const dateObj = new Date(selectedDate);
    const dateISO = dateObj.toISOString().split('T')[0];
    
    const showBookings = (databaseBookings || []).filter(b => {
      const dbDate = new Date(b.date).toISOString().split('T')[0];
      return dbDate === dateISO && b.show === showKey;
    });
    
    // console.log(`📊 Stats for ${showKey}:`, {
    //   dateISO,
    //   databaseBookings: databaseBookings?.length || 0,
    //   showBookings: showBookings.length,
    //   showBookingsData: showBookings
    // });
    
    const total = 590; // Total seats in theater
    const booked = showBookings.reduce((sum, b) => sum + (b.seatCount || 0), 0);
    const available = total - booked;
    const bms = 0; // No BMS bookings yet
    const blocked = 0; // No blocked seats yet
    const occupancy = ((booked + bms) / (total || 1) * 100).toFixed(1);
    return { total, available, booked, bms, blocked, occupancy };
  };

  // Helper to get seat class breakdown for a booking or fallback to current seats
  const getClassCounts = (booking: any) => {
    if (booking) {
      // Database booking format - count by classLabel for the selected date
      const dateObj = new Date(selectedDate);
      const dateISO = dateObj.toISOString().split('T')[0];
      
      const classCounts: Record<string, number> = {};
      (databaseBookings || []).forEach(b => {
        const dbDate = new Date(b.date).toISOString().split('T')[0];
        if (dbDate === dateISO && b.classLabel) {
          classCounts[b.classLabel] = (classCounts[b.classLabel] || 0) + b.seatCount;
        }
      });
      
      return seatSegments.map(seg => ({
        label: classLabelMap[seg.label] || seg.label,
        count: classCounts[seg.label] || 0,
      }));
    } else {
      // Fallback to current seats
      return seatSegments.map(seg => ({
        label: classLabelMap[seg.label] || seg.label,
        count: seats.filter((s: any) => seg.rows.includes(s.row) && s.status === 'booked').length,
      }));
    }
  };

  // Gross income (sum of all bookings for the date)
  const grossIncome = (() => {
    const dateObj = new Date(selectedDate);
    const dateISO = dateObj.toISOString().split('T')[0];
    
    return (databaseBookings || []).reduce((sum, b) => {
      const dbDate = new Date(b.date).toISOString().split('T')[0];
      if (dbDate === dateISO) {
        return sum + (b.totalPrice || 0);
      }
      return sum;
    }, 0);
  })();

  // Recent bookings (last 3 for the date)
  const recentBookings = bookingsForDate.slice(-3).reverse();

  // Handle PDF download for a specific show
  const handleDownloadPDF = (showKey: ShowTime, date: string) => {
    const booking = getBooking(date, showKey);
    if (!booking) {
      console.log('No booking data available for PDF generation');
      return;
    }
    
    // Generate PDF content
    const pdfContent = generatePDFContent(booking, showKey);
    
    // Create and download PDF
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-${showKey}-${date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate PDF content (placeholder - replace with actual PDF generation)
  const generatePDFContent = (booking: any, showKey: ShowTime) => {
    const stats = getStats(booking);
    const classCounts = getClassCounts(booking);
    
    return `
BOOKING REPORT - ${showKey.toUpperCase()} SHOW
Date: ${formatSafeDate(booking.date)}
Generated: ${new Date().toLocaleString()}

SUMMARY:
Total Seats: ${stats.total}
Available: ${stats.available}
Booked: ${stats.booked}
BMS: ${stats.bms}
Occupancy: ${stats.occupancy}%

SEAT CLASS BREAKDOWN:
${classCounts.map(cls => `${cls.label}: ${cls.count} seats`).join('\n')}

BOOKED SEATS:
${booking.seats.filter((s: any) => s.status === 'booked').map((s: any) => `${s.row}${s.number}`).join(', ')}

---
Generated by Theater Management System
    `.trim();
  };

  // UI
  return (
    <div className="flex flex-col md:flex-row gap-8 p-8">
      {/* Left panel: Date picker, class table, recent bookings */}
      <div className="w-full md:w-1/3 space-y-6">
        {/* Date Picker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block font-semibold">Select Date</label>
            <button
              onClick={() => fetchBookings(selectedDate)}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
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
            const stats = getStats(show.key);
            return (
              <div key={show.key} className="bg-white rounded-xl shadow p-6 flex flex-col gap-2 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-base">{show.label}</span>
                  <span className="text-xs text-gray-400">
                    {loading ? 'Loading...' : booking ? 'Live (saved)' : 'No bookings'}
                  </span>
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
                <div className="mt-3 flex gap-2">
                  <button
                    className="flex-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
                    onClick={() => { setSelectedBooking(booking); setViewerOpen(true); }}
                  >
                    View
                  </button>
                  <button
                    className="flex-1 px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold text-xs transition-colors"
                    onClick={() => handleDownloadPDF(show.key, selectedDate)}
                  >
                    PDF
                  </button>
                </div>
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
