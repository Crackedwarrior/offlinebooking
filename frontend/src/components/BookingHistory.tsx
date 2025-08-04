
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useBookingStore, ShowTime } from '@/store/bookingStore';
import { seatSegments } from './SeatGrid';
import BookingViewerModal from './BookingViewerModal';
import SeatGridPreview from './SeatGridPreview';
import { formatSafeDate } from '../utils/formatDate';
import { SHOW_TIMES, getSeatPrice, SEAT_CLASSES } from '@/lib/config';
import { getBookings, getSeatStatus } from '@/services/api';
import { usePricing } from '@/hooks/use-pricing';
// import { toast } from '@/hooks/use-toast';
import { downloadShowReportPdf } from '@/utils/showReportPdfGenerator';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const showOrder: { key: ShowTime; label: string }[] = SHOW_TIMES.map(show => ({
  key: show.enumValue,
  label: show.label
}));

const classLabelMap: Record<string, string> = SEAT_CLASSES.reduce((acc, cls) => {
  acc[cls.label] = cls.label;
  return acc;
}, {} as Record<string, string>);

// Memoized table row component to prevent unnecessary re-renders
const TableRow = memo(({ row, index }: { row: any; index: number }) => (
  <tr className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.label}</td>
    <td className="px-4 py-3 text-sm text-gray-900 text-center">{row.regular}</td>
    <td className="px-4 py-3 text-sm text-gray-900 text-center">{row.bms}</td>
    <td className="px-4 py-3 text-sm text-gray-900 text-center">{row.total}</td>
  </tr>
));

// Memoized show card component
const ShowCard = memo(({ 
  show, 
  stats, 
  isSelected, 
  onSelect,
  onViewSeats
}: { 
  show: { key: ShowTime; label: string }; 
  stats: any; 
  isSelected: boolean; 
  onSelect: (show: ShowTime) => void;
  onViewSeats: (show: { key: ShowTime; label: string }) => void;
}) => (
  <div
    data-show-card
    className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 shadow-md' 
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
    }`}
    onClick={() => onSelect(show.key)}
  >
    <div className="flex items-center justify-between mb-2">
      <h3 
        className="font-semibold text-gray-900"
      >
        {show.label}
      </h3>
      {isSelected && (
        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
      )}
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
      <div className="text-center">
        <div className="text-gray-600">Booked</div>
        <div className="font-semibold text-green-600">{stats.booked}</div>
      </div>
      <div className="text-center">
        <div className="text-gray-600">BMS</div>
        <div className="font-semibold text-blue-600">{stats.bms}</div>
      </div>
      <div className="text-center">
        <div className="text-gray-600">Available</div>
        <div className="font-semibold text-gray-700">{stats.available}</div>
      </div>
      <div className="text-center">
        <div className="text-gray-600">Occupancy</div>
        <div className="font-semibold text-purple-600">{stats.occupancy}%</div>
      </div>
    </div>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onViewSeats(show);
      }}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors duration-200"
    >
      View Seats
    </button>
  </div>
));

const BookingHistory = () => {
  const { bookingHistory, seats, loadBookingForDate } = useBookingStore();
  const { getPriceForClass } = usePricing(); // Add dynamic pricing
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [databaseBookings, setDatabaseBookings] = useState<any[]>([]);
  const [seatStatusData, setSeatStatusData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [selectedShow, setSelectedShow] = useState<ShowTime | null>(null);
  
  // Seat Grid Preview Modal State
  const [seatGridPreviewOpen, setSeatGridPreviewOpen] = useState(false);
  const [previewShow, setPreviewShow] = useState<{ key: ShowTime; label: string } | null>(null);

  // Handle click outside to deselect show cards
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is outside of show cards
      const isOutsideShowCards = !target.closest('[data-show-card]');
      const isOutsideDatePicker = !target.closest('.react-datepicker');
      const isOutsideModal = !target.closest('[data-modal]');
      
      if (isOutsideShowCards && isOutsideDatePicker && isOutsideModal && selectedShow !== null) {
        setSelectedShow(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedShow]);

  // Get dates with bookings for highlighting
  const datesWithBookings = useMemo(() => {
    const dates = new Set<string>();
    if (databaseBookings && databaseBookings.length > 0) {
      databaseBookings.forEach(booking => {
        const bookingDate = new Date(booking.date).toISOString().split('T')[0];
        dates.add(bookingDate);
      });
    }
    return dates;
  }, [databaseBookings]);

  // Handle view seats for a specific show
  const handleViewSeats = useCallback((show: { key: ShowTime; label: string }) => {
    console.log('🔍 View Seats clicked:', {
      show,
      selectedDate,
      databaseBookings: databaseBookings.length,
      datesWithBookings: Array.from(datesWithBookings)
    });
    setPreviewShow(show);
    setSeatGridPreviewOpen(true);
  }, [selectedDate, databaseBookings, datesWithBookings]);

  // Handle date selection
  const handleDateChange = useCallback((date: Date | null) => {
    try {
      if (date) {
        const dateString = date.toISOString().split('T')[0];
        setSelectedDate(dateString);
      }
    } catch (error) {
      console.error('Error in date change handler:', error);
      // Fallback to current date if there's an error
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  }, []);

  // Check if a date has bookings for highlighting
  const dayClassName = useCallback((date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return datesWithBookings.has(dateString) ? 'has-bookings' : '';
  }, [datesWithBookings]);

  // Add custom styles for date picker highlighting
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .react-datepicker__day--highlighted {
        background-color: #10b981 !important;
        color: white !important;
        border-radius: 0.375rem !important;
      }
      .react-datepicker__day--highlighted:hover {
        background-color: #059669 !important;
      }
      .react-datepicker__day--selected {
        background-color: #3b82f6 !important;
        color: white !important;
      }
      .react-datepicker__day--selected:hover {
        background-color: #2563eb !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch bookings and seat status data
  const fetchBookings = useCallback(async (date: string) => {
    setLoading(true);
    try {
      // Fetch bookings
      const bookingsResponse = await getBookings(date);
      if (bookingsResponse.success) {
        setDatabaseBookings(bookingsResponse.data || []);
      }

      // Fetch seat status for all shows
      const seatStatusPromises = showOrder.map(async (show) => {
        try {
          const response = await getSeatStatus({ date, show: show.key });
          return { show: show.key, data: response.success ? response.data : null };
        } catch (error) {
          return { show: show.key, data: null };
        }
      });

      const seatStatusResults = await Promise.all(seatStatusPromises);
      const seatStatusMap: Record<string, any> = {};
      seatStatusResults.forEach(({ show, data }) => {
        if (data) {
          seatStatusMap[show] = data;
        }
      });
      setSeatStatusData(seatStatusMap);

    } catch (error) {
      console.error('❌ Error fetching data:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to connect to database.',
      //   variant: 'destructive',
      // });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch bookings when date changes
  useEffect(() => {
    fetchBookings(selectedDate);
  }, [selectedDate, fetchBookings]);

  // Helper to get all bookings for a date (from database)
  const bookingsForDate = databaseBookings;

  // Helper to get booking for a date and show
  const getBooking = useCallback((date: string, show: ShowTime) => {
    // Convert date to ISO format for comparison
    const dateObj = new Date(date);
    const dateISO = dateObj.toISOString().split('T')[0];
    
    return (databaseBookings || []).find(b => {
      // Extract date part from database date (which is in ISO format)
      const dbDate = new Date(b.date).toISOString().split('T')[0];
      return dbDate === dateISO && b.show === show;
    });
  }, [databaseBookings]);

  // Calculate all stats once for the selected date - only when needed
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
      
      // Get BMS seats from seat status data
      const showSeatStatus = seatStatusData[show.key];
      const bms = showSeatStatus?.bmsSeats?.length || 0;
      
      const available = total - booked - bms;
      const blocked = 0; // No blocked seats yet
      const occupancy = ((booked + bms) / (total || 1) * 100).toFixed(1);
      
      stats[show.key] = { total, available, booked, bms, blocked, occupancy };
    });
    
    return stats;
  }, [selectedDate, databaseBookings, seatStatusData]);

  // Helper to get seat class breakdown for a booking or fallback to current seats
  const getClassCounts = useCallback((booking: any) => {
    // Always use database bookings when available, regardless of booking parameter
    if (databaseBookings && databaseBookings.length > 0) {
      // Database booking format - count by classLabel for the selected date and show
      const dateObj = new Date(selectedDate);
      const dateISO = dateObj.toISOString().split('T')[0];
      
      const classCounts: Record<string, { regular: number; bms: number }> = {};
      const uniqueSeatsByClass: Record<string, { regular: Set<string>; bms: Set<string> }> = {};
      
      // Process regular bookings from database
      (databaseBookings || []).forEach((b, index) => {
        const dbDate = new Date(b.date).toISOString().split('T')[0];
        const showMatches = selectedShow ? b.show === selectedShow : true;
        
        if (dbDate === dateISO && showMatches && b.classLabel) {
          // Initialize sets for this class if not exists
          if (!uniqueSeatsByClass[b.classLabel]) {
            uniqueSeatsByClass[b.classLabel] = { regular: new Set<string>(), bms: new Set<string>() };
          }
          
          // Add unique seats for this class based on source
          if (b.bookedSeats && Array.isArray(b.bookedSeats)) {
            const isBMS = b.source === 'BMS' || b.source === 'bms';
            b.bookedSeats.forEach(seatId => {
              if (isBMS) {
                uniqueSeatsByClass[b.classLabel].bms.add(seatId);
              } else {
                uniqueSeatsByClass[b.classLabel].regular.add(seatId);
              }
            });
          }
        }
      });
      
      // Process BMS seats from seat status data
      if (selectedShow) {
        // For specific show, get BMS seats from that show's seat status
        const showSeatStatus = seatStatusData[selectedShow];
        if (showSeatStatus?.bmsSeats && Array.isArray(showSeatStatus.bmsSeats)) {
          
          showSeatStatus.bmsSeats.forEach((bmsSeat: any) => {
            const seatId = bmsSeat.seatId;
            // Determine class from seat ID (e.g., "SC-D1" -> "STAR CLASS")
            const classLabel = getClassFromSeatId(seatId);
            
            if (classLabel) {
              if (!uniqueSeatsByClass[classLabel]) {
                uniqueSeatsByClass[classLabel] = { regular: new Set<string>(), bms: new Set<string>() };
              }
              // Use a unique key that includes the show to avoid deduplication
              const uniqueKey = `${selectedShow}-${seatId}`;
              uniqueSeatsByClass[classLabel].bms.add(uniqueKey);
            }
          });
        }
      } else {
        // For all shows, aggregate BMS seats from all shows
        
        // Only proceed if seatStatusData is populated
        if (Object.keys(seatStatusData).length > 0) {
          Object.entries(seatStatusData).forEach(([showKey, showSeatStatus]) => {
            if (showSeatStatus?.bmsSeats && Array.isArray(showSeatStatus.bmsSeats)) {
              
              showSeatStatus.bmsSeats.forEach((bmsSeat: any) => {
                const seatId = bmsSeat.seatId;
                const classLabel = getClassFromSeatId(seatId);
                
                if (classLabel) {
                  if (!uniqueSeatsByClass[classLabel]) {
                    uniqueSeatsByClass[classLabel] = { regular: new Set<string>(), bms: new Set<string>() };
                  }
                  // Don't deduplicate - count each seat from each show separately
                  // Use a unique key that includes the show to avoid deduplication
                  const uniqueKey = `${showKey}-${seatId}`;
                  uniqueSeatsByClass[classLabel].bms.add(uniqueKey);
                }
              });
            }
          });
        }
        
        // Debug: Log all unique BMS seats by class
        // console.log('🔍 Final unique BMS seats by class:', Object.fromEntries(
        //   Object.entries(uniqueSeatsByClass).map(([classLabel, seatSets]) => [
        //     classLabel, 
        //     {
        //       regular: Array.from(seatSets.regular),
        //       bms: Array.from(seatSets.bms)
        //     }
        //   ])
        // ));
      }
      
      // Convert sets to counts
      Object.entries(uniqueSeatsByClass).forEach(([classLabel, seatSets]) => {
        classCounts[classLabel] = {
          regular: seatSets.regular.size,
          bms: seatSets.bms.size
        };
      });
      
      // Add debug logging
      // console.log(`🔍 getClassCounts - Final results:`, {
      //   dateISO,
      //   selectedShow: selectedShow || 'ALL SHOWS',
      //   databaseBookings: databaseBookings.length,
      //   filteredBookings: (databaseBookings || []).filter(b => {
      //     const dbDate = new Date(b.date).toISOString().split('T')[0];
      //     const showMatches = selectedShow ? b.show === selectedShow : true;
      //     return dbDate === dateISO && showMatches;
      //   }).length,
      //   classCounts,
      //   uniqueSeatsByClass: Object.fromEntries(
      //     Object.entries(uniqueSeatsByClass).map(([classLabel, seatSets]) => [
      //       classLabel, 
      //       {
      //         regular: Array.from(seatSets.regular),
      //         bms: Array.from(seatSets.bms)
      //       }
      //     ])
      //   )
      // });
      
      // Debug: Log the actual class labels found in database
      // console.log('🔍 Database class labels found:', Object.keys(classCounts));
      // console.log('🔍 Seat segments expected:', seatSegments.map(seg => seg.label));
      
      return seatSegments.map(seg => {
        const counts = classCounts[seg.label] || { regular: 0, bms: 0 };
        // console.log(`🔍 Class ${seg.label}: ${counts.regular} regular, ${counts.bms} BMS seats`);
        return {
          label: classLabelMap[seg.label] || seg.label,
          regular: counts.regular,
          bms: counts.bms,
          total: counts.regular + counts.bms
        };
      });
    } else {
      // Fallback to current seats
      return seatSegments.map(seg => {
        const regularSeats = seats.filter((s: any) => seg.rows.includes(s.row) && s.status === 'BOOKED').length;
        const bmsSeats = seats.filter((s: any) => seg.rows.includes(s.row) && s.status === 'BMS_BOOKED').length;
        return {
        label: classLabelMap[seg.label] || seg.label,
          regular: regularSeats,
          bms: bmsSeats,
          total: regularSeats + bmsSeats
        };
      });
    }
  }, [databaseBookings, selectedDate, selectedShow, seats, seatStatusData]);

  // Helper function to determine class from seat ID
  const getClassFromSeatId = useCallback((seatId: string): string | null => {
    // Extract row prefix from seat ID (e.g., "SC-D1" -> "SC")
    const rowPrefix = seatId.split('-')[0];
    
    // Map row prefixes to class labels - match with BoxVsOnlineReport
    const classMapping: Record<string, string> = {
      'BOX': 'BOX',
      'SC': 'STAR CLASS',
      'CB': 'CLASSIC BALCONY',
      'FC': 'FIRST CLASS',
      'SEC': 'SECOND CLASS'
    };
    
    return classMapping[rowPrefix] || null;
  }, []);

  // Gross income (sum of all bookings for the date and selected show, or all shows if none selected)
  const incomeBreakdown = useMemo(() => {
    const dateObj = new Date(selectedDate);
    const dateISO = dateObj.toISOString().split('T')[0];
    
    let onlineIncome = 0;
    let bmsIncome = 0;
    
    // Calculate income from database bookings
    (databaseBookings || []).forEach(b => {
      const dbDate = new Date(b.date).toISOString().split('T')[0];
      const showMatches = selectedShow ? b.show === selectedShow : true; // Show all if no show selected
      if (dbDate === dateISO && showMatches) {
        const isBMS = b.source === 'BMS' || b.source === 'bms';
        if (isBMS) {
          bmsIncome += (b.totalPrice || 0);
        } else {
          onlineIncome += (b.totalPrice || 0);
        }
      }
    });
    
    // Calculate additional BMS income from seat status data
    if (selectedShow) {
      // For specific show, get BMS seats from that show's seat status
      const showSeatStatus = seatStatusData[selectedShow];
      if (showSeatStatus?.bmsSeats && Array.isArray(showSeatStatus.bmsSeats)) {
        showSeatStatus.bmsSeats.forEach((bmsSeat: any) => {
          const seatId = bmsSeat.seatId;
          const classLabel = getClassFromSeatId(seatId);
          if (classLabel) {
            // Use dynamic pricing from settings store (same as regular seats)
            const price = getPriceForClass(classLabel);
            bmsIncome += price;
          }
        });
      }
    } else {
      // For all shows, aggregate BMS income from all shows
      Object.entries(seatStatusData).forEach(([showKey, showSeatStatus]) => {
        if (showSeatStatus?.bmsSeats && Array.isArray(showSeatStatus.bmsSeats)) {
                  showSeatStatus.bmsSeats.forEach((bmsSeat: any) => {
          const seatId = bmsSeat.seatId;
          const classLabel = getClassFromSeatId(seatId);
          if (classLabel) {
            // Use dynamic pricing from settings store (same as regular seats)
            const price = getPriceForClass(classLabel);
            bmsIncome += price;
          }
        });
        }
      });
    }
    
    // Debug logging for BMS income calculation
    if (bmsIncome > 0) {
      console.log('💰 BMS Income Calculation:', {
        date: selectedDate,
        show: selectedShow || 'All Shows',
        bmsIncome,
        breakdown: {
          fromDatabase: (databaseBookings || []).filter(b => {
            const dbDate = new Date(b.date).toISOString().split('T')[0];
            const showMatches = selectedShow ? b.show === selectedShow : true;
            return dbDate === dateISO && showMatches && (b.source === 'BMS' || b.source === 'bms');
          }).reduce((sum, b) => sum + (b.totalPrice || 0), 0),
          fromSeatStatus: bmsIncome - (databaseBookings || []).filter(b => {
            const dbDate = new Date(b.date).toISOString().split('T')[0];
            const showMatches = selectedShow ? b.show === selectedShow : true;
            return dbDate === dateISO && showMatches && (b.source === 'BMS' || b.source === 'bms');
          }).reduce((sum, b) => sum + (b.totalPrice || 0), 0)
        }
      });
    }

    return {
      online: onlineIncome,
      bms: bmsIncome,
      total: onlineIncome + bmsIncome
    };
  }, [selectedDate, databaseBookings, selectedShow, seatStatusData, getClassFromSeatId]);

  // Keep the old grossIncome for backward compatibility
  const grossIncome = incomeBreakdown.total;

  // Calculate class counts once for the selected date and show (or all shows if none selected)
  const classCountsData = useMemo(() => {
    const result = getClassCounts(null);
    return result;
  }, [getClassCounts]);

  // Memoize quick summary calculations to prevent recalculation on every render
  const quickSummaryData = useMemo(() => {
    const totalBookingSeats = classCountsData.reduce((sum, r) => sum + r.regular, 0);
    const totalOnlineSeats = classCountsData.reduce((sum, r) => sum + r.bms, 0);
    const totalSeats = classCountsData.reduce((sum, r) => sum + r.total, 0);
    
    return {
      totalBookingSeats,
      totalOnlineSeats,
      totalSeats
    };
  }, [classCountsData]);

  // Memoize income percentages to prevent recalculation
  const incomePercentages = useMemo(() => {
    const bookingPercentage = incomeBreakdown.total > 0 ? Math.round((incomeBreakdown.online / incomeBreakdown.total) * 100) : 0;
    const onlinePercentage = incomeBreakdown.total > 0 ? Math.round((incomeBreakdown.bms / incomeBreakdown.total) * 100) : 0;
    
    return {
      bookingPercentage,
      onlinePercentage
    };
  }, [incomeBreakdown]);

  // Handle PDF download for a specific show
  const handleDownloadPDF = useCallback(async (showKey: ShowTime, date: string) => {
    try {
      // Get show label
      const showLabel = showOrder.find(s => s.key === showKey)?.label || showKey;
      
      // Get stats for this show
      const stats = allStats[showKey] || { total: 590, available: 590, booked: 0, bms: 0, blocked: 0, occupancy: '0.0' };
      
      // Get bookings for this specific show
      const showBookings = databaseBookings.filter(booking => booking.show === showKey);
      
      // Get class counts for this show
      const classCounts = getClassCounts({ 
        date, 
        show: showKey, 
        bookedSeats: showBookings.flatMap(b => b.bookedSeats || [])
      });
      
      // Prepare report data
      const reportData = {
        date,
        show: showKey,
        showLabel,
        stats: {
          total: stats.total,
          available: stats.available,
          booked: stats.booked,
          bms: stats.bms,
          occupancy: stats.occupancy
        },
        bookings: showBookings.map(booking => ({
          id: booking.id,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          bookedSeats: booking.bookedSeats || [],
          classLabel: booking.classLabel,
          totalPrice: booking.totalPrice,
          status: booking.status,
          movie: booking.movie,
          movieLanguage: booking.movieLanguage
        })),
        classCounts
      };
      
      // Generate and download PDF
      await downloadShowReportPdf(reportData);
      
      // toast({
      //   title: 'Success',
      //   description: `PDF report downloaded for ${showLabel}`,
      // });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to generate PDF report',
      //   variant: 'destructive',
      // });
    }
  }, [databaseBookings, getClassCounts, allStats, showOrder, downloadShowReportPdf]);

  // UI
  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Booking History</h2>
          <p className="text-gray-600">View and manage all bookings</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Date:</label>
          <div className="relative">
            <DatePicker
              selected={new Date(selectedDate)}
              onChange={handleDateChange}
              dateFormat="dd/MM/yyyy"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-0 focus:border-gray-300 hover:border-gray-400 transition-colors w-40"
              placeholderText="Select date"
              dayClassName={dayClassName}
              highlightDates={Array.from(datesWithBookings).map(date => new Date(date))}
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
              yearDropdownItemNumber={15}
              scrollableYearDropdown
              maxDate={new Date()}
              popperPlacement="bottom-start"
              onCalendarOpen={() => {
                // Prevent positioning errors by ensuring the calendar opens properly
                setTimeout(() => {
                  const calendar = document.querySelector('.react-datepicker');
                  if (calendar) {
                    calendar.setAttribute('data-popper-placement', 'bottom-start');
                  }
                }, 0);
              }}
            />
          </div>
        </div>
          </div>
          
          {/* Show Selection Info */}
          {selectedShow ? (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
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
              Clear Filter
                </button>
              </div>
            </div>
          ) : (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-green-800">
                    Showing aggregated data for: <span className="font-bold">All Shows</span>
                  </span>
                </div>
                <button
                  onClick={() => setSelectedShow(showOrder[0]?.key || null)}
                  className="text-xs text-green-600 hover:text-green-800 font-medium"
                >
              Filter by Show
                </button>
              </div>
            </div>
          )}

      {/* Show Cards - Interactive */}
      <div>
        <div className="font-semibold text-lg mb-3">Shows Overview</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {showOrder.map(show => {
            const stats = allStats[show.key] || { total: 590, available: 590, booked: 0, bms: 0, blocked: 0, occupancy: '0.0' };
            const isSelected = selectedShow === show.key;
            return (
              <ShowCard
                key={show.key} 
                show={show} 
                stats={stats} 
                isSelected={isSelected} 
                onSelect={setSelectedShow}
                onViewSeats={handleViewSeats}
              />
            );
          })}
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Seats Table */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="font-semibold mb-3 text-base">
            Seats Booked by Class
            {selectedShow ? (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({showOrder.find(s => s.key === selectedShow)?.label})
              </span>
            ) : (
              <span className="text-sm font-normal text-gray-600 ml-2">
                (All Shows)
              </span>
            )}
          </div>
          {!selectedShow && (
              <div className="text-xs text-gray-500 italic mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              Showing aggregated data for all shows on this date
            </div>
          )}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
            <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
                    <th className="py-3 px-3 text-left font-bold text-gray-700 border-r border-gray-300">Class</th>
                    <th className="py-3 px-3 text-center font-bold text-green-700 border-r border-gray-300">Booking</th>
                    <th className="py-3 px-3 text-center font-bold text-blue-700 border-r border-gray-300">Online</th>
                    <th className="py-3 px-3 text-center font-bold text-gray-800">Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                return classCountsData.map((row, i) => (
                  <TableRow key={row.label} row={row} index={i} />
                ));
              })()}
                  <tr className="bg-gradient-to-r from-gray-200 to-gray-300 font-bold">
                    <td className="py-3 px-3 text-gray-800 border-r border-gray-400">TOTAL</td>
                    <td className="py-3 px-3 text-center text-green-700 border-r border-gray-400">
                      {classCountsData.reduce((sum, r) => sum + r.regular, 0)}
                    </td>
                    <td className="py-3 px-3 text-center text-blue-700 border-r border-gray-400">
                      {classCountsData.reduce((sum, r) => sum + r.bms, 0)}
                    </td>
                    <td className="py-3 px-3 text-center text-gray-800">
                      {classCountsData.reduce((sum, r) => sum + r.total, 0)}
                    </td>
              </tr>
            </tbody>
          </table>
        </div>
          </div>

          {/* Quick Summary - Moved below table */}
          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="font-semibold mb-3 text-base">Quick Summary</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center flex flex-col justify-between h-24">
                <div className="text-sm text-green-600 font-medium leading-tight">TOTAL BOOKING SEATS</div>
                <div className="text-xl font-bold text-green-700">
                  {quickSummaryData.totalBookingSeats}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center flex flex-col justify-between h-24">
                <div className="text-sm text-blue-600 font-medium leading-tight">TOTAL ONLINE SEATS</div>
                <div className="text-xl font-bold text-blue-700">
                  {quickSummaryData.totalOnlineSeats}
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center flex flex-col justify-between h-24">
                <div className="text-sm text-gray-600 font-medium leading-tight">TOTAL SEATS</div>
                <div className="text-xl font-bold text-gray-700">
                  {quickSummaryData.totalSeats}
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center flex flex-col justify-between h-24">
                <div className="text-sm text-purple-600 font-medium leading-tight">TOTAL INCOME</div>
                <div className="text-xl font-bold text-purple-700">₹ {incomeBreakdown.total}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Income Breakdown */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="font-semibold mb-4 text-base">
              Income Breakdown
            {selectedShow ? (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({showOrder.find(s => s.key === selectedShow)?.label})
              </span>
            ) : (
              <span className="text-sm font-normal text-gray-600 ml-2">
                (All Shows)
              </span>
            )}
          </div>
            
            {/* Total Income - Prominent */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-4 mb-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">TOTAL GROSS INCOME</div>
                <div className="text-2xl font-bold text-green-700">₹ {incomeBreakdown.total}</div>
        </div>
      </div>
            
            {/* Income Breakdown Cards */}
            <div className="space-y-3">
              <div className="bg-white border-2 border-green-300 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-green-700 text-sm">BOOKING INCOME</span>
                  </div>
                  <div className="text-lg font-bold text-green-700">₹ {incomeBreakdown.online}</div>
                </div>
                <div className="text-xs text-gray-500">
                  Direct bookings from your system
                </div>
              </div>
              
              <div className="bg-white border-2 border-blue-300 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-semibold text-blue-700 text-sm">ONLINE INCOME</span>
                  </div>
                  <div className="text-lg font-bold text-blue-700">₹ {incomeBreakdown.bms}</div>
                </div>
                <div className="text-xs text-gray-500">
                  Book My Show platform bookings
                </div>
              </div>
            </div>
            
            {/* Summary and Percentages */}
            <div className="mt-4 space-y-3">
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                <div className="text-sm font-bold text-gray-800 mb-2">INCOME SUMMARY</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booking:</span>
                    <span className="font-medium">₹{incomeBreakdown.online}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">+ Online:</span>
                    <span className="font-medium">₹{incomeBreakdown.bms}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1 mt-1">
                    <span className="text-gray-800">= Total:</span>
                    <span className="text-gray-800">₹{incomeBreakdown.total}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                  <div className="text-xs text-green-600 font-medium">BOOKING %</div>
                  <div className="text-lg font-bold text-green-700">
                    {incomePercentages.bookingPercentage}%
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                  <div className="text-xs text-blue-600 font-medium">ONLINE %</div>
                  <div className="text-lg font-bold text-blue-700">
                    {incomePercentages.onlinePercentage}%
                  </div>
                </div>
              </div>
            </div>
          </div>
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

      {/* SeatGridPreview Modal */}
      {previewShow && (
        <SeatGridPreview
          isOpen={seatGridPreviewOpen}
          onClose={() => setSeatGridPreviewOpen(false)}
          date={selectedDate}
          show={previewShow.key}
          showLabel={previewShow.label}
        />
      )}
    </div>
  );
};

export default BookingHistory;
