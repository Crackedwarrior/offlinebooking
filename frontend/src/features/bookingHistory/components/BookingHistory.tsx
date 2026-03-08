/**
 * BookingHistory Component
 * Refactored to use extracted modules
 */

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { ShowTime } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import BookingViewerModal from './BookingViewerModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SHOW_TIMES } from '@/lib/config';
import { usePricing } from '@/hooks/use-pricing';
import { downloadShowReportPdf } from '@/utils/showReportPdfGenerator';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

// Extracted modules
import { useBookingHistory } from '../hooks/useBookingHistory';
import { getDatesWithBookings, dayClassName } from '../utils/bookingHistoryHelpers';
import {
  calculateAllStats,
  calculateClassCountsData
} from '../utils/bookingHistoryDataProcessor';
import type { ShowInfo } from '@/types/bookingHistory';
import { getAccentTheme } from '../utils/accentThemes';

// UI Components
import { FilterSidebar } from './FilterSidebar';
import { ShowsOverview } from './ShowsOverview';
import { ClassIncomeBreakdown } from './ClassIncomeBreakdown';
import SeatGrid from '@/features/seatGrid/components/SeatGrid';

const showOrder: ShowInfo[] = SHOW_TIMES.map(show => ({
  key: show.enumValue,
  label: show.label
}));

interface BookingHistoryProps {
  onDateStateChange?: (state: {
    selectedDate: string;
    datesWithBookings: Set<string>;
    dayClassName: (date: Date) => string;
    onDateChange: (date: Date | null) => void;
  }) => void;
}

const BookingHistory: React.FC<BookingHistoryProps> = ({ onDateStateChange }) => {
  const { getPriceForClass, pricingVersion } = usePricing();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<ShowTime | null>(null);
  
  // Seat Grid State
  const [showSeatGrid, setShowSeatGrid] = useState(false);
  const [selectedShowForSeats, setSelectedShowForSeats] = useState<ShowInfo | null>(null);

  // Collapsible panels state
  const [collapsedPanels, setCollapsedPanels] = useState({
    overview: false,
    summary: false,
    income: false
  });

  // Data fetching hook
  const { databaseBookings, seatStatusData, loading } = useBookingHistory(selectedDate);

  // Handle click outside to deselect show cards
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
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
    return getDatesWithBookings(databaseBookings);
  }, [databaseBookings]);

  // Handle view seats for a specific show
  const handleViewSeats = useCallback((show: ShowInfo) => {
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
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  }, []);

  // Date picker day class name
  const dayClassNameCallback = useCallback((date: Date) => {
    return dayClassName(date, datesWithBookings);
  }, [datesWithBookings]);

  // Expose date state to parent for header datepicker
  useEffect(() => {
    if (onDateStateChange) {
      onDateStateChange({
        selectedDate,
        datesWithBookings,
        dayClassName: dayClassNameCallback,
        onDateChange: handleDateChange
      });
    }
  }, [selectedDate, datesWithBookings, dayClassNameCallback, handleDateChange, onDateStateChange]);

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

  // Calculate all stats
  const allStats = useMemo(() => {
    return calculateAllStats(selectedDate, databaseBookings, seatStatusData, showOrder);
  }, [selectedDate, databaseBookings, seatStatusData]);

  // Calculate class counts data
  const classCountsData = useMemo(() => {
    return calculateClassCountsData(
      selectedShow,
      selectedDate,
      showOrder,
      seatStatusData,
      databaseBookings
    );
  }, [selectedShow, selectedDate, seatStatusData, databaseBookings]);

  // State for selected class
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Handle PDF download for a specific show
  const handleDownloadPDF = useCallback(async (showKey: ShowTime, date: string) => {
    try {
      const showLabel = showOrder.find(s => s.key === showKey)?.label || showKey;
      const stats = allStats[showKey] || { total: 590, available: 590, booked: 0, bms: 0, blocked: 0, occupancy: '0.0' };
      const showBookings = databaseBookings.filter(booking => booking.show === showKey);
      
      // Use calculateClassCounts from data processor
      const { calculateClassCounts } = await import('@/utils/bookingHistoryDataProcessor');
      const classCounts = calculateClassCounts(
        date,
        showKey,
        showOrder,
        seatStatusData,
        databaseBookings
      );
      
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
      
      await downloadShowReportPdf(reportData);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }, [databaseBookings, allStats, showOrder, seatStatusData]);

  // Handle filter toggle
  const handleToggleFilter = useCallback(() => {
    setSelectedShow(selectedShow ? null : (showOrder[0]?.key || null));
  }, [selectedShow]);

  // Handle seat grid close
  const handleCloseSeatGrid = useCallback(() => {
    setShowSeatGrid(false);
    setSelectedShowForSeats(null);
  }, []);

  // Handle panel collapse/expand
  const handleTogglePanel = useCallback((panel: 'overview' | 'summary' | 'income') => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  }, []);

  const accentTheme = useMemo(() => getAccentTheme(selectedShow), [selectedShow]);

  return (
    <div
      className="booking-history-container max-w-[1600px] mx-auto h-full flex flex-col rounded-3xl shadow-sm overflow-hidden"
      style={{
        backgroundColor: accentTheme.pageBackground,
        transition: 'background-color 0.4s ease'
      }}
    >
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <LoadingSpinner size="lg" text="Loading bookings..." />
          </div>
        </div>
      )}
      
      <div className="flex gap-0 flex-1 min-h-0">
        {/* Left Vertical Info Strip */}
        <FilterSidebar
          selectedShow={selectedShow}
          showOrder={showOrder}
          onToggleFilter={handleToggleFilter}
          accentTheme={accentTheme}
        />
        
        {/* Main Content */}
        <div
          className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden relative rounded-[32px] border p-0"
          style={{
            backgroundColor: accentTheme.surface,
            borderColor: accentTheme.surfaceBorder,
            transition: 'background-color 0.4s ease'
          }}
        >
          {/* Seat Grid Overlay - Positioned over show cards area */}
          {showSeatGrid && selectedShowForSeats && (
            <div className="absolute inset-x-0 top-0 bottom-0 z-50 bg-white border-b border-gray-200 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 uppercase">
                  SEAT GRID - {selectedShowForSeats.label}
                </h3>
                <button
                  onClick={handleCloseSeatGrid}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <SeatGrid 
                  hideProceedButton={true} 
                  showRefreshButton={false}
                  hideBMSMarking={true}
                  overrideShow={selectedShowForSeats.key}
                  overrideDate={selectedDate}
                />
              </div>
            </div>
          )}

          {/* Shows Overview - Single Row */}
          <div className="flex-shrink-0 mb-5">
            <ShowsOverview
              selectedShow={selectedShow}
              showOrder={showOrder}
              allStats={allStats}
              onShowSelect={setSelectedShow}
              onViewSeats={handleViewSeats}
              accentTheme={accentTheme}
            />
          </div>

          {/* Main Content - Single Column Layout */}
          <div className="flex-1 min-h-0 px-4 overflow-x-hidden">
            {/* Class Income Breakdown */}
            <ClassIncomeBreakdown
              selectedShow={selectedShow}
              showOrder={showOrder}
              classCountsData={classCountsData}
              selectedClass={selectedClass}
              getPriceForClass={getPriceForClass}
              onClassSelect={setSelectedClass}
              accentTheme={accentTheme}
              selectedDate={selectedDate}
            />
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
    </div>
  );
};

export default BookingHistory;
