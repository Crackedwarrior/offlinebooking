
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useBookingStore, ShowTime } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { seatSegments } from './SeatGrid';
import BookingViewerModal from './BookingViewerModal';
import SeatGrid from './SeatGrid';
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

type ClassCountRow = {
  label: string;
  regular: number;
  bms: number;
  total: number;
};

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
    className={`p-2 md:p-3 rounded-md border transition-all duration-200 cursor-pointer ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 shadow' 
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
    }`}
    onClick={() => onSelect(show.key)}
  >
    <div className="flex items-center justify-between mb-1">
      <h3 
        className="font-semibold text-gray-900 text-sm md:text-base"
      >
        {show.label}
      </h3>
      {isSelected && (
        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
      )}
    </div>
    <div className="grid grid-cols-2 gap-1 text-xs md:text-[13px] mb-2">
      <div className="flex items-center justify-center gap-1">
        <span className="text-gray-600">Booked:</span>
        <span className="font-semibold text-green-600">{stats.booked}</span>
      </div>
      <div className="flex items-center justify-center gap-1">
        <span className="text-gray-600">BMS:</span>
        <span className="font-semibold text-blue-600">{stats.bms}</span>
      </div>
      <div className="flex items-center justify-center gap-1">
        <span className="text-gray-600">Available:</span>
        <span className="font-semibold text-gray-700">{stats.available}</span>
      </div>
      <div className="flex items-center justify-center gap-1">
        <span className="text-gray-600">Occupancy:</span>
        <span className="font-semibold text-purple-600">{stats.occupancy}%</span>
      </div>
    </div>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onViewSeats(show);
      }}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium py-1.5 md:py-2 px-2 md:px-3 rounded-md transition-colors duration-200"
    >
      View Seats
    </button>
  </div>
));

const BookingHistory = () => {
  const { bookingHistory, seats, loadBookingForDate } = useBookingStore();
  const { getPriceForClass, pricingVersion } = usePricing(); // Add dynamic pricing and pricingVersion
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [databaseBookings, setDatabaseBookings] = useState<any[]>([]);
  const [seatStatusData, setSeatStatusData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [selectedShow, setSelectedShow] = useState<ShowTime | null>(null);
  
  // Seat Grid State - show main SeatGrid when a show is selected
  const [showSeatGrid, setShowSeatGrid] = useState(false);
  const [selectedShowForSeats, setSelectedShowForSeats] = useState<{ key: ShowTime; label: string } | null>(null);

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
    console.log('[HISTORY] View Seats clicked:', {
      show,
      selectedDate,
      databaseBookings: databaseBookings.length,
      datesWithBookings: Array.from(datesWithBookings)
    });
    setSelectedShowForSeats(show);
    setShowSeatGrid(true);
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
      const bookingsResponse = await getBookings({ date });
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
      console.error('[ERROR] Error fetching data:', error);
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
      const localSeatIds = new Set<string>();
      const bmsSeatIds = new Set<string>();

      const showBookings = (databaseBookings || []).filter(b => {
        const dbDate = new Date(b.date).toISOString().split('T')[0];
        return dbDate === dateISO && b.show === show.key;
      });
      
      showBookings.forEach(b => {
        if (!Array.isArray(b.bookedSeats)) return;
        const isBmsBooking = b.source === 'BMS' || b.source === 'bms';
        b.bookedSeats.forEach(seatId => {
          const key = `${show.key}-${seatId}`;
          if (isBmsBooking) {
            bmsSeatIds.add(key);
          } else {
            localSeatIds.add(key);
          }
        });
      });

      const showSeatStatus = seatStatusData[show.key];
      if (showSeatStatus) {
        (showSeatStatus.bookedSeats || []).forEach((seat: any) => {
          const seatId = typeof seat === 'string' ? seat : seat?.seatId;
          if (!seatId) return;
          localSeatIds.add(`${show.key}-${seatId}`);
        });

        (showSeatStatus.bmsSeats || []).forEach((seat: any) => {
          const seatId = typeof seat === 'string' ? seat : seat?.seatId;
          if (!seatId) return;
          bmsSeatIds.add(`${show.key}-${seatId}`);
        });
      }

      const total = 590; // Total seats in theater
      const booked = localSeatIds.size;
      const bms = bmsSeatIds.size;
      const available = total - booked - bms;
      const blocked = 0; // No blocked seats yet
      const occupancy = ((booked + bms) / (total || 1) * 100).toFixed(1);
      
      stats[show.key] = { total, available, booked, bms, blocked, occupancy };
    });
    
    return stats;
  }, [selectedDate, databaseBookings, seatStatusData]);

  // Helper function to determine class from seat ID
  const getClassFromSeatId = useCallback((seatId: string): string | null => {
    // Extract row prefix from seat ID (e.g., "SC-D1" -> "SC")
    const rowPrefix = seatId.split('-')[0];
    
    // Map row prefixes to class labels - match with server.ts implementation
    const classMapping: Record<string, string> = {
      'BOX': 'BOX',
      'SC': 'STAR CLASS',
      'CB': 'CLASSIC',  // CLASSIC instead of CLASSIC BALCONY to match server.ts
      'FC': 'FIRST CLASS',
      'SC2': 'SECOND CLASS'  // SC2 instead of SEC to match server.ts
    };
    
    // Check for exact match first
    if (classMapping[rowPrefix]) {
      return classMapping[rowPrefix];
    }
    
    // If no exact match, check for prefix match (for cases like SC2-A1)
    for (const [prefix, classLabel] of Object.entries(classMapping)) {
      if (rowPrefix.startsWith(prefix)) {
        return classLabel;
      }
    }
    
    console.warn(`⚠️ Could not determine class for seat ID: ${seatId}`);
    // Do not misclassify unknown rows into STAR CLASS. Return null so caller can ignore.
    return null;
  }, []);

  // Build seat sets for a given show and date using both seat status data and bookings
  const buildSeatSetsForShow = useCallback((showKey: ShowTime, dateISO: string) => {
    const classSeatSets: Record<string, { regular: Set<string>; bms: Set<string> }> = {};

    const ensureClassEntry = (classLabel: string) => {
      if (!classSeatSets[classLabel]) {
        classSeatSets[classLabel] = {
          regular: new Set<string>(),
          bms: new Set<string>()
        };
      }
      return classSeatSets[classLabel];
    };

    const addSeat = (seatId: string | undefined, classLabel: string | undefined | null, type: 'regular' | 'bms') => {
      if (!seatId) return;
      const resolvedClass = classLabel || getClassFromSeatId(seatId);
      if (!resolvedClass) return;
      const targetSets = ensureClassEntry(resolvedClass);
      const uniqueKey = `${showKey}-${seatId}`;
      if (type === 'regular') {
        targetSets.regular.add(uniqueKey);
              } else {
        targetSets.bms.add(uniqueKey);
      }
    };

    const showSeatStatus = seatStatusData[showKey];
    if (showSeatStatus) {
      (showSeatStatus.bookedSeats || []).forEach((seat: any) => {
        const seatId = typeof seat === 'string' ? seat : seat?.seatId;
        const classLabel = typeof seat === 'string' ? undefined : seat?.class || seat?.classLabel;
        addSeat(seatId, classLabel, 'regular');
      });

      (showSeatStatus.bmsSeats || []).forEach((seat: any) => {
        const seatId = typeof seat === 'string' ? seat : seat?.seatId;
        const classLabel = typeof seat === 'string' ? undefined : seat?.class || seat?.classLabel;
        addSeat(seatId, classLabel, 'bms');
      });
    }

    (databaseBookings || []).forEach(b => {
      const dbDate = new Date(b.date).toISOString().split('T')[0];
      if (dbDate !== dateISO || b.show !== showKey || !Array.isArray(b.bookedSeats)) return;

      const isBMS = b.source === 'BMS' || b.source === 'bms';
      b.bookedSeats.forEach(seatEntry => {
        const seatId = typeof seatEntry === 'string' ? seatEntry : seatEntry?.seatId;
        // Derive class per seatId to prevent misclassification (no defaulting to STAR CLASS)
        const derivedClass = seatId ? getClassFromSeatId(seatId) : null;
        const classLabel = typeof seatEntry === 'string'
          ? (derivedClass || b.classLabel)
          : (seatEntry?.class || seatEntry?.classLabel || derivedClass || b.classLabel);
        addSeat(seatId, classLabel, isBMS ? 'bms' : 'regular');
      });
    });

    return classSeatSets;
  }, [seatStatusData, databaseBookings, getClassFromSeatId]);

  // Helper to get seat class breakdown for a booking or fallback to current seats
  const getClassCounts = useCallback((options?: { date?: string; show?: ShowTime | null }) => {
    const dateISO = options?.date || selectedDate;
    const showFilter = options?.show ?? selectedShow;

    const aggregateSets: Record<string, { regular: Set<string>; bms: Set<string> }> = {};

    const mergeClassSets = (classSets: Record<string, { regular: Set<string>; bms: Set<string> }>) => {
      Object.entries(classSets).forEach(([classLabel, seatSets]) => {
        if (!aggregateSets[classLabel]) {
          aggregateSets[classLabel] = { regular: new Set<string>(), bms: new Set<string>() };
        }
        seatSets.regular.forEach(id => aggregateSets[classLabel].regular.add(id));
        seatSets.bms.forEach(id => aggregateSets[classLabel].bms.add(id));
      });
    };

    if (showFilter) {
      mergeClassSets(buildSeatSetsForShow(showFilter, dateISO));
    } else {
      showOrder.forEach(show => {
        mergeClassSets(buildSeatSetsForShow(show.key, dateISO));
      });
    }

    if (Object.keys(aggregateSets).length === 0) {
      // No API data yet: avoid using local in-memory seats which may belong to a different date/show.
      // Return zeros per class and let UI update when fresh data arrives.
      return seatSegments.reduce<Record<string, { regular: number; bms: number }>>((acc, seg) => {
        acc[seg.label] = { regular: 0, bms: 0 };
        return acc;
      }, {});
    }

    return Object.entries(aggregateSets).reduce<Record<string, { regular: number; bms: number }>>((acc, [classLabel, seatSets]) => {
      acc[classLabel] = {
          regular: seatSets.regular.size,
          bms: seatSets.bms.size
        };
      return acc;
    }, {});
  }, [buildSeatSetsForShow, selectedDate, selectedShow, showOrder, seatSegments, seats]);


  // Gross income (sum of all bookings for the date and selected show, or all shows if none selected)
  // Calculate income breakdown for the selected date and show
  const incomeBreakdown = useMemo(() => {
    console.log('[PRICE] Recalculating income breakdown with pricingVersion:', pricingVersion);
    // Get the latest pricing values directly from the store
    const currentPricing = useSettingsStore.getState().pricing;
    console.log('[PRICE] Current pricing values:', currentPricing);
    const dateISO = selectedDate;
    
    let onlineIncome = 0;
    let bmsIncome = 0;
    
    // Calculate income from database bookings
    (databaseBookings || []).forEach(b => {
      const dbDate = new Date(b.date).toISOString().split('T')[0];
      const showMatches = selectedShow ? b.show === selectedShow : true; // Show all if no show selected
      if (dbDate === dateISO && showMatches) {
        // All bookings from database are currently marked as LOCAL source
        // since we're not setting the source correctly in the backend
        // For now, we'll consider all database bookings as online income
        onlineIncome += (b.totalPrice || 0);
      }
    });
    
    console.log('[PRICE] Income from database bookings:', {
      date: selectedDate,
      show: selectedShow || 'All Shows',
      onlineIncome
    });
    
    // Calculate additional BMS income from seat status data
    if (selectedShow) {
      // For specific show, get BMS seats from that show's seat status
      const showSeatStatus = seatStatusData[selectedShow];
      if (showSeatStatus?.bmsSeats && Array.isArray(showSeatStatus.bmsSeats)) {
        // Group BMS seats by class for debugging and accurate counting
        const bmsSeatsByClass: Record<string, string[]> = {};
        
        showSeatStatus.bmsSeats.forEach((bmsSeat: any) => {
          const seatId = bmsSeat.seatId;
          // Use the class from the BMS seat data if available, otherwise determine from seat ID
          const classLabel = bmsSeat.class || getClassFromSeatId(seatId);
          
          if (classLabel) {
            // Track seats by class for debugging
            if (!bmsSeatsByClass[classLabel]) {
              bmsSeatsByClass[classLabel] = [];
            }
            bmsSeatsByClass[classLabel].push(seatId);
            
            // Use dynamic pricing from settings store (same as regular seats)
            // Get price directly from the store to ensure we have the latest value
            const price = currentPricing[classLabel] || getPriceForClass(classLabel);
            console.log('[PRICE] BMS seat price:', { seatId, classLabel, price });
            bmsIncome += price;
          }
        });
        
        console.log('[PRICE] BMS Income Calculation for specific show:', {
          show: selectedShow,
          bmsSeats: showSeatStatus.bmsSeats.length,
          bmsIncome,
          bmsSeatsByClass
        });
        
        // Debug log the BMS seats by class with more details
        console.log('[PRICE] BMS seats by class for income calculation:', {
          bmsSeatsByClass,
          totalBmsSeats: showSeatStatus.bmsSeats.length,
          totalBmsIncome: showSeatStatus.bmsSeats.reduce((sum, bmsSeat) => {
            const classLabel = bmsSeat.class || getClassFromSeatId(bmsSeat.seatId);
            // Get price directly from the store to ensure we have the latest value
            const price = currentPricing[classLabel] || getPriceForClass(classLabel);
            return sum + (classLabel ? price : 0);
          }, 0)
        });
        
        // Debug log the BMS seats by class
        console.log('[PRICE] BMS seats by class for income calculation:', bmsSeatsByClass);
      }
    } else {
      // For all shows, aggregate BMS income from all shows
      interface ShowBmsData {
        seats: Record<string, string[]>;
        count: number;
        income: number;
      }
      
      const allBmsSeatsByClass: Record<string, ShowBmsData> = {};
      
      Object.entries(seatStatusData).forEach(([showKey, showSeatStatus]) => {
        if (showSeatStatus?.bmsSeats && Array.isArray(showSeatStatus.bmsSeats)) {
          // Group BMS seats by class for this show
          const bmsSeatsByClass: Record<string, string[]> = {};
          
          showSeatStatus.bmsSeats.forEach((bmsSeat: any) => {
            const seatId = bmsSeat.seatId;
            // Use the class from the BMS seat data if available, otherwise determine from seat ID
            const classLabel = bmsSeat.class || getClassFromSeatId(seatId);
            
            if (classLabel) {
              // Track seats by class for debugging
              if (!bmsSeatsByClass[classLabel]) {
                bmsSeatsByClass[classLabel] = [];
              }
              bmsSeatsByClass[classLabel].push(seatId);
              
              // Use dynamic pricing from settings store (same as regular seats)
            // Get price directly from the store to ensure we have the latest value
            const price = currentPricing[classLabel] || getPriceForClass(classLabel);
            console.log('[PRICE] All shows - BMS seat price:', { seatId, classLabel, price });
            bmsIncome += price;
            }
          });
          
          // Calculate show-specific BMS income for debugging
          const showBmsIncome = showSeatStatus.bmsSeats.reduce((sum, bmsSeat) => {
            const classLabel = bmsSeat.class || getClassFromSeatId(bmsSeat.seatId);
            // Get price directly from the store to ensure we have the latest value
            const price = currentPricing[classLabel] || getPriceForClass(classLabel);
            return sum + (classLabel ? price : 0);
          }, 0);
          
          // Store detailed information for this show
          allBmsSeatsByClass[showKey] = {
            seats: bmsSeatsByClass,
            count: showSeatStatus.bmsSeats.length,
            income: showBmsIncome
          };
        }
      });
      
      // Debug log the BMS seats by class for all shows with detailed breakdown
      console.log('[PRICE] BMS seats by class for all shows:', {
        showBreakdown: allBmsSeatsByClass,
        totalBmsSeats: Object.values(allBmsSeatsByClass).reduce((sum: number, showData) => sum + (typeof showData.count === 'number' ? showData.count : 0), 0),
        totalBmsIncome: Object.values(allBmsSeatsByClass).reduce((sum: number, showData) => sum + (typeof showData.income === 'number' ? showData.income : 0), 0),
        classSummary: Object.values(allBmsSeatsByClass).reduce<Record<string, string[]>>((summary, showData) => {
          // Combine seat counts by class across all shows
          if (showData && showData.seats) {
            Object.entries(showData.seats).forEach(([classLabel, seats]) => {
              if (!summary[classLabel]) {
                summary[classLabel] = [];
              }
              if (Array.isArray(seats)) {
                summary[classLabel] = [...summary[classLabel], ...seats];
              }
            });
          }
          return summary;
        }, {})
      });
    }
    
    // Debug logging for BMS income calculation
    if (bmsIncome > 0) {
      console.log('[PRICE] BMS Income Calculation:', {
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
  }, [selectedDate, databaseBookings, selectedShow, seatStatusData, getClassFromSeatId, getPriceForClass, pricingVersion]);

  // Keep the old grossIncome for backward compatibility
  const grossIncome = incomeBreakdown.total;

  // Calculate class counts once for the selected date and show (or all shows if none selected)
  const classCountsByShow = useMemo(() => {
    const map: Record<string, ClassCountRow[]> = {};
    showOrder.forEach(show => {
      const countsByLabel = getClassCounts({ date: selectedDate, show: show.key });
      map[show.key] = seatSegments.map(seg => {
        const counts = countsByLabel[seg.label] || { regular: 0, bms: 0 };
        return {
          label: classLabelMap[seg.label] || seg.label,
          regular: counts.regular,
          bms: counts.bms,
          total: counts.regular + counts.bms
        };
      });
    });
    return map;
  }, [getClassCounts, selectedDate, showOrder, seatSegments, classLabelMap]);

  const classCountsData = useMemo(() => {
    if (selectedShow) {
      return classCountsByShow[selectedShow] || [];
    }

    const aggregated = showOrder.reduce<Record<string, { regular: number; bms: number }>>((acc, show) => {
      const perShowCounts = getClassCounts({ date: selectedDate, show: show.key });
      Object.entries(perShowCounts).forEach(([classLabel, counts]) => {
        if (!acc[classLabel]) {
          acc[classLabel] = { regular: 0, bms: 0 };
        }
        acc[classLabel].regular += counts.regular;
        acc[classLabel].bms += counts.bms;
      });
      return acc;
    }, {});

    return seatSegments.map(seg => {
      const counts = aggregated[seg.label] || { regular: 0, bms: 0 };
      return {
        label: classLabelMap[seg.label] || seg.label,
        regular: counts.regular,
        bms: counts.bms,
        total: counts.regular + counts.bms
      };
    });
  }, [classCountsByShow, selectedShow, showOrder, classLabelMap, getClassCounts, selectedDate, seatSegments]);

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
    const onlinePercentage = incomeBreakdown.total > 0 ? Math.round((incomeBreakdown.online / incomeBreakdown.total) * 100) : 0;
    const bmsPercentage = incomeBreakdown.total > 0 ? Math.round((incomeBreakdown.bms / incomeBreakdown.total) * 100) : 0;
    
    return {
      onlinePercentage,
      bmsPercentage
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
        show: showKey
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
        classCounts: Object.entries(classCounts).map(([label, counts]) => ({
          label,
          count: counts.regular + counts.bms
        }))
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
    <div className="booking-history-container p-4 max-w-[1400px] xl:max-w-[1600px] mx-auto">
      <div className="flex gap-4">
        {/* Left Vertical Info Strip (slim, vertical text) */}
        <div className="w-8 md:w-10 flex-shrink-0">
          <div className="sticky top-4 h-[calc(100vh-6.5rem)] md:h-[calc(100vh-7rem)]">
            <div
              className={`h-full w-full rounded-md border flex flex-col items-center justify-center ${
                selectedShow ? 'bg-blue-50 border-blue-300' : 'bg-green-50 border-green-300'
              }`}
            >
              <span
                className={`[writing-mode:vertical-rl] rotate-180 leading-tight text-[11px] font-semibold text-center ${
                  selectedShow ? 'text-blue-700' : 'text-green-700'
                }`}
              >
                {selectedShow
                  ? `Showing data for: ${showOrder.find(s => s.key === selectedShow)?.label ?? ''}`
                  : 'Showing aggregated data for: All Shows'}
              </span>
              <button
                onClick={() => (selectedShow ? setSelectedShow(null) : setSelectedShow(showOrder[0]?.key || null))}
                className={`mt-2 underline [writing-mode:vertical-rl] rotate-180 text-[10px] font-medium ${
                  selectedShow ? 'text-blue-600 hover:text-blue-800' : 'text-green-600 hover:text-green-800'
                }`}
              >
                {selectedShow ? 'Clear Filter' : 'Filter by Show'}
              </button>
        </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 space-y-4">
          
          {/* (Info card moved to left sidebar) */}

      {/* Show Cards - Interactive */}
      <div className="space-y-2 flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-lg">Shows Overview</div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2">
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
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        {/* Left Column: Seats Table */}
        <div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 pb-3 shadow-sm">
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
          {/* Aggregated info banner removed as requested */}
            <div className="border border-gray-300 rounded-b-none overflow-hidden">
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

          {/* Quick Summary - directly below table (no gap) */}
          <div className="mt-0 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
                    {incomePercentages.onlinePercentage}%
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                  <div className="text-xs text-blue-600 font-medium">ONLINE %</div>
                  <div className="text-lg font-bold text-blue-700">
                    {incomePercentages.bmsPercentage}%
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

        </div>
      </div>
      
      {/* Main SeatGrid - rendered directly like Load Bookings */}
      {showSeatGrid && selectedShowForSeats && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Seat Grid - {selectedShowForSeats.label}</h3>
            <button
              onClick={() => {
                setShowSeatGrid(false);
                setSelectedShowForSeats(null);
              }}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close Seat Grid
            </button>
          </div>
          <SeatGrid 
            hideProceedButton={true} 
            showRefreshButton={false}
            hideBMSMarking={true}
            overrideShow={selectedShowForSeats.key}
            overrideDate={selectedDate}
          />
        </div>
      )}
    </div>
  );
};

export default BookingHistory;
