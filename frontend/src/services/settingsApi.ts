// Settings API service for loading settings from backend
import { envConfig } from '@/config/env';

export interface MovieSettings {
  id: string;
  name: string;
  language: string;
  screen: string;
  printInKannada: boolean;
  showAssignments: {
    MORNING: boolean;
    MATINEE: boolean;
    EVENING: boolean;
    NIGHT: boolean;
  };
}

export interface PricingSettings {
  [key: string]: number;
}

export interface ShowTimeSettings {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export interface SettingsData {
  movies: MovieSettings[];
  pricing: PricingSettings;
  showTimes: ShowTimeSettings[];
}

export class SettingsApiService {
  private static instance: SettingsApiService;
  private baseUrl: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  private constructor() {}

  static getInstance(): SettingsApiService {
    if (!SettingsApiService.instance) {
      SettingsApiService.instance = new SettingsApiService();
    }
    return SettingsApiService.instance;
  }

  /**
   * Load settings from backend API
   */
  async loadSettings(): Promise<SettingsData | null> {
    try {
      console.log('[SETTINGS] Loading settings from backend:', this.baseUrl);
      
      const response = await fetch(`${this.baseUrl}/api/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('[SETTINGS] Settings loaded successfully from backend');
        return result.data;
      } else {
        console.error('[ERROR] Failed to load settings:', result.message);
        return null;
      }
    } catch (error) {
      console.error('[ERROR] Failed to load settings from backend:', error);
      return null;
    }
  }

  /**
   * Save settings to backend API
   */
  async saveSettings(settings: SettingsData): Promise<boolean> {
    try {
      console.log('[SETTINGS] Saving settings to backend:', this.baseUrl);
      
      const response = await fetch(`${this.baseUrl}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('[SETTINGS] Settings saved successfully to backend');
        return true;
      } else {
        console.error('[ERROR] Failed to save settings:', result.message);
        return false;
      }
    } catch (error) {
      console.error('[ERROR] Failed to save settings to backend:', error);
      return false;
    }
  }

  /**
   * Check if backend is available
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      console.log('[SETTINGS] Backend not available:', error);
      return false;
    }
  }
}

export default SettingsApiService;
