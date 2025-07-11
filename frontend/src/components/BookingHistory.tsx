
import { useState } from 'react';
import { useBookingStore, ShowTime } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Download, Eye, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { seatsByRow } from '@/lib/seatMatrix';
// import SeatsBookedByClass from './SeatsBookedByClass';
import { seatSegments } from './SeatGrid';

const BookingHistory = () => {
  const { bookingHistory, loadBookingForDate, seats, selectedDate, selectedShow } = useBookingStore();
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

  // Find booking for selected date and show
  const selectedDateStr = format(selectedHistoryDate, 'yyyy-MM-dd');
  const bookingForSelected = bookingHistory.find(
    b => b.date === selectedDateStr && b.show === selectedShow
  );
  const stats = getBookingStats(bookingForSelected ? bookingForSelected.seats : seats);
  const occupancyRate = ((stats.booked + stats.bmsBooked) / (stats.total || 1) * 100).toFixed(1);

  const showOrder = ['Morning', 'Matinee', 'Evening', 'Night'];

  const ReadOnlySeatGrid = ({ seats }: { seats: any[] }) => {
    // Map seats for quick lookup by row and number
    const seatMap = seats.reduce((acc, seat) => {
      acc[`${seat.row}-${seat.number}`] = seat;
      return acc;
    }, {} as Record<string, any>);
    return (
      <div className="space-y-4">
        {Object.keys(seatsByRow).map(row => (
          <div key={row} className="flex items-center">
            <div className="w-16 text-right pr-2 text-xs font-semibold text-gray-500">{row.replace(/^[^-]+-/, '')}</div>
            <div className="flex gap-1">
              {seatsByRow[row].map((seatNum, idx) => {
                if (seatNum === '') return <div key={idx} className="w-6 h-6" style={{ visibility: 'hidden' }} />;
                const seat = seatMap[`${row}-${seatNum}`];
                let color = 'bg-gray-200';
                if (seat) {
                  if (seat.status === 'available') color = 'bg-green-400';
                  if (seat.status === 'booked') color = 'bg-red-400';
                  if (seat.status === 'blocked') color = 'bg-yellow-400';
                  if (seat.status === 'bms-booked') color = 'bg-blue-400';
                }
                return <div key={idx} className={`w-6 h-6 rounded text-[10px] flex items-center justify-center border ${color}`}>{seatNum}</div>;
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
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

            {/* SeatsBookedByClass summary table moved here */}
            {/* <SeatsBookedByClass seats={bookingForSelected ? bookingForSelected.seats : seats} seatSegments={seatSegments} /> */}

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

            {/* Move the table above the Gross Income card and update logic: */}
            {(() => {
              // Get the current show and seats
              const currentShow = selectedShow;
              const currentSeats = bookingForSelected ? bookingForSelected.seats : seats;
              // Define class segments and color mapping (should match seat grid)
              const classSegments = [
                { label: 'BOX', rows: ['BOX-A', 'BOX-B', 'BOX-C', 'BOX-D'], color: 'bg-cyan-400' },
                { label: 'STAR CLASS', rows: ['STAR-A', 'STAR-B', 'STAR-C', 'STAR-D', 'STAR-E', 'STAR-F'], color: 'bg-cyan-600' },
                { label: 'CLASSIC BALCONY', rows: ['CLASSIC-A', 'CLASSIC-B', 'CLASSIC-C', 'CLASSIC-D', 'CLASSIC-E', 'CLASSIC-F'], color: 'bg-yellow-400' },
                { label: 'FIRST CLASS', rows: ['FIRST-A', 'FIRST-B', 'FIRST-C', 'FIRST-D', 'FIRST-E', 'FIRST-F'], color: 'bg-pink-400' },
                { label: 'SECOND CLASS', rows: ['SECOND-A', 'SECOND-B', 'SECOND-C', 'SECOND-D', 'SECOND-E', 'SECOND-F'], color: 'bg-gray-400' }
              ];
              // Count booked, bms-booked, blocked, and total seats per class
              const classCounts = classSegments.map(seg => {
                const booked = currentSeats.filter(seat => seg.rows.includes(seat.row) && seat.status === 'booked').length;
                const bmsBooked = currentSeats.filter(seat => seg.rows.includes(seat.row) && seat.status === 'bms-booked').length;
                const blocked = currentSeats.filter(seat => seg.rows.includes(seat.row) && seat.status === 'blocked').length;
                const total = booked + bmsBooked + blocked;
                return { label: seg.label, color: seg.color, booked, bmsBooked, blocked, total };
              });
              const totalBooked = classCounts.reduce((sum, seg) => sum + seg.booked, 0);
              const totalBmsBooked = classCounts.reduce((sum, seg) => sum + seg.bmsBooked, 0);
              const totalBlocked = classCounts.reduce((sum, seg) => sum + seg.blocked, 0);
              const totalAll = classCounts.reduce((sum, seg) => sum + seg.total, 0);
              return (
                <div className="mb-4 border rounded-xl overflow-hidden shadow-sm bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 font-semibold">
                        <th className="px-4 py-2 text-left">Class</th>
                        <th className="px-4 py-2 text-right">Booked</th>
                        <th className="px-4 py-2 text-right">BMS Booked</th>
                        <th className="px-4 py-2 text-right">Blocked</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classCounts.map((seg, idx) => (
                        <tr key={seg.label} className="even:bg-gray-50 hover:bg-gray-100 transition">
                          <td className="flex items-center gap-2 px-4 py-2">
                            <div className={`w-1.5 h-4 rounded-sm ${seg.color}`} />
                            {seg.label}
                          </td>
                          <td className="px-4 py-2 text-red-600 font-medium text-right">{seg.booked}</td>
                          <td className="px-4 py-2 text-blue-600 font-medium text-right">{seg.bmsBooked}</td>
                          <td className="px-4 py-2 text-yellow-600 text-right">{seg.blocked}</td>
                          <td className="px-4 py-2 text-right">{seg.total}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold border-t">
                        <td className="px-4 py-2">TOTAL</td>
                        <td className="px-4 py-2 text-red-700 text-right">{totalBooked}</td>
                        <td className="px-4 py-2 text-blue-700 text-right">{totalBmsBooked}</td>
                        <td className="px-4 py-2 text-yellow-700 text-right">{totalBlocked}</td>
                        <td className="px-4 py-2 text-right">{totalAll}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Gross Income Summary */}
            {(() => {
              // Hardcoded prices per class
              const classPrices: Record<string, number> = {
                'BOX': 300,
                'STAR CLASS': 250,
                'CLASSIC BALCONY': 200,
                'FIRST CLASS': 150,
                'SECOND CLASS': 100
              };
              // Get seats for selected date/show
              const currentSeats = bookingForSelected ? bookingForSelected.seats : seats;
              // Helper to get class label for a seat
              const getClassLabel = (row: string) => {
                for (const seg of seatSegments) {
                  if (seg.rows.includes(row)) return seg.label;
                }
                return '';
              };
              let totalIncome = 0, bmsIncome = 0, bookingIncome = 0, bmsBookedIncome = 0;
              currentSeats.forEach(seat => {
                const classLabel = getClassLabel(seat.row);
                const price = classPrices[classLabel] || 0;
                if (seat.status === 'booked') {
                  bookingIncome += price;
                  totalIncome += price;
                } else if (seat.status === 'bms-booked') {
                  bmsIncome += price;
                  bmsBookedIncome += price;
                  totalIncome += price;
                }
              });
              return (
                <div className="mt-8 p-4 bg-gray-50 rounded shadow text-sm">
                  <div className="font-semibold mb-2">Gross Income</div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between"><span>Total Income:</span><span>₹ {totalIncome}</span></div>
                    <div className="flex justify-between"><span>BMS Income:</span><span>₹ {bmsIncome}</span></div>
                    <div className="flex justify-between"><span>Booking Income:</span><span>₹ {bookingIncome}</span></div>
                    <div className="flex justify-between"><span>BMS Booked Income:</span><span>₹ {bmsBookedIncome}</span></div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Panel - History Details */}
        <div className="col-span-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold mb-4">
              Bookings for {format(selectedHistoryDate, 'MMMM dd, yyyy')}
            </h3>
            <div className="space-y-4">
              {showOrder.map(show => {
                const booking = bookingHistory.find(b => b.date === selectedDateStr && b.show === show);
                const stats = getBookingStats(booking ? booking.seats : seats);
                const occupancyRate = ((stats.booked + stats.bmsBooked) / (stats.total || 1) * 100).toFixed(1);
                return (
                  <div key={show} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                          <h4 className="font-medium">{show} Show</h4>
                          <p className="text-sm text-gray-600">
                            {booking ? `Saved at ${format(new Date(booking.timestamp), 'h:mm a')}` : 'Live (unsaved)'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </Button>
                        {booking && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <span></span> {/* Keep dialog logic for saved bookings, but always show buttons */}
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{show} Show Seat Map</DialogTitle>
                              </DialogHeader>
                              <ReadOnlySeatGrid seats={booking.seats} />
                            </DialogContent>
                          </Dialog>
                        )}
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
                      <div className="text-center p-2 bg-yellow-100 rounded">
                        <div className="font-semibold text-yellow-800">{stats.blocked}</div>
                        <div className="text-yellow-600">Blocked</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingHistory;
