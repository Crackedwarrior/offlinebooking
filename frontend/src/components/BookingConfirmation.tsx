import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Printer, Download, Share2, ArrowLeft } from 'lucide-react';
import { generateBookingPdf, downloadTicketPdf, printTicketPdf } from '@/utils/ticketPdfGenerator';

interface BookingConfirmationProps {
  bookingId: string;
  bookingData: {
    date: string;
    show: string;
    movie: string;
    screen: string;
    seats: Array<{
      id: string;
      classLabel: string;
      price: number;
    }>;
    totalAmount: number;
    totalTickets: number;
    timestamp: string;
  };
  onPrint?: () => void;
  onDownload?: () => void;
  onNewBooking: () => void;
  onBack: () => void;
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  bookingId,
  bookingData,
  onPrint,
  onDownload,
  onNewBooking,
  onBack
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Group seats by class for better display
  const seatGroups = bookingData.seats.reduce((groups, seat) => {
    const key = seat.classLabel;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(seat);
    return groups;
  }, {} as Record<string, typeof bookingData.seats>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Booking
          </Button>
          <Badge variant="secondary" className="text-sm">
            Booking ID: {bookingId}
          </Badge>
        </div>

        {/* Success Message */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-xl font-bold text-green-800">Booking Confirmed!</h2>
                <p className="text-green-700">Tickets have been successfully booked and saved.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Booking Details</span>
              <Badge variant="outline">Confirmed</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Movie & Show Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Movie</label>
                <p className="text-lg font-semibold">{bookingData.movie}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Screen</label>
                <p className="text-lg font-semibold">{bookingData.screen}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Date</label>
                <p className="text-lg font-semibold">{formatDate(bookingData.date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Show Time</label>
                <p className="text-lg font-semibold">{bookingData.show}</p>
              </div>
            </div>

            {/* Seats Information */}
            <div>
              <label className="text-sm font-medium text-gray-600">Seats Booked</label>
              <div className="mt-2 space-y-2">
                {Object.entries(seatGroups).map(([classLabel, seats]) => (
                  <div key={classLabel} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-semibold">{classLabel}</span>
                      <span className="text-gray-600 ml-2">
                        ({seats.map(s => s.id).join(', ')})
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₹{seats.reduce((sum, seat) => sum + seat.price, 0)}</div>
                      <div className="text-sm text-gray-600">{seats.length} seat{seats.length > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">₹{bookingData.totalAmount}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Total Tickets</span>
                <span>{bookingData.totalTickets} ticket{bookingData.totalTickets > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Booking Time */}
            <div className="text-sm text-gray-600 text-center pt-2 border-t">
              Booked on {formatDate(bookingData.timestamp)} at {formatTime(bookingData.timestamp)}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={async () => {
              try {
                const pdfBlob = await generateBookingPdf({
                  bookingId,
                  date: bookingData.date,
                  show: bookingData.show,
                  movie: bookingData.movie,
                  screen: bookingData.screen,
                  seats: bookingData.seats.map(seat => ({
                    seatId: seat.id,
                    classLabel: seat.classLabel,
                    price: seat.price
                  })),
                  totalAmount: bookingData.totalAmount,
                  totalTickets: bookingData.totalTickets,
                  timestamp: bookingData.timestamp
                });
                printTicketPdf(pdfBlob);
                onPrint?.();
              } catch (error) {
                console.error('Failed to print tickets:', error);
              }
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" />
            Print Tickets
          </Button>
          
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const pdfBlob = await generateBookingPdf({
                  bookingId,
                  date: bookingData.date,
                  show: bookingData.show,
                  movie: bookingData.movie,
                  screen: bookingData.screen,
                  seats: bookingData.seats.map(seat => ({
                    seatId: seat.id,
                    classLabel: seat.classLabel,
                    price: seat.price
                  })),
                  totalAmount: bookingData.totalAmount,
                  totalTickets: bookingData.totalTickets,
                  timestamp: bookingData.timestamp
                });
                downloadTicketPdf(pdfBlob, `booking-${bookingId}.txt`);
                onDownload?.();
              } catch (error) {
                console.error('Failed to download tickets:', error);
              }
            }}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
          
          <Button
            onClick={onNewBooking}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <span>New Booking</span>
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 p-4 bg-white rounded-lg border">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Booking
            </Button>
            <Button variant="ghost" size="sm">
              View in History
            </Button>
            <Button variant="ghost" size="sm">
              Send SMS
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation; 