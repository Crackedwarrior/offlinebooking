import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Users, Clock, TrendingUp } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';

interface SeatStatusPanelProps {
  date: string;
  show: string;
  onRefresh?: () => void;
}

interface SeatStatus {
  seatId: string;
  class: string;
  status: 'available' | 'booked' | 'selected';
}

interface BookingStats {
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  occupancyRate: number;
  revenue: number;
}

const SeatStatusPanel: React.FC<SeatStatusPanelProps> = ({
  date,
  show,
  onRefresh
}) => {
  const [seatStatus, setSeatStatus] = useState<SeatStatus[]>([]);
  const [stats, setStats] = useState<BookingStats>({
    totalSeats: 100,
    bookedSeats: 0,
    availableSeats: 100,
    occupancyRate: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const seats = useBookingStore(state => state.seats);
  const selectedSeats = seats.filter(seat => seat.status === 'selected');
  const bookedSeats = seats.filter(seat => seat.status === 'booked');

  // Fetch seat status from backend
  const fetchSeatStatus = async () => {
    setLoading(true);
    try {
      // For now, use local state since API types need to be aligned
      const totalSeats = 100;
      const bookedCount = bookedSeats.length;
      const availableCount = totalSeats - bookedCount;
      const occupancyRate = (bookedCount / totalSeats) * 100;
      
      setStats({
        totalSeats,
        bookedSeats: bookedCount,
        availableSeats: availableCount,
        occupancyRate,
        revenue: 0
      });
    } catch (error) {
      console.error('Failed to fetch seat status:', error);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  // Fetch booking stats
  const fetchBookingStats = async () => {
    try {
      // For now, calculate revenue from local state
      const totalRevenue = selectedSeats.reduce((sum, seat) => {
        // Get price from settings store or use default
        return sum + 150; // Default price
      }, 0);
      
      setStats(prev => ({ ...prev, revenue: totalRevenue }));
    } catch (error) {
      console.error('Failed to fetch booking stats:', error);
    }
  };

  useEffect(() => {
    fetchSeatStatus();
    fetchBookingStats();
  }, [date, show, seats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSeatStatus();
      fetchBookingStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [date, show]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked': return 'bg-red-500';
      case 'selected': return 'bg-yellow-500';
      case 'available': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'booked': return 'Booked';
      case 'selected': return 'Selected';
      case 'available': return 'Available';
      default: return 'Unknown';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Seat Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {formatTime(lastUpdated)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSeatStatus}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalSeats}</div>
            <div className="text-sm text-blue-600">Total Seats</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.availableSeats}</div>
            <div className="text-sm text-green-600">Available</div>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.bookedSeats}</div>
            <div className="text-sm text-red-600">Booked</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{selectedSeats.length}</div>
            <div className="text-sm text-yellow-600">Selected</div>
          </div>
        </div>

        {/* Occupancy Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Occupancy Rate</span>
            <span className="text-gray-600">{stats.occupancyRate.toFixed(1)}%</span>
          </div>
          <Progress value={stats.occupancyRate} className="h-2" />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Revenue */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="font-medium">Current Selection Revenue</span>
          </div>
          <div className="text-xl font-bold text-green-600">₹{stats.revenue.toLocaleString()}</div>
        </div>

        {/* Status Legend */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Status Legend</h4>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm">Booked</span>
            </div>
          </div>
        </div>

        {/* Selected Seats */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Currently Selected Seats</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedSeats.map((seat, index) => (
              <div key={index} className="flex items-center justify-between text-sm p-2 bg-yellow-50 rounded">
                <span className="font-mono">{seat.id}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{seat.row}</Badge>
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                </div>
              </div>
            ))}
            {selectedSeats.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                No seats selected
              </div>
            )}
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          Auto-refreshing every 30 seconds
        </div>
      </CardContent>
    </Card>
  );
};

export default SeatStatusPanel; 