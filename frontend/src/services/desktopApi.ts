// Import Tauri APIs
// Check if we're running in a Tauri environment
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

// Placeholder for Tauri APIs
let tauriInvoke: any = null;
let tauriAppDataDir: any = null;

// Initialize Tauri APIs if available
const initTauriApis = async () => {
  if (!isTauri) {
    console.log('Not running in Tauri environment');
    return false;
  }
  
  try {
    // Use a more compatible import approach
    if ((window as any).__TAURI__) {
      const tauriApp = (window as any).__TAURI__;
      tauriInvoke = tauriApp.tauri?.invoke || null;
      
      // For appDataDir, we'll need to handle it differently
      // This is a simplified approach
      tauriAppDataDir = async () => {
        // Return a default path for development
        return './data/';
      };
    }
    
    return true;
  } catch (error) {
    console.error('Failed to access Tauri APIs:', error);
    return false;
  }
};

// Desktop-specific API service
export class DesktopApiService {
  private static instance: DesktopApiService;
  private baseUrl: string = 'http://localhost:3001'; // Backend will run on this port

  private constructor() {}

  static getInstance(): DesktopApiService {
    if (!DesktopApiService.instance) {
      DesktopApiService.instance = new DesktopApiService();
    }
    return DesktopApiService.instance;
  }

  // Get the database path for the desktop app
  async getDatabasePath(): Promise<string> {
    try {
      // Initialize Tauri APIs if not already initialized
      if (!tauriAppDataDir) {
        await initTauriApis();
      }
      
      if (tauriAppDataDir) {
        const dataDir = await tauriAppDataDir();
        return `${dataDir}database/dev.db`;
      } else {
        console.warn('Tauri appDataDir API not available');
        return '';
      }
    } catch (error) {
      console.error('Error getting database path:', error);
      return '';
    }
  }

  // Generic API call method
  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Seat status methods
  async updateSeatStatus(seatUpdates: Array<{ seatId: string; status: string }>): Promise<any> {
    return this.apiCall('/api/booking/update-seat-status', {
      method: 'POST',
      body: JSON.stringify({ seatUpdates }),
    });
  }

  async getSeatStatus(date: string, show: string): Promise<any> {
    return this.apiCall(`/api/booking/seat-status?date=${date}&show=${show}`);
  }

  async saveBmsSeatStatus(bmsData: any): Promise<any> {
    return this.apiCall('/api/booking/save-bms-seat-status', {
      method: 'POST',
      body: JSON.stringify(bmsData),
    });
  }

  async createBooking(bookingData: any): Promise<any> {
    return this.apiCall('/api/booking/create', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getBookingHistory(date?: string, show?: string): Promise<any> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (show) params.append('show', show);
    
    return this.apiCall(`/api/booking/history?${params.toString()}`);
  }

  // Check if backend is running
  async checkBackendHealth(): Promise<boolean> {
    try {
      await this.apiCall('/health');
      return true;
    } catch (error) {
      console.warn('Backend not running, will start it...');
      return false;
    }
  }

  // Start the backend server
  async startBackend(): Promise<void> {
    try {
      // Initialize Tauri APIs if not already initialized
      if (!tauriInvoke) {
        await initTauriApis();
      }
      
      if (tauriInvoke) {
        await tauriInvoke('start_backend');
        console.log('Backend started successfully');
      } else {
        console.warn('Tauri invoke API not available, cannot start backend');
      }
    } catch (error) {
      console.error('Failed to start backend:', error);
      throw error;
    }
  }

  // Open URL in Tauri app instead of browser
  async openUrl(url: string): Promise<void> {
    try {
      // Use the tauriUtils to handle opening URLs
      const { tauriUtils } = await import('@/utils/tauriUtils');
      await tauriUtils.openUrl(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
      throw error;
    }
  }
}

export default DesktopApiService.getInstance();