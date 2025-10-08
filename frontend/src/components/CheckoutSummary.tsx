/**
 * Checkout Summary component extracted from Checkout.tsx
 * Industry standard: Presentational component focused on UI
 */

import React, { useMemo } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';

interface CheckoutSummaryProps {
  createClassInfo: any[];
}

export const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({ createClassInfo }) => {
  const { seats } = useBookingStore();
  const { getPriceForClass } = useSettingsStore();

  // Get selected seats
  const selectedSeats = useMemo(() => {
    return seats.filter(seat => seat.status === 'SELECTED');
  }, [seats]);

  // Calculate class counts
  const classCounts = useMemo(() => {
    return createClassInfo.map(cls => {
      const count = selectedSeats.filter(seat => cls.rows.includes(seat.row)).length;
      const price = getPriceForClass(cls.label);
      return { ...cls, count, price };
    });
  }, [createClassInfo, selectedSeats, getPriceForClass]);

  // Calculate total
  const total = useMemo(() => {
    return classCounts.reduce((sum, cls: any) => sum + cls.count * cls.price, 0);
  }, [classCounts]);

  return (
    <div className="flex-1 lg:flex-[3] flex flex-col mt-8">
      {/* Total moved to main component below show card */}
    </div>
  );
};
