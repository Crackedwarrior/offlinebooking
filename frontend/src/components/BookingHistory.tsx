
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [selectedShow, setSelectedShow] = useState<ShowTime | null>(null);

  // Fetch bookings from database
  const fetchBookings = useCallback(async (date: string) => {
    setLoading(true);
    try {
      console.log('🔍 Fetching bookings for date:', date);
      const response = await getBookings({ date });
      console.log('📊 Fetched bookings for date:', date, response);
      console.log('📊 Response structure:', {
        success: response.success,
        dataType: typeof response.data,
        dataIsArray: Array.isArray(response.data),
        dataKeys: response.data ? Object.keys(response.data) : 'null',
        dataValue: response.data
      });
      
      // Log the actual response structure
      console.log('📊 Full response:', JSON.stringify(response, null, 2));
      console.log('📊 Response.data:', response.data);
      console.log('📊 Response.data type:', typeof response.data);
      if (response.data && typeof response.data === 'object') {
        console.log('📊 Response.data keys:', Object.keys(response.data));
        console.log('📊 Response.data values:', Object.values(response.data));
      }
      
      // Test direct access
      console.log('📊 Testing direct access:');
      console.log('  - response.success:', response.success);
      console.log('  - response.data:', response.data);
      console.log('  - Array.isArray(response.data):', Array.isArray(response.data));
      if (response.data && Array.isArray(response.data)) {
        console.log('  - response.data.length:', response.data.length);
        console.log('  - First booking:', response.data[0]);
      }
      
      if (response.success) {
        // The API service returns the data directly
        const bookings = Array.isArray(response.data) ? response.data : [];
        console.log('📊 Setting database bookings:', bookings);
        console.log('📊 Number of bookings:', bookings.length);
        setDatabaseBookings(bookings);
      } else {
        console.error('Failed to fetch bookings:', response);
        toast({
          title: 'Error',
          description: 'Failed to load booking history from database.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      toast({
        title: 'Error',
        description: 'Failed to connect to database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch bookings when date changes
  useEffect(() => {
    fetchBookings(selectedDate);
  }, [selectedDate]);

  // Debug selected show changes
  useEffect(() => {
    if (selectedShow) {
      console.log(`🎯 Show selected: ${selectedShow}`);
    }
  }, [selectedShow]);

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

  // Calculate all stats once for the selected date
  const allStats = useMemo(() => {
    const dateObj = new Date(selectedDate);
    const dateISO = dateObj.toISOString().split('T')[0];
    
    const stats: Record<ShowTime, any> = {} as Record<ShowTime, any>;
    
    showOrder.forEach(show => {
      const showBookings = (databaseBookings || []).filter(b => {
        const dbDate = new Date(b.date).toISOString().split('T')[0];
        return dbDate === dateISO && b.show === show.key;
      });
      
      const total = 590; // Total seats in theater
      
      // Calculate unique booked seats instead of total seat instances
      const uniqueBookedSeats = new Set<string>();
      showBookings.forEach(b => {
        if (b.bookedSeats && Array.isArray(b.bookedSeats)) {
          b.bookedSeats.forEach(seatId => uniqueBookedSeats.add(seatId));
        }
      });
      const booked = uniqueBookedSeats.size;
      const available = total - booked;
      const bms = 0; // No BMS bookings yet
      const blocked = 0; // No blocked seats yet
      const occupancy = ((booked + bms) / (total || 1) * 100).toFixed(1);
      
      stats[show.key] = { total, available, booked, bms, blocked, occupancy };
      
      // Only log for MORNING to avoid spam
      if (show.key === 'MORNING') {
        console.log(`📊 Stats for ${show.key}:`, {
          dateISO,
          databaseBookings: databaseBookings?.length || 0,
          showBookings: showBookings.length,
          showBookingsData: showBookings,
          totalBookedSeats: showBookings.reduce((sum, b) => sum + (b.seatCount || 0), 0),
          individualBookings: showBookings.map(b => ({ id: b.id, seatCount: b.seatCount, bookedSeats: b.bookedSeats }))
        });
      }
    });
    
    return stats;
  }, [selectedDate, databaseBookings]);

  // Helper to get seat class breakdown for a booking or fallback to current seats
  const getClassCounts = (booking: any) => {
    // Always use database bookings when available, regardless of booking parameter
    if (databaseBookings && databaseBookings.length > 0) {
      // Database booking format - count by classLabel for the selected date and show
      const dateObj = new Date(selectedDate);
      const dateISO = dateObj.toISOString().split('T')[0];
      
      const classCounts: Record<string, number> = {};
      const uniqueSeatsByClass: Record<string, Set<string>> = {};
      
      (databaseBookings || []).forEach(b => {
        const dbDate = new Date(b.date).toISOString().split('T')[0];
        const showMatches = selectedShow ? b.show === selectedShow : true;
        if (dbDate === dateISO && showMatches && b.classLabel) {
          // Initialize set for this class if not exists
          if (!uniqueSeatsByClass[b.classLabel]) {
            uniqueSeatsByClass[b.classLabel] = new Set<string>();
          }
          
          // Add unique seats for this class
          if (b.bookedSeats && Array.isArray(b.bookedSeats)) {
            b.bookedSeats.forEach(seatId => {
              uniqueSeatsByClass[b.classLabel].add(seatId);
            });
          }
        }
      });
      
      // Convert sets to counts
      Object.entries(uniqueSeatsByClass).forEach(([classLabel, seatSet]) => {
        classCounts[classLabel] = seatSet.size;
      });
      
      // Add debug logging
      console.log(`🔍 getClassCounts:`, {
        dateISO,
        selectedShow: selectedShow || 'ALL SHOWS',
        databaseBookings: databaseBookings.length,
        filteredBookings: (databaseBookings || []).filter(b => {
          const dbDate = new Date(b.date).toISOString().split('T')[0];
          const showMatches = selectedShow ? b.show === selectedShow : true;
          return dbDate === dateISO && showMatches;
        }).length,
        classCounts,
        uniqueSeatsByClass: Object.fromEntries(
          Object.entries(uniqueSeatsByClass).map(([classLabel, seatSet]) => [
            classLabel, 
            Array.from(seatSet)
          ])
        )
      });
      
      // Debug: Log the actual class labels found in database
      console.log('🔍 Database class labels found:', Object.keys(classCounts));
      console.log('🔍 Seat segments expected:', seatSegments.map(seg => seg.label));
      
      return seatSegments.map(seg => {
        const count = classCounts[seg.label] || 0;
        console.log(`🔍 Class ${seg.label}: ${count} seats`);
        return {
          label: classLabelMap[seg.label] || seg.label,
          count: count,
        };
      });
    } else {
      // Fallback to current seats
      return seatSegments.map(seg => ({
        label: classLabelMap[seg.label] || seg.label,
        count: seats.filter((s: any) => seg.rows.includes(s.row) && s.status === 'booked').length,
      }));
    }
  };

  // Gross income (sum of all bookings for the date and selected show)
  const grossIncome = (() => {
    const dateObj = new Date(selectedDate);
    const dateISO = dateObj.toISOString().split('T')[0];
    
    return (databaseBookings || []).reduce((sum, b) => {
      const dbDate = new Date(b.date).toISOString().split('T')[0];
      const showMatches = selectedShow ? b.show === selectedShow : true;
      if (dbDate === dateISO && showMatches) {
        return sum + (b.totalPrice || 0);
      }
      return sum;
    }, 0);
  })();

  // Calculate class counts once for the selected date and show
  const classCountsData = useMemo(() => {
    return getClassCounts(null);
  }, [selectedDate, selectedShow, databaseBookings]);

  // Recent bookings (last 3 for the date and selected show)
  const recentBookings = (() => {
    const dateObj = new Date(selectedDate);
    const dateISO = dateObj.toISOString().split('T')[0];
    
    const filteredBookings = (databaseBookings || []).filter(b => {
      const dbDate = new Date(b.date).toISOString().split('T')[0];
      const showMatches = selectedShow ? b.show === selectedShow : true;
      return dbDate === dateISO && showMatches;
    });
    
    return filteredBookings.slice(-3).reverse();
  })();

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
    const stats = allStats[showKey] || { total: 590, available: 590, booked: 0, bms: 0, blocked: 0, occupancy: '0.0' };
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
${booking.bookedSeats ? booking.bookedSeats.join(', ') : 'No seats'}

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
          
          {/* Show Selection Info */}
          {selectedShow && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-blue-800">
                    Showing data for: <span className="font-bold">{showOrder.find(s => s.key === selectedShow)?.label}</span>
                  </span>
                </div>
                <button
                  onClick={() => setSelectedShow(null)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          <div className="mt-2">
            <button
              onClick={() => {
                console.log('🔍 Manual fetch triggered');
                fetchBookings(selectedDate);
              }}
              className="text-sm text-green-600 hover:text-green-800"
            >
              Manual Fetch
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
          <div className="font-semibold mb-2">
            Seats Booked by Class
            {selectedShow && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({showOrder.find(s => s.key === selectedShow)?.label})
              </span>
            )}
          </div>
          <table className="w-full border rounded overflow-hidden text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3 text-left">Seat Class</th>
                <th className="py-2 px-3 text-right">Seats Booked</th>
              </tr>
            </thead>
            <tbody>
              {classCountsData.map((row, i) => (
                <tr key={row.label} className="border-b last:border-b-0">
                  <td className="py-2 px-3">{row.label}</td>
                  <td className="py-2 px-3 text-right">{row.count}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50">
                <td className="py-2 px-3">Total</td>
                <td className="py-2 px-3 text-right">{classCountsData.reduce((sum, r) => sum + r.count, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <div>
            <div className="font-semibold mb-2 mt-6">
              Recent Bookings
              {selectedShow && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({showOrder.find(s => s.key === selectedShow)?.label})
                </span>
              )}
            </div>
            <ul className="space-y-2">
              {recentBookings.map((b, i) => (
                <li key={i} className="bg-gray-50 rounded p-2 flex flex-col">
                  <span className="text-xs text-gray-500">{b.show} • {formatSafeDate(b.date)}</span>
                  <span className="font-semibold">{b.bookedSeats?.length || 0} seats</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Gross Income */}
        <div className="mt-6">
          <div className="font-semibold mb-1">
            Gross Income
            {selectedShow && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({showOrder.find(s => s.key === selectedShow)?.label})
              </span>
            )}
          </div>
          <div className="text-2xl font-bold">₹ {grossIncome}</div>
        </div>
      </div>
      {/* Right panel: Show-wise booking stats */}
      <div className="flex-1 space-y-6">
        <div className="font-semibold text-lg mb-4">Bookings for {formatSafeDate(selectedDate)}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showOrder.map(show => {
            const stats = allStats[show.key] || { total: 590, available: 590, booked: 0, bms: 0, blocked: 0, occupancy: '0.0' };
            const hasBookings = stats.booked > 0;
            const isSelected = selectedShow === show.key;
            return (
              <div 
                key={show.key} 
                className={`bg-white rounded-xl shadow p-6 flex flex-col gap-2 border-2 cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'
                }`}
                onClick={() => setSelectedShow(selectedShow === show.key ? null : show.key)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-base">{show.label}</span>
                  <span className="text-xs text-gray-400">
                    {loading ? 'Loading...' : hasBookings ? 'Live (saved)' : 'No bookings'}
                  </span>
                  <span className="text-xs text-blue-500 ml-auto">
                    {isSelected ? '✓ Selected' : 'Click to filter'}
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
                    onClick={() => { 
                      const booking = getBooking(selectedDate, show.key);
                      setSelectedBooking(booking); 
                      setViewerOpen(true); 
                    }}
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
