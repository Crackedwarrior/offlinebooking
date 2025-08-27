// Electron API for desktop operations

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
    // Check if running in Electron
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // In Electron, database is bundled with the app
      return './resources/backend/dev.db';
    } else {
      // Fallback for web environment
      return './data/database/dev.db';
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
    // Backend is automatically started by Electron main process
    console.log('Backend startup handled by Electron main process');
  }

  // Open URL in Electron app instead of browser
  async openUrl(url: string): Promise<void> {
    // Check if running in Electron
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      await (window as any).electronAPI.openExternal(url);
    } else {
      // Fallback for web environment
      window.open(url, '_blank');
    }
  }
}

export default DesktopApiService.getInstance();