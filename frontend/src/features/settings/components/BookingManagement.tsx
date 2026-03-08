/**
 * BookingManagement Component
 * Main orchestrator for booking management
 * 
 * Refactored: Extracted logic into hooks and UI components
 * See: hooks/booking/, components/bookings/
 */

import React from 'react';
import { useBookingManagement } from '@/hooks/booking/useBookingManagement';
import { BookingFilters } from '@/components/bookings/BookingFilters';
import { BookingList } from '@/components/bookings/BookingList';
import SeatGrid from '@/features/seatGrid/components/SeatGrid';
import { Calendar, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const BookingManagement = () => {
  const {
    bookings,
    loading,
    isLoaded,
    localSelectedDate,
    localSelectedShow,
    currentTicketId,
    ticketIdLoading,
    resetTicketIdValue,
    resettingTicketId,
    setLocalSelectedDate,
    setLocalSelectedShow,
    setResetTicketIdValue,
    loadBookings,
    handleDelete,
    loadCurrentTicketId,
    handleResetTicketId
  } = useBookingManagement();

  const handleDateChange = (date: Date | null) => {
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      setLocalSelectedDate(dateString);
    }
  };

  const handleShowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newShow = e.target.value as 'MORNING' | 'MATINEE' | 'EVENING' | 'NIGHT';
    setLocalSelectedShow(newShow);
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <Card className="flex-1 min-h-0 flex flex-col bg-white border-0 shadow-lg relative overflow-hidden w-full h-full rounded-none">
        <CardHeader className="flex-shrink-0 p-0">
          <div className="rounded-none bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white p-5 shadow-lg border-b border-teal-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-bold text-white uppercase tracking-[0.15em] mb-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.15em' }}>
                  BOOKING MANAGEMENT
                </p>
                <p className="text-sm text-teal-100 font-normal leading-tight">
                  View, search, filter, and manage all customer bookings. Edit booking details, cancel reservations, and track booking history with advanced filtering options
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col px-0 py-0 overflow-y-auto">
          <div className="flex flex-col">
            {/* Controls Section */}
            <div className="flex-shrink-0 mb-3 px-6 pt-4">
              <BookingFilters
                localSelectedDate={localSelectedDate}
                localSelectedShow={localSelectedShow}
                loading={loading}
                isLoaded={isLoaded}
                onDateChange={handleDateChange}
                onShowChange={handleShowChange}
                onLoadBookings={loadBookings}
                currentTicketId={currentTicketId}
                ticketIdLoading={ticketIdLoading}
                resetTicketIdValue={resetTicketIdValue}
                resettingTicketId={resettingTicketId}
                onResetTicketIdValueChange={setResetTicketIdValue}
                onLoadCurrentTicketId={loadCurrentTicketId}
                onResetTicketId={handleResetTicketId}
              />
            </div>

            {/* Content Section */}
            <div className="flex-1 px-6 pb-6">
              {isLoaded && (
                <div className="h-full flex flex-col gap-2">
                  {/* Booking Summary */}
                  <div className="flex-shrink-0">
                    <BookingList
                      bookings={bookings}
                      onDelete={handleDelete}
                    />
                  </div>
                  
                  {/* Seat Grid */}
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <SeatGrid 
                      hideProceedButton={true} 
                      showRefreshButton={true}
                      hideBMSMarking={true}
                      overrideShow={localSelectedShow}
                      overrideDate={localSelectedDate}
                    />
                  </div>
                </div>
              )}
              
              {/* Enhanced Empty State */}
              {!isLoaded && (
                <div className="h-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">No Bookings Loaded</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto">
                      Select a date and show from the options above, then click "Load Bookings" to view and manage your bookings.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingManagement;
