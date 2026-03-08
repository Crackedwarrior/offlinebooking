/**
 * Bookings Tab Component
 * Extracted from Settings.tsx
 */

import React from 'react';
import BookingManagement from '../components/BookingManagement';

export const BookingsTab: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col min-h-0">
          <BookingManagement />
    </div>
  );
};

