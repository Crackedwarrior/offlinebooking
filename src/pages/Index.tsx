
import { useState } from 'react';
import { Calendar, Clock, History, Download, Save, Cloud } from 'lucide-react';
import SeatGrid from '@/components/SeatGrid';
import ShowSelector from '@/components/ShowSelector';
import DateSelector from '@/components/DateSelector';
import ControlsPanel from '@/components/ControlsPanel';
import BookingHistory from '@/components/BookingHistory';
import ReportPreview from '@/components/ReportPreview';
import { useBookingStore } from '@/store/bookingStore';

const Index = () => {
  const [activeView, setActiveView] = useState('booking');
  const { selectedDate, selectedShow } = useBookingStore();

  const sidebarItems = [
    { id: 'booking', label: 'Seat Booking', icon: Calendar },
    { id: 'history', label: 'Booking History', icon: History },
    { id: 'reports', label: 'Reports', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">Theatre Booking</h1>
          <p className="text-sm text-gray-600 mt-1">Screen 1 - Staff Portal</p>
        </div>
        
        <nav className="p-4">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-lg mb-2 transition-colors ${
                activeView === item.id
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Status Info */}
        <div className="absolute bottom-0 left-0 right-0 w-64 p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Status:</span>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-green-600 font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {activeView === 'booking' && 'Seat Booking'}
                {activeView === 'history' && 'Booking History'}
                {activeView === 'reports' && 'Reports & Analytics'}
              </h2>
              {activeView === 'booking' && (
                <p className="text-gray-600 mt-1">
                  {selectedDate} • {selectedShow} Show
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          {activeView === 'booking' && (
            <div className="grid grid-cols-12 gap-6 h-full">
              {/* Left Panel - Controls */}
              <div className="col-span-3 space-y-6">
                <DateSelector />
                <ShowSelector />
                <ControlsPanel />
                <ReportPreview />
              </div>

              {/* Right Panel - Seat Grid */}
              <div className="col-span-9">
                <SeatGrid />
              </div>
            </div>
          )}

          {activeView === 'history' && <BookingHistory />}
          
          {activeView === 'reports' && (
            <div className="text-center py-12">
              <Download className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Reports Dashboard</h3>
              <p className="text-gray-500">Detailed analytics and reporting features coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
