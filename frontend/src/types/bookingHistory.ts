/**
 * Types for BookingHistory component
 * Extracted from BookingHistory.tsx
 */

import { ShowTime } from '@/store/bookingStore';

export type ClassCountRow = {
  label: string;
  regular: number;
  bms: number;
  total: number;
};

export type ShowStats = {
  total: number;
  available: number;
  booked: number;
  bms: number;
  blocked: number;
  occupancy: string;
};

export type IncomeBreakdown = {
  online: number;
  bms: number;
  total: number;
};

export type QuickSummary = {
  totalBookingSeats: number;
  totalOnlineSeats: number;
  totalSeats: number;
};

export type IncomePercentages = {
  onlinePercentage: number;
  bmsPercentage: number;
};

export type ShowInfo = {
  key: ShowTime;
  label: string;
};

export type SeatSets = {
  regular: Set<string>;
  bms: Set<string>;
};

export type ClassSeatSets = Record<string, SeatSets>;

