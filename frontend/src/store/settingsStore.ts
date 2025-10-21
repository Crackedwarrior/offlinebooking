import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SEAT_CLASSES, SHOW_TIMES } from '@/lib/config';
import { SettingsApiService } from '@/services/settingsApi';

export interface MovieSettings {
  id: string;
  name: string;
  language: string;
  screen: string;
  printInKannada: boolean; // New field for language preference
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
  deleteShowTime: (key: string) => void;
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
  
  // Backend sync methods
  loadSettingsFromBackend: () => Promise<void>;
  saveSettingsToBackend: () => Promise<void>;
}

const defaultMovies: MovieSettings[] = []; // Empty - will be loaded from backend

const defaultPricing: PricingSettings = {}; // Empty - will be loaded from backend


const defaultShowTimes: ShowTimeSettings[] = SHOW_TIMES.map(show => {
  const timeParts = show.timing.split(' - ');
  const startTime = timeParts[0] || '10:00 AM';
  const endTime = timeParts[1] || '12:00 PM';
  
  return {
    key: show.key,
    label: show.label,
    startTime: startTime.trim(),
    endTime: endTime.trim(),
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
        movies: state.movies.filter(movie => movie.id !== id)
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

      updateShowTime: (key, settings) => {
        console.log('🏪 SETTINGS STORE: updateShowTime called');
        console.log('🏪 SETTINGS STORE: updating show key:', key);
        console.log('🏪 SETTINGS STORE: new settings:', settings);
        
        set((state) => {
          const updatedShowTimes = state.showTimes.map(show => 
            show.key === key ? { ...show, ...settings } : show
          );
          
          console.log('🏪 SETTINGS STORE: updated showTimes:', updatedShowTimes);
          return { showTimes: updatedShowTimes };
        });
      },


      deleteShowTime: (key: string) => set((state) => ({
        showTimes: state.showTimes.filter(show => show.key !== key)
      })),

      resetToDefaults: () => {
        // Clear persisted data from localStorage
        localStorage.removeItem('booking-settings');
        // Reset to defaults
        set({
          movies: defaultMovies,
          pricing: defaultPricing,
          showTimes: defaultShowTimes
        });
      },

      getPriceForClass: (classLabel) => {
        const state = get();
        return state.pricing[classLabel] || 0;
      },

      getShowTimes: () => {
        const state = get();
        console.log('🏪 SETTINGS STORE: getShowTimes called');
        console.log('🏪 SETTINGS STORE: showTimes from state:', state.showTimes);
        return state.showTimes; // Return all shows, not just enabled ones
      },

      // Optimized selectors
      getEnabledShowTimes: () => {
        const state = get();
        const enabled = state.showTimes.filter(show => show.enabled);
        console.log('🏪 SETTINGS STORE: getEnabledShowTimes called');
        console.log('🏪 SETTINGS STORE: all showTimes:', state.showTimes);
        console.log('🏪 SETTINGS STORE: enabled showTimes:', enabled);
        return enabled;
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
      },

      // Backend sync methods
      loadSettingsFromBackend: async () => {
        try {
          const settingsApi = SettingsApiService.getInstance();
          const backendAvailable = await settingsApi.isBackendAvailable();
          
          if (backendAvailable) {
            console.log('[SETTINGS] Backend available, loading settings from API');
            const backendSettings = await settingsApi.loadSettings();
            
            if (backendSettings) {
              set({
                movies: backendSettings.movies,
                pricing: backendSettings.pricing,
                showTimes: backendSettings.showTimes
              });
              console.log('[SETTINGS] Settings loaded from backend successfully');
            } else {
              console.log('[SETTINGS] Failed to load from backend, using local defaults');
            }
          } else {
            console.log('[SETTINGS] Backend not available, using local settings');
          }
        } catch (error) {
          console.error('[ERROR] Failed to load settings from backend:', error);
        }
      },

      saveSettingsToBackend: async () => {
        try {
          const state = get();
          const settingsApi = SettingsApiService.getInstance();
          const backendAvailable = await settingsApi.isBackendAvailable();
          
          if (backendAvailable) {
            console.log('[SETTINGS] Backend available, saving settings to API');
            const success = await settingsApi.saveSettings({
              movies: state.movies,
              pricing: state.pricing,
              showTimes: state.showTimes
            });
            
            if (success) {
              console.log('[SETTINGS] Settings saved to backend successfully');
            } else {
              console.log('[SETTINGS] Failed to save to backend');
            }
          } else {
            console.log('[SETTINGS] Backend not available, settings saved locally only');
          }
        } catch (error) {
          console.error('[ERROR] Failed to save settings to backend:', error);
        }
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