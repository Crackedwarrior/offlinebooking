import { useBookingStore } from '@/store/bookingStore';
import SeatGrid from '@/components/SeatGrid';
import BookingHistory from '@/components/BookingHistory';
import ReportPreview from '@/components/ReportPreview';
import { useState } from 'react';

const Index = () => {
  const [activeView, setActiveView] = useState('booking');

  return (
    <div className="flex-1 flex flex-col p-0">
      {/* Content Area */}
      <div className="flex-1 p-0">
        {activeView === 'booking' && <SeatGrid />}
        {activeView === 'history' && <BookingHistory />}
        {activeView === 'reports' && <ReportPreview />}
      </div>
    </div>
  );
};

export default Index;