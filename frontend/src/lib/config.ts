// Centralized configuration for seat classes, pricing, and show times

export interface SeatClass {
  key: string;
  label: string;
  price: number;
  rows: string[];
  color: string;
}

export interface ShowTime {
  key: string;
  label: string;
  timing: string;
  enumValue: 'MORNING' | 'MATINEE' | 'EVENING' | 'NIGHT';
}

// Seat class configuration - prices are now dynamic from settings store
export const SEAT_CLASSES: SeatClass[] = [
  {
    key: 'BOX',
    label: 'BOX',
    price: 0, // Will be overridden by settings store
    rows: ['BOX-A', 'BOX-B', 'BOX-C'],
    color: 'bg-cyan-200'
  },
  {
    key: 'STAR_CLASS',
    label: 'STAR CLASS',
    price: 0, // Will be overridden by settings store
    rows: ['SC-A', 'SC-B', 'SC-C', 'SC-D'],
    color: 'bg-cyan-300'
  },
  {
    key: 'CLASSIC',
    label: 'CLASSIC',
    price: 0, // Will be overridden by settings store
    rows: ['CB-A', 'CB-B', 'CB-C', 'CB-D', 'CB-E', 'CB-F', 'CB-G', 'CB-H'],
    color: 'bg-orange-200'
  },
  {
    key: 'FIRST_CLASS',
    label: 'FIRST CLASS',
    price: 0, // Will be overridden by settings store
    rows: ['FC-A', 'FC-B', 'FC-C', 'FC-D', 'FC-E', 'FC-F', 'FC-G'],
    color: 'bg-pink-200'
  },
  {
    key: 'SECOND_CLASS',
    label: 'SECOND CLASS',
    price: 0, // Will be overridden by settings store
    rows: ['SC2-A', 'SC2-B'],
    color: 'bg-gray-200'
  }
];

// Show time configuration
export const SHOW_TIMES: ShowTime[] = [
  {
    key: 'MORNING',
    label: 'Morning Show',
    timing: '10:00 AM - 12:00 PM',
    enumValue: 'MORNING'
  },
  {
    key: 'MATINEE',
    label: 'Matinee Show',
    timing: '2:00 PM - 5:00 PM',
    enumValue: 'MATINEE'
  },
  {
    key: 'EVENING',
    label: 'Evening Show',
    timing: '6:00 PM - 9:00 PM',
    enumValue: 'EVENING'
  },
  {
    key: 'NIGHT',
    label: 'Night Show',
    timing: '9:30 PM - 12:30 AM',
    enumValue: 'NIGHT'
  }
];

// Helper functions - All pricing now uses dynamic settings store
export function getSeatPrice(row: string): number {
  const seatClass = SEAT_CLASSES.find(cls => cls.rows.includes(row));
  if (!seatClass) return 0;
  
  // Always use dynamic pricing from settings store
  try {
    const { useSettingsStore } = require('@/store/settingsStore');
    const getPriceForClass = useSettingsStore.getState().getPriceForClass;
    return getPriceForClass(seatClass.label);
  } catch {
    console.warn('Settings store not available, using fallback price');
    return 0;
  }
}

// Dynamic pricing function that uses settings store (alias for getSeatPrice)
export function getDynamicSeatPrice(row: string): number {
  return getSeatPrice(row);
}

export function getSeatClassByRow(row: string): SeatClass | undefined {
  return SEAT_CLASSES.find(cls => cls.rows.includes(row));
}

export function getSeatClassByLabel(label: string): SeatClass | undefined {
  return SEAT_CLASSES.find(cls => cls.label === label);
}

export function getShowTimeByKey(key: string): ShowTime | undefined {
  return SHOW_TIMES.find(show => show.key === key);
}

export function getShowTimeByEnum(enumValue: string): ShowTime | undefined {
  return SHOW_TIMES.find(show => show.enumValue === enumValue);
}

// Create a dynamic pricing map for easy lookup
export function getPricingMap(): Record<string, number> {
  try {
    const { useSettingsStore } = require('@/store/settingsStore');
    const pricing = useSettingsStore.getState().pricing;
    return pricing;
  } catch {
    console.warn('Settings store not available, using empty pricing map');
    return {};
  }
}

// Legacy static pricing map (deprecated - use getPricingMap() instead)
export const PRICING_MAP: Record<string, number> = {};

// Movie configuration - now empty, will be loaded from backend
export const MOVIE_CONFIG = {
  name: '',
  language: '',
  screen: ''
};

 