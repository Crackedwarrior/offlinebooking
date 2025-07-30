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



const defaultPricing: PricingSettings = SEAT_CLASSES.reduce((acc, cls) => {
  acc[cls.label] = cls.price;
  return acc;
}, {} as PricingSettings);

// Helper function to convert 12-hour format to 24-hour format for storage
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

// Helper function to convert 24-hour format to 12-hour format for display
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

      getMoviesForShow: (showKey) => {
        const state = get();
        return state.movies.filter(movie => movie.showAssignments[showKey as keyof typeof movie.showAssignments]);
      },

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