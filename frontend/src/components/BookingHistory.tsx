
import { useState } from 'react';
import { useBookingStore, ShowTime } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Download, Eye, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const BookingHistory = () => {
  const { bookingHistory, loadBookingForDate } = useBookingStore();
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedHistoryDate(date);
      setIsCalendarOpen(false);
    }
  };

  const handleLoadBooking = (date: string, show: ShowTime) => {
    loadBookingForDate(date, show);
  };

  const getBookingStats = (seats: any[]) => {
    return {
      total: seats.length,
      booked: seats.filter(s => s.status === 'booked').length,
      bmsBooked: seats.filter(s => s.status === 'bms-booked').length,
      blocked: seats.filter(s => s.status === 'blocked').length,
      available: seats.filter(s => s.status === 'available').length,
    };
  };

  // Group history by date
  const historyByDate = bookingHistory.reduce((acc, booking) => {
    if (!acc[booking.date]) acc[booking.date] = [];
    acc[booking.date].push(booking);
    return acc;
  }, {} as Record<string, typeof bookingHistory>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Booking History</h2>
          <div className="text-sm text-gray-600">
            Total Records: {bookingHistory.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel - Date Selector */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-6">
            <h3 className="font-semibold mb-4">Select Date</h3>
            
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !selectedHistoryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedHistoryDate ? format(selectedHistoryDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedHistoryDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* Recent Dates */}
            <div className="mt-6">
              <h4 className="font-medium text-sm text-gray-700 mb-3">Recent Bookings</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.keys(historyByDate)
                  .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                  .slice(0, 10)
                  .map((date) => (
                    <button
                      key={date}
                      onClick={() => setSelectedHistoryDate(new Date(date))}
                      className={cn(
                        "w-full text-left p-2 rounded-lg text-sm hover:bg-gray-100",
                        format(selectedHistoryDate, 'yyyy-MM-dd') === date && "bg-blue-100 text-blue-700"
                      )}
                    >
                      <div className="font-medium">{format(new Date(date), 'MMM dd, yyyy')}</div>
                      <div className="text-xs text-gray-500">
                        {historyByDate[date].length} show(s)
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - History Details */}
        <div className="col-span-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold mb-4">
              Bookings for {format(selectedHistoryDate, 'MMMM dd, yyyy')}
            </h3>
            
            {historyByDate[format(selectedHistoryDate, 'yyyy-MM-dd')] ? (
              <div className="space-y-4">
                {historyByDate[format(selectedHistoryDate, 'yyyy-MM-dd')]
                  .sort((a, b) => {
                    const showOrder = { Morning: 0, Matinee: 1, Evening: 2, Night: 3 };
                    return showOrder[a.show] - showOrder[b.show];
                  })
                  .map((booking, index) => {
                    const stats = getBookingStats(booking.seats);
                    const occupancyRate = ((stats.booked + stats.bmsBooked) / stats.total * 100).toFixed(1);
                    
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Clock className="w-5 h-5 text-gray-500" />
                            <div>
                              <h4 className="font-medium">{booking.show} Show</h4>
                              <p className="text-sm text-gray-600">
                                Saved at {format(new Date(booking.timestamp), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLoadBooking(booking.date, booking.show)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-5 gap-3 text-sm">
                          <div className="text-center p-2 bg-gray-100 rounded">
                            <div className="font-semibold">{stats.total}</div>
                            <div className="text-gray-600">Total</div>
                          </div>
                          <div className="text-center p-2 bg-green-100 rounded">
                            <div className="font-semibold text-green-800">{stats.available}</div>
                            <div className="text-green-600">Available</div>
                          </div>
                          <div className="text-center p-2 bg-red-100 rounded">
                            <div className="font-semibold text-red-800">{stats.booked}</div>
                            <div className="text-red-600">Booked</div>
                          </div>
                          <div className="text-center p-2 bg-blue-100 rounded">
                            <div className="font-semibold text-blue-800">{stats.bmsBooked}</div>
                            <div className="text-blue-600">BMS</div>
                          </div>
                          <div className="text-center p-2 bg-purple-100 rounded">
                            <div className="font-semibold text-purple-800">{occupancyRate}%</div>
                            <div className="text-purple-600">Occupied</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Bookings Found</h3>
                <p className="text-gray-500">No booking records found for this date.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingHistory;
