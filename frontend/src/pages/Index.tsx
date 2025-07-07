import { useState, useEffect } from 'react';
import { Calendar, Clock, History, Download, ChevronLeft, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react';
import SeatGrid from '@/components/SeatGrid';
import ShowSelector from '@/components/ShowSelector';
import DateSelector from '@/components/DateSelector';
import BookingHistory from '@/components/BookingHistory';
import ReportPreview from '@/components/ReportPreview';
import { useBookingStore } from '@/store/bookingStore';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const sidebarItems = [
  { id: 'booking', label: 'Seat Booking', icon: Calendar },
  { id: 'history', label: 'Booking History', icon: History },
  { id: 'reports', label: 'Reports', icon: Download },
];

const getCurrentShowByTime = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  // Define show time ranges in minutes since midnight
  if (totalMinutes >= 360 && totalMinutes < 720) return 'Morning Show'; // 6:00 AM - 12:00 PM
  if (totalMinutes >= 720 && totalMinutes < 1020) return 'Matinee Show'; // 12:00 PM - 5:00 PM
  if (totalMinutes >= 1020 && totalMinutes < 1230) return 'Evening Show'; // 5:00 PM - 8:30 PM
  return 'Night Show'; // 8:30 PM - 6:00 AM
};

const Index = () => {
  const [activeView, setActiveView] = useState('booking');
  const [collapsed, setCollapsed] = useState(false);
  const { selectedDate, selectedShow } = useBookingStore();
  const [currentShow, setCurrentShow] = useState(getCurrentShowByTime());
  const [currentTime, setCurrentTime] = useState(new Date());
  const initializeSeats = useBookingStore((state) => state.initializeSeats);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentShow(getCurrentShowByTime());
      setCurrentTime(new Date());
    }, 1000); // update every second
    return () => clearInterval(interval);
  }, []);

  // Floating Reset Button handler
  const handleResetSeats = () => {
    if (window.confirm('Are you sure you want to reset all seats to available? This action cannot be undone.')) {
      initializeSeats();
      toast({
        title: 'Seats Reset',
        description: 'All seats have been reset to available status.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (fixed, collapsible) */}
      <div
        className={`fixed left-0 top-0 h-screen z-40 bg-white shadow-lg border-r overflow-y-scroll hide-scrollbar transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}
      >
        <nav className={`flex-1 flex flex-col gap-2 ${collapsed ? 'justify-center items-center p-0 m-0' : 'p-4'}`}>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                onDoubleClick={() => setCollapsed((c) => !c)}
                className={`transition-colors w-full
                  ${collapsed
                    ? `flex justify-center items-center aspect-square w-14 h-14 p-0 rounded-xl ${isActive ? 'bg-blue-100' : ''}`
                    : `flex flex-col justify-center items-center min-h-[96px] rounded-xl mb-4 ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`
                  }
                  ${isActive && !collapsed ? 'shadow' : ''}`}
                title={item.label}
              >
                <Icon className={`${collapsed ? 'w-6 h-6' : 'w-6 h-6 mb-2'}`} />
                <span className={`transition-all duration-200 ${collapsed ? 'opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100 w-auto'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>
        {/* Status Info */}
        <div className={`absolute bottom-0 left-0 right-0 transition-all duration-200
          ${collapsed
            ? 'w-14 h-14 flex flex-col justify-center items-center bg-gray-50 rounded-xl mb-2 mx-auto left-0 right-0'
            : 'p-4 border-t bg-gray-50 w-full'
          }`}
        >
          <div className={`flex items-center justify-between text-sm w-full ${collapsed ? 'flex-col gap-1 justify-center items-center' : ''}`}>
            <span className={`text-gray-600 transition-all duration-200 ${collapsed ? 'opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'}`}>Status:</span>
            <div className="flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className={`text-green-600 font-medium transition-all duration-200 ${collapsed ? 'opacity-0 w-0 h-0 overflow-hidden' : 'opacity-100'}`}>Online</span>
            </div>
          </div>
        </div>
      </div>
      {/* Header (fixed, immovable) */}
      <div className={`fixed top-0 right-0 z-30 h-20 bg-white shadow-sm border-b flex items-center px-6 transition-all duration-300 ${collapsed ? 'left-16' : 'left-64'}`}>
        <div className="flex items-center justify-between w-full">
          <div>
            {activeView === 'booking' ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 text-xl font-semibold focus:outline-none">
                    Seat Booking
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="mt-2">
                  <DateSelector />
                </PopoverContent>
              </Popover>
            ) : (
              <h2 className="text-xl font-semibold">
                {activeView === 'history' && 'Booking History'}
                {activeView === 'reports' && 'Reports & Analytics'}
              </h2>
            )}
            {activeView === 'booking' && (
              <p className="text-gray-600 mt-1">
                {format(new Date(selectedDate), 'dd/MM/yyyy')} • {currentShow}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {/* Select Show Popover */}
            {activeView === 'booking' && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none">
                    {selectedShow} Show
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="mt-2">
                  <ShowSelector />
                </PopoverContent>
              </Popover>
            )}
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'} mt-20`}
      >
        {/* Content Area */}
        <div className="flex-1 p-0">
          {activeView === 'booking' && (
            <SeatGrid />
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