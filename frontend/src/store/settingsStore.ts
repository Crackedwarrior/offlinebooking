import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SEAT_CLASSES, SHOW_TIMES } from '@/lib/config';

export interface MovieSettings {
  name: string;
  language: string;
  screen: string;
}

export interface PricingSettings {
  [key: string]: number; // seat class label -> price
}

export interface ShowTimeSettings {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export interface SettingsState {
  movie: MovieSettings;
  pricing: PricingSettings;
  showTimes: ShowTimeSettings[];
  
  // Actions
  updateMovie: (settings: Partial<MovieSettings>) => void;
  updatePricing: (classLabel: string, price: number) => void;
  updateShowTime: (key: string, settings: Partial<ShowTimeSettings>) => void;
  resetToDefaults: () => void;
  getPriceForClass: (classLabel: string) => number;
  getShowTimes: () => ShowTimeSettings[];
}

const defaultMovieSettings: MovieSettings = {
  name: 'KALANK',
  language: 'HINDI',
  screen: 'Screen 1'
};

const defaultPricing: PricingSettings = SEAT_CLASSES.reduce((acc, cls) => {
  acc[cls.label] = cls.price;
  return acc;
}, {} as PricingSettings);

// Helper function to convert 12-hour format to 24-hour format for storage
function convertTo24Hour(time12h: string): string {
  const [time, period] = time12h.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Helper function to convert 24-hour format to 12-hour format for display
function convertTo12Hour(time24h: string): string {
  const [hours, minutes] = time24h.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

const defaultShowTimes: ShowTimeSettings[] = SHOW_TIMES.map(show => {
  const [startTime, endTime] = show.timing.split(' - ');
  return {
    key: show.key,
    label: show.label,
    startTime: convertTo24Hour(startTime),
    endTime: convertTo24Hour(endTime),
    enabled: true
  };
});

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      movie: defaultMovieSettings,
      pricing: defaultPricing,
      showTimes: defaultShowTimes,

      updateMovie: (settings) => set((state) => ({
        movie: { ...state.movie, ...settings }
      })),

      updatePricing: (classLabel, price) => set((state) => ({
        pricing: { ...state.pricing, [classLabel]: price }
      })),

      updateShowTime: (key, settings) => set((state) => ({
        showTimes: state.showTimes.map(show => 
          show.key === key ? { ...show, ...settings } : show
        )
      })),

      resetToDefaults: () => set({
        movie: defaultMovieSettings,
        pricing: defaultPricing,
        showTimes: defaultShowTimes
      }),

      getPriceForClass: (classLabel) => {
        const state = get();
        return state.pricing[classLabel] || 0;
      },

      getShowTimes: () => {
        const state = get();
        return state.showTimes.filter(show => show.enabled);
      }
    }),
    {
      name: 'booking-settings',
      partialize: (state) => ({ 
        movie: state.movie, 
        pricing: state.pricing,
        showTimes: state.showTimes
      })
    }
  )
); 