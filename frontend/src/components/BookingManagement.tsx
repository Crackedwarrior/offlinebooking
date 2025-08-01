import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { getBookings, updateBooking, deleteBooking } from '@/services/api';
import { SHOW_TIMES } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Edit, Trash2, Loader2, RotateCcw, Search } from 'lucide-react';
// import { toast } from '@/hooks/use-toast';
import SeatGrid from '@/components/SeatGrid';
import { useBookingStore } from '@/store/bookingStore';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface BookingData {
  id: string;
  date: string;
  show: string;
  screen: string;
  movie: string;
  movieLanguage: string;
  bookedSeats: string[];
  seatCount: number;
  classLabel: string;
  pricePerSeat: number;
  totalPrice: number;
  status: string;
  source: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  createdAt: string;
  updatedAt: string;
  bookedAt: string;
}

const BookingManagement = () => {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { 
    selectedDate, 
    selectedShow, 
    setSelectedDate: setBookingDate, 
    setSelectedShow: setBookingShow 
  } = useBookingStore();
  
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
    return () => document.head.removeChild(style);
  }, []);

  // Memoize the store state to prevent unnecessary re-renders
  const storeState = useMemo(() => ({ selectedDate, selectedShow }), [selectedDate, selectedShow]);

  // Load bookings for selected date and show
  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      
      const response = await getBookings({ 
        date: selectedDate, 
        show: selectedShow 
      });
      
      if (response.success) {
        setBookings(response.data || []);
        setIsLoaded(true);
        // toast({
        //   title: 'Success',
        //   description: `Loaded ${response.data?.length || 0} bookings`,
        // });
      } else {
        throw new Error('Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to load bookings',
      //   variant: 'destructive',
      // });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedShow, storeState]);

  // Delete a booking
  const handleDelete = useCallback(async (booking: BookingData) => {
    if (!window.confirm(`Are you sure you want to delete this booking? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await deleteBooking(booking.id);
      if (response.success) {
        setBookings(prev => prev.filter(b => b.id !== booking.id));
        
        // Force refresh the seat grid to update seat status
        setTimeout(() => {
          // Trigger a re-fetch of seat status by updating the booking store
          setBookingDate(selectedDate);
          setBookingShow(selectedShow as any);
        }, 100);
        
        // toast({
        //   title: 'Success',
        //   description: 'Booking deleted successfully',
        // });
      } else {
        throw new Error('Failed to delete booking');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to delete booking',
      //   variant: 'destructive',
      // });
    }
  }, [selectedDate, selectedShow, setBookingDate, setBookingShow]);

  // Handle show selection change
  const handleShowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newShow = e.target.value as 'MORNING' | 'MATINEE' | 'EVENING' | 'NIGHT';
    setBookingShow(newShow);
  };

  // Handle date selection
  const handleDateChange = (date: Date | null) => {
    console.log('📅 Date picker - handleDateChange called with:', date);
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      console.log('📅 Date picker - setting date to:', dateString);
      setBookingDate(dateString);
    }
  };

  // Check if a date has bookings for highlighting
  const dayClassName = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return ''; // No highlighting for now, can be added later
  };

  // Monitor selectedShow changes
  useEffect(() => {
  }, [selectedShow]);

  // Monitor component mount/unmount
  useEffect(() => {
    return () => {
    };
  }, []);

  return (
    <div className="space-y-12">
      {/* Controls Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl border border-blue-100 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Date Selection */}
            <div className="lg:col-span-3 space-y-2">
              <Label htmlFor="date" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Select Date
              </Label>
              <DatePicker
                id="date"
                selected={new Date(selectedDate)}
                onChange={handleDateChange}
                dateFormat="dd/MM/yyyy"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200 bg-white shadow-sm"
                placeholderText="Choose a date"
                dayClassName={dayClassName}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                yearDropdownItemNumber={15}
                scrollableYearDropdown
                maxDate={new Date()}
                popperPlacement="bottom-start"
              />
            </div>

            {/* Empty space for uniform gap */}
            <div className="lg:col-span-1"></div>

            {/* Show Selection */}
            <div className="lg:col-span-3 space-y-2">
              <Label htmlFor="show" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Select Show
              </Label>
              <select
                id="show"
                value={selectedShow}
                onChange={handleShowChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200 bg-white shadow-sm"
              >
                {SHOW_TIMES.map(show => (
                  <option key={show.key} value={show.key}>
                    {show.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Empty space for uniform gap */}
            <div className="lg:col-span-1"></div>

            {/* Action Buttons */}
            <div className="lg:col-span-4 space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                Actions
              </Label>
              <div className="flex gap-2">
                <Button 
                  onClick={loadBookings} 
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Load Bookings
                    </>
                  )}
                </Button>
                {isLoaded && (
                  <Button 
                    onClick={loadBookings} 
                    disabled={loading}
                    variant="outline"
                    className="px-4 py-3 border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-all duration-200"
                    title="Refresh Bookings"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-12">
        {/* Show Content Only After Loading */}
        {isLoaded && (
          <>
            {/* Booking Summary */}
            <BookingSummary bookings={bookings} onDelete={handleDelete} />
            
            {/* Seat Grid */}
            <SeatGrid hideProceedButton={true} showRefreshButton={true} />
          </>
        )}
        
        {/* Enhanced Empty State */}
        {!isLoaded && (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 via-white to-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
            <div className="w-24 h-24 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center shadow-sm">
              <Calendar className="w-12 h-12 text-blue-400" />
            </div>
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">No Bookings Loaded</h3>
            <p className="text-gray-600 max-w-md mx-auto text-lg">
              Select a date and show from the options above, then click "Load Bookings" to view and manage your bookings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Booking Summary Component
const BookingSummary = ({ 
  bookings, 
  onDelete 
}: { 
  bookings: BookingData[];
  onDelete: (booking: BookingData) => void;
}) => {
  if (bookings.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-center">No bookings found for selected date and show</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        Bookings Found: {bookings.length}
      </h3>
      
      <div className="space-y-4">
        {bookings.map((booking) => {
          return (
            <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={booking.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                    {booking.status}
                  </Badge>
                  <span className="font-medium">{booking.movie}</span>
                  <span className="text-sm text-gray-600">({booking.movieLanguage})</span>
                </div>
              <p className="text-sm text-gray-600 mb-2">
                {booking.customerName || 'No Name'} • {booking.customerPhone || 'No Phone'}
              </p>
              <p className="text-sm text-gray-600">
                Seats: <span className="font-medium">{booking.bookedSeats.join(', ')}</span> • 
                Class: <span className="font-medium">{booking.classLabel}</span> • 
                Total: <span className="font-medium">₹{booking.totalPrice}</span>
              </p>
            </div>
            
            <div className="flex gap-2 ml-4">
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => onDelete(booking)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
};



export default BookingManagement; 