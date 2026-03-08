/**
 * BookingList Component
 * Displays list of bookings with delete actions
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Trash2 } from 'lucide-react';
import { BookingData } from '@/hooks/booking/useBookingManagement';

interface BookingListProps {
  bookings: BookingData[];
  onDelete: (booking: BookingData) => void;
}

export const BookingList: React.FC<BookingListProps> = ({
  bookings,
  onDelete
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
        {bookings.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={booking.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                  {booking.status}
                </Badge>
                <span className="font-medium">{booking.movie}</span>
                <span className="text-sm text-gray-600">({booking.movieLanguage})</span>
              </div>
              <p className="text-sm text-gray-600">
                Seats: <span className="font-medium">{booking.bookedSeats.join(', ')}</span> • 
                Class: <span className="font-medium">{booking.classLabel}</span> • 
                Total: <span className="font-medium">₹{booking.totalPrice}</span>
              </p>
              {booking.printedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Printed: <span className="font-medium">{new Date(booking.printedAt).toLocaleString()}</span>
                </p>
              )}
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
        ))}
      </div>
    </div>
  );
};

