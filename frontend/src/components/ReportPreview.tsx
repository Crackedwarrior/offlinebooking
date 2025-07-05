
import { useBookingStore } from '@/store/bookingStore';
import { FileText, Users, Calendar, Clock } from 'lucide-react';

const ReportPreview = () => {
  const { selectedDate, selectedShow, getBookingStats } = useBookingStore();
  const stats = getBookingStats();

  const occupancyRate = ((stats.booked + stats.bmsBooked) / stats.total * 100).toFixed(1);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="font-semibold mb-4 text-gray-800 flex items-center">
        <FileText className="w-4 h-4 mr-2" />
        Report Preview
      </h3>
      
      {/* Report Header */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="text-center">
          <h4 className="font-semibold text-gray-800">Screen 1 Booking Report</h4>
          <div className="flex items-center justify-center space-x-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {selectedDate}
            </div>
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {selectedShow}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-sm text-gray-600">Total Seats</span>
          <span className="font-semibold">{stats.total}</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-sm text-gray-600">Available</span>
          <span className="font-semibold text-green-600">{stats.available}</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-sm text-gray-600">Counter Bookings</span>
          <span className="font-semibold text-red-600">{stats.booked}</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-sm text-gray-600">BMS Bookings</span>
          <span className="font-semibold text-blue-600">{stats.bmsBooked}</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-sm text-gray-600">Blocked Seats</span>
          <span className="font-semibold text-yellow-600">{stats.blocked}</span>
        </div>
      </div>

      {/* Occupancy Rate */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Occupancy Rate</span>
          </div>
          <span className="text-lg font-bold text-blue-800">{occupancyRate}%</span>
        </div>
        <div className="mt-2 bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${occupancyRate}%` }}
          ></div>
        </div>
      </div>

      {/* Report Generation Info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Report generated at {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ReportPreview;
