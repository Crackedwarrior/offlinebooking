import { useState, useEffect } from 'react';
import { Calendar, Clock, History, Download, ChevronDown } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import ShowSelector from '@/components/ShowSelector';
import { format } from 'date-fns';
import SeatGrid from './components/SeatGrid';
import BookingHistory from './components/BookingHistory';
import ReportPreview from './components/ReportPreview';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Checkout from './pages/Checkout';

const sidebarItems = [
  { id: 'booking', label: 'Seat Booking', icon: Calendar },
  { id: 'history', label: 'Booking History', icon: History },
  { id: 'reports', label: 'Reports', icon: Download },
  // Removed Checkout from sidebar
];

const queryClient = new QueryClient();

const App = () => {
  const { selectedDate, selectedShow } = useBookingStore();
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeView, setActiveView] = useState('booking');

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
                    className={`transition-colors w-full flex flex-col justify-center items-center min-h-[56px] rounded-xl mb-2 ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
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
                <h2 className="text-xl font-semibold capitalize">{
                  activeView === 'booking' ? 'Seat Booking' :
                  activeView === 'history' ? 'Booking History' :
                  activeView === 'reports' ? 'Reports' :
                  activeView === 'checkout' ? 'Checkout' : ''
                }</h2>
                <p className="text-gray-600 mt-1">
                  {format(new Date(selectedDate), 'dd/MM/yyyy')} • {selectedShow} Show
                </p>
              </div>
              <div className="flex items-center space-x-3">
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
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">{currentTime.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          {/* Main Content */}
          <div
            className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'} mt-20`}
          >
            {activeView === 'booking' && <SeatGrid onProceed={() => setActiveView('checkout')} />}
            {activeView === 'history' && <BookingHistory />}
            {activeView === 'reports' && <ReportPreview />}
            {activeView === 'checkout' && <Checkout />}
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
