import React, { useState, useMemo } from 'react';
import { getBookings, updateBooking, deleteBooking } from '@/services/api';
import { SHOW_TIMES } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Edit, Trash2, Loader2, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import SeatGrid from '@/components/SeatGrid';
import { useBookingStore } from '@/store/bookingStore';

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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShow, setSelectedShow] = useState<string>('MORNING');
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { setSelectedDate: setBookingDate, setSelectedShow: setBookingShow } = useBookingStore();

  // Load bookings for selected date and show
  const loadBookings = async () => {
    setLoading(true);
    try {
      // Update the booking store with selected date and show
      setBookingDate(selectedDate);
      setBookingShow(selectedShow as any);
      
      const response = await getBookings({ 
        date: selectedDate, 
        show: selectedShow 
      });
      
      if (response.success) {
        console.log('🔍 API Response:', response);
        console.log('📊 Bookings data:', response.data);
        
        // Debug: Check movie names in the response
        if (response.data && response.data.length > 0) {
          console.log('🎬 Movie names in response:');
          response.data.forEach((booking, index) => {
            console.log(`  ${index + 1}. "${booking.movie}" (ID: ${booking.id})`);
          });
        }
        
        setBookings(response.data || []);
        setIsLoaded(true);
        toast({
          title: 'Success',
          description: `Loaded ${response.data?.length || 0} bookings`,
        });
      } else {
        throw new Error('Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete a booking
  const handleDelete = async (booking: BookingData) => {
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
        
        toast({
          title: 'Success',
          description: 'Booking deleted successfully',
        });
      } else {
        throw new Error('Failed to delete booking');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete booking',
        variant: 'destructive',
      });
    }
  };



  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Booking Management
          </CardTitle>
          <CardDescription>
            Select date and show, then load bookings to view and manage them visually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Simple Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="show">Show</Label>
              <Select value={selectedShow} onValueChange={setSelectedShow}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHOW_TIMES.map(show => (
                    <SelectItem key={show.key} value={show.key}>
                      {show.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={loadBookings} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load Bookings'
              )}
            </Button>
            {isLoaded && (
              <Button 
                onClick={loadBookings} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Refresh All
              </Button>
            )}
          </div>

          {/* Show Content Only After Loading */}
          {isLoaded && (
            <>
              {/* Booking Summary */}
              <BookingSummary bookings={bookings} onDelete={handleDelete} />
              
              {/* Seat Grid */}
              <SeatGrid hideProceedButton={true} showRefreshButton={true} />
            </>
          )}
          
          {/* Initial State */}
          {!isLoaded && (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No Bookings Loaded</p>
              <p>Select date and show, then click "Load Bookings" to view</p>
            </div>
          )}
        </CardContent>
      </Card>
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
      
      <div className="space-y-3">
        {bookings.map((booking) => {
          console.log('🎬 Rendering booking:', { id: booking.id, movie: booking.movie });
          return (
            <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={booking.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                    {booking.status}
                  </Badge>
                  <span className="font-medium">{booking.movie}</span>
                  <span className="text-sm text-gray-600">({booking.movieLanguage})</span>
                </div>
              <p className="text-sm text-gray-600 mb-1">
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