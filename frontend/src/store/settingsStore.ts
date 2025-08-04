import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SEAT_CLASSES, SHOW_TIMES } from '@/lib/config';

export interface MovieSettings {
  id: string;
  name: string;
  language: string;
  screen: string;
  showAssignments: {
    MORNING: boolean;
    MATINEE: boolean;
    EVENING: boolean;
    NIGHT: boolean;
  };
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
  movies: MovieSettings[];
  pricing: PricingSettings;
  showTimes: ShowTimeSettings[];
  
  // Actions
  addMovie: (movie: MovieSettings) => void;
  updateMovie: (id: string, settings: Partial<MovieSettings>) => void;
  deleteMovie: (id: string) => void;
  updateShowAssignment: (movieId: string, showKey: string, assigned: boolean) => void;
  getMoviesForShow: (showKey: string) => MovieSettings[];
  getMovieForShow: (showKey: string) => MovieSettings | null; // Keep for backward compatibility
  updatePricing: (classLabel: string, price: number) => void;
  updateShowTime: (key: string, settings: Partial<ShowTimeSettings>) => void;
  resetToDefaults: () => void;
  getPriceForClass: (classLabel: string) => number;
  getShowTimes: () => ShowTimeSettings[];
  
  // Optimized selectors
  getEnabledShowTimes: () => ShowTimeSettings[];
  getMovieById: (id: string) => MovieSettings | undefined;
  getMoviesByLanguage: (language: string) => MovieSettings[];
  getMoviesByScreen: (screen: string) => MovieSettings[];
  getTotalMovies: () => number;
  getEnabledMovies: () => MovieSettings[];
  getPricingSummary: () => { min: number; max: number; average: number };
}

const defaultMovies: MovieSettings[] = [
  {
    id: 'movie-1',
    name: 'KALANK',
    language: 'HINDI',
    screen: 'Screen 1',
    showAssignments: {
      MORNING: true,
      MATINEE: false,
      EVENING: true,
      NIGHT: false
    }
  },
  {
    id: 'movie-2',
    name: 'AVENGERS: ENDGAME',
    language: 'ENGLISH',
    screen: 'Screen 1',
    showAssignments: {
      MORNING: false,
      MATINEE: true,
      EVENING: false,
      NIGHT: true
    }
  },
  {
    id: 'movie-3',
    name: 'PUSHPA',
    language: 'TELUGU',
    screen: 'Screen 1',
    showAssignments: {
      MORNING: false,
      MATINEE: false,
      EVENING: false,
      NIGHT: false
    }
  }
];

const defaultPricing: PricingSettings = {
  'BOX': 1650,
  'STAR CLASS': 100,
  'CLASSIC': 100,
  'FIRST CLASS': 100,
  'SECOND CLASS': 100
};

/**
 * Converts 12-hour time format to 24-hour format for internal processing.
 * 
 * This function handles various edge cases and provides robust error handling:
 * - Invalid input validation
 * - Default fallback values
 * - Robust parsing with regex
 * - Edge case handling for 12 AM/PM
 * 
 * @param time12h - Time in 12-hour format (e.g., "10:00 AM", "2:30 PM")
 * @returns Time in 24-hour format (e.g., "10:00", "14:30")
 * 
 * @example
 * convertTo24Hour("10:00 AM") // Returns "10:00"
 * convertTo24Hour("2:30 PM")  // Returns "14:30"
 * convertTo24Hour("12:00 AM") // Returns "00:00"
 * convertTo24Hour("12:00 PM") // Returns "12:00"
 * convertTo24Hour("invalid")  // Returns "10:00" (fallback)
 * 
 * @complexity O(1)
 * @throws {Error} Falls back to default value "10:00" if parsing fails
 */
function convertTo24Hour(time12h: string): string {
  // Handle cases where time12h might be undefined or invalid
  if (!time12h || typeof time12h !== 'string') {
    return '10:00';
  }
  
  // Parse the time string (e.g., "10:00 AM" or "2:00 PM")
  const match = time12h.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) {
    return '10:00';
  }
  
  let [_, hoursStr, minutesStr, period] = match;
  let hours = parseInt(hoursStr);
  const minutes = parseInt(minutesStr);
  
  // Validate parsed values
  if (isNaN(hours) || isNaN(minutes)) {
    return '10:00';
  }
  
  if (period.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Converts 24-hour time format to 12-hour format for display purposes.
 * 
 * This function provides the reverse operation of convertTo24Hour and handles:
 * - Invalid input validation
 * - Default fallback values
 * - Edge case handling for midnight and noon
 * - Proper formatting with leading zeros
 * 
 * @param time24h - Time in 24-hour format (e.g., "14:30", "09:15")
 * @returns Time in 12-hour format (e.g., "2:30 PM", "9:15 AM")
 * 
 * @example
 * convertTo12Hour("14:30") // Returns "2:30 PM"
 * convertTo12Hour("09:15") // Returns "9:15 AM"
 * convertTo12Hour("00:00") // Returns "12:00 AM"
 * convertTo12Hour("12:00") // Returns "12:00 PM"
 * convertTo12Hour("invalid") // Returns "10:00 AM" (fallback)
 * 
 * @complexity O(1)
 * @throws {Error} Falls back to default value "10:00 AM" if parsing fails
 */
function convertTo12Hour(time24h: string): string {
  // Handle cases where time24h might be undefined or invalid
  if (!time24h || typeof time24h !== 'string') {
    return '10:00 AM';
  }
  
  const [hours, minutes] = time24h.split(':').map(Number);
  
  // Validate parsed values
  if (isNaN(hours) || isNaN(minutes)) {
    return '10:00 AM';
  }
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

const defaultShowTimes: ShowTimeSettings[] = SHOW_TIMES.map(show => {
  const [startTime, endTime] = show.timing.split(' - ');
  return {
    key: show.key,
    label: show.label,
    startTime: convertTo24Hour(startTime.trim()),
    endTime: convertTo24Hour(endTime.trim()),
    enabled: true
  };
});

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      movies: defaultMovies,
      pricing: defaultPricing,
      showTimes: defaultShowTimes,

      addMovie: (movie) => set((state) => ({
        movies: [...state.movies, movie]
      })),

      updateMovie: (id, settings) => set((state) => ({
        movies: state.movies.map(movie => 
          movie.id === id ? { ...movie, ...settings } : movie
        )
      })),

      deleteMovie: (id) => set((state) => ({
        movies: state.movies.filter(movie => movie.id !== id),
        showMovieMapping: Object.fromEntries(
          Object.entries(state.showMovieMapping).filter(([_, movieId]) => movieId !== id)
        )
      })),

      /**
       * Updates show assignment for a movie with intelligent conflict resolution.
       * 
       * This function implements a sophisticated assignment algorithm that:
       * 1. Ensures only one movie per show (exclusive assignment)
       * 2. Handles assignment and removal operations
       * 3. Maintains data consistency across the store
       * 4. Provides atomic updates to prevent race conditions
       * 
       * @param movieId - Unique identifier for the movie
       * @param showKey - Show key to assign/unassign (e.g., 'MORNING', 'EVENING')
       * @param assigned - Boolean indicating whether to assign (true) or unassign (false)
       * 
       * @example
       * // Assign movie to morning show
       * updateShowAssignment('movie-123', 'MORNING', true);
       * 
       * // Remove movie from evening show
       * updateShowAssignment('movie-123', 'EVENING', false);
       * 
       * @complexity O(n) where n is the number of movies
       */
      updateShowAssignment: (movieId, showKey, assigned) => set((state) => {
        // If assigning a movie to a show, remove all other movies from that show first
        if (assigned) {
          // First, remove all movies from this show
          const moviesWithoutShow = state.movies.map(movie => ({
            ...movie,
            showAssignments: {
              ...movie.showAssignments,
              [showKey]: false
            }
          }));
          
          // Then assign the specific movie to this show
          return {
            movies: moviesWithoutShow.map(movie => 
              movie.id === movieId 
                ? { 
                    ...movie, 
                    showAssignments: { 
                      ...movie.showAssignments, 
                      [showKey]: true 
                    } 
                  }
                : movie
            )
          };
        } else {
          // Just remove the movie from the show
          return {
            movies: state.movies.map(movie => 
              movie.id === movieId 
                ? { 
                    ...movie, 
                    showAssignments: { 
                      ...movie.showAssignments, 
                      [showKey]: false 
                    } 
                  }
                : movie
            )
          };
        }
      }),

      /**
       * Retrieves all movies assigned to a specific show.
       * 
       * This function filters movies based on their show assignments and provides
       * a clean interface for accessing show-specific movie data.
       * 
       * @param showKey - Show key to filter by (e.g., 'MORNING', 'EVENING')
       * @returns Array of movies assigned to the specified show
       * 
       * @example
       * const morningMovies = getMoviesForShow('MORNING');
       * // Returns array of movies assigned to morning show
       * 
       * @complexity O(n) where n is the number of movies
       */
      getMoviesForShow: (showKey) => {
        const state = get();
        return state.movies.filter(movie => movie.showAssignments[showKey as keyof typeof movie.showAssignments]);
      },

      /**
       * Retrieves the primary movie for a specific show (backward compatibility).
       * 
       * This function maintains backward compatibility with existing code that
       * expects a single movie per show, returning the first assigned movie.
       * 
       * @param showKey - Show key to get movie for (e.g., 'MORNING', 'EVENING')
       * @returns The first movie assigned to the show, or null if none assigned
       * 
       * @example
       * const movie = getMovieForShow('EVENING');
       * // Returns the movie assigned to evening show, or null
       * 
       * @complexity O(n) where n is the number of movies
       */
      getMovieForShow: (showKey) => {
        const state = get();
        const moviesForShow = state.movies.filter(movie => movie.showAssignments[showKey as keyof typeof movie.showAssignments]);
        return moviesForShow.length > 0 ? moviesForShow[0] : null; // Return first movie for backward compatibility
      },

      updatePricing: (classLabel, price) => set((state) => ({
        pricing: { ...state.pricing, [classLabel]: price }
      })),

      updateShowTime: (key, settings) => set((state) => ({
        showTimes: state.showTimes.map(show => 
          show.key === key ? { ...show, ...settings } : show
        )
      })),

      resetToDefaults: () => set({
        movies: defaultMovies,
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
      },

      // Optimized selectors
      getEnabledShowTimes: () => {
        const state = get();
        return state.showTimes.filter(show => show.enabled);
      },

      getMovieById: (id: string) => {
        const state = get();
        return state.movies.find(movie => movie.id === id);
      },

      getMoviesByLanguage: (language: string) => {
        const state = get();
        return state.movies.filter(movie => movie.language === language);
      },

      getMoviesByScreen: (screen: string) => {
        const state = get();
        return state.movies.filter(movie => movie.screen === screen);
      },

      getTotalMovies: () => {
        const state = get();
        return state.movies.length;
      },

      getEnabledMovies: () => {
        const state = get();
        return state.movies.filter(movie => 
          Object.values(movie.showAssignments).some(assigned => assigned)
        );
      },

      /**
       * Calculates comprehensive pricing statistics for the system.
       * 
       * This function analyzes all pricing data to provide insights including:
       * - Minimum price across all seat classes
       * - Maximum price across all seat classes
       * - Average price across all seat classes
       * 
       * @returns Object containing min, max, and average pricing statistics
       * 
       * @example
       * const pricing = getPricingSummary();
       * // Returns { min: 50, max: 150, average: 100 }
       * 
       * @complexity O(n) where n is the number of seat classes
       */
      getPricingSummary: () => {
        const state = get();
        const prices = Object.values(state.pricing);
        if (prices.length === 0) return { min: 0, max: 0, average: 0 };
        
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        
        return { min, max, average };
      }
    }),
    {
      name: 'booking-settings',
      partialize: (state) => ({ 
        movies: state.movies,
        pricing: state.pricing,
        showTimes: state.showTimes
      })
    }
  )
);

// Custom hooks for optimized selectors
export const useEnabledShowTimes = () => useSettingsStore(state => state.getEnabledShowTimes());
export const useMovieById = (id: string) => useSettingsStore(state => state.getMovieById(id));
export const useMoviesByLanguage = (language: string) => useSettingsStore(state => state.getMoviesByLanguage(language));
export const useMoviesByScreen = (screen: string) => useSettingsStore(state => state.getMoviesByScreen(screen));
export const useTotalMovies = () => useSettingsStore(state => state.getTotalMovies());
export const useEnabledMovies = () => useSettingsStore(state => state.getEnabledMovies());
export const usePricingSummary = () => useSettingsStore(state => state.getPricingSummary());
export const useMoviesForShow = (showKey: string) => useSettingsStore(state => state.getMoviesForShow(showKey));
export const useMovieForShow = (showKey: string) => useSettingsStore(state => state.getMovieForShow(showKey));
export const usePriceForClass = (classLabel: string) => useSettingsStore(state => state.getPriceForClass(classLabel)); 