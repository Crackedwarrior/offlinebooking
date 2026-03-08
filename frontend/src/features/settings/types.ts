/**
 * Types for Settings component
 * Extracted from Settings.tsx
 */

export type SettingsTab = 'overview' | 'pricing' | 'showtimes' | 'movies' | 'bookings' | 'printer';

export interface TimeInterval {
  from: number;
  to: number;
}

export interface ShowTimeInterval {
  key: string;
  label: string;
  span: TimeInterval;
}

