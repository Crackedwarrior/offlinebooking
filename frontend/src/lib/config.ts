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

// Seat class configuration
export const SEAT_CLASSES: SeatClass[] = [
  {
    key: 'BOX',
    label: 'BOX',
    price: 150,
    rows: ['BOX-A', 'BOX-B', 'BOX-C'],
    color: 'bg-cyan-200'
  },
  {
    key: 'STAR_CLASS',
    label: 'STAR CLASS',
    price: 150,
    rows: ['SC-A', 'SC-B', 'SC-C', 'SC-D'],
    color: 'bg-cyan-300'
  },
  {
    key: 'CLASSIC',
    label: 'CLASSIC',
    price: 120,
    rows: ['CB-A', 'CB-B', 'CB-C', 'CB-D', 'CB-E', 'CB-F', 'CB-G', 'CB-H'],
    color: 'bg-orange-200'
  },
  {
    key: 'FIRST_CLASS',
    label: 'FIRST CLASS',
    price: 70,
    rows: ['FC-A', 'FC-B', 'FC-C', 'FC-D', 'FC-E', 'FC-F', 'FC-G'],
    color: 'bg-pink-200'
  },
  {
    key: 'SECOND_CLASS',
    label: 'SECOND CLASS',
    price: 50,
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

// Helper functions
export function getSeatPrice(row: string): number {
  const seatClass = SEAT_CLASSES.find(cls => cls.rows.includes(row));
  return seatClass?.price || 0;
}

// Dynamic pricing function that uses settings store
export function getDynamicSeatPrice(row: string): number {
  // This will be used by components that need dynamic pricing
  const seatClass = SEAT_CLASSES.find(cls => cls.rows.includes(row));
  if (!seatClass) return 0;
  
  // Try to get from settings store, fallback to default
  try {
    const { useSettingsStore } = require('@/store/settingsStore');
    const getPriceForClass = useSettingsStore.getState().getPriceForClass;
    return getPriceForClass(seatClass.label);
  } catch {
    return seatClass.price;
  }
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

// Create a pricing map for easy lookup
export const PRICING_MAP: Record<string, number> = SEAT_CLASSES.reduce((acc, cls) => {
  acc[cls.label] = cls.price;
  return acc;
}, {} as Record<string, number>);

// Movie configuration
export const MOVIE_CONFIG = {
  name: 'KALANK',
  language: 'HINDI',
  screen: 'Screen 1'
};

 