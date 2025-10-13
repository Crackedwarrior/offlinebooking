import { envConfig, getApiUrl } from '@/config/env';
import { 
  handleFetchError, 
  handleNetworkError, 
  retryRequest, 
  logError,
  showErrorNotification,
  type AppError 
} from '@/utils/errorHandler';
import {
  type ApiResponse,
  type BookingData,
  type CreateBookingRequest,
  type CreateBookingResponse,
  type BookingQueryParams,
  type BookingStatsResponse,
  type HealthCheckResponse,
  type SeatStatusResponse,
  type SeatStatusQueryParams,
  type ApiServiceConfig,
  type ApiRequestOptions
} from '@/types/api';

// API Service class

class ApiService {
  private baseUrl: string;
  private timeout: number;

  constructor(config?: Partial<ApiServiceConfig>) {
    this.baseUrl = config?.baseUrl || envConfig.api.baseUrl;
    this.timeout = config?.timeout || envConfig.api.timeout;
  }

  // Generic request method with retry logic
  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint);
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    return retryRequest(async () => {
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...defaultOptions,
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          handleFetchError(response);
        }

        const data = await response.json();
        
        // Check if response has error structure
        if (data.success === false && data.error) {
          logError(data.error, `API Error: ${endpoint}`);
          showErrorNotification(data.error);
          throw new Error(data.error.message || 'API request failed');
        }

        return data as ApiResponse<T>;
      } catch (error) {
        // Check if it's a network error (backend not running)
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error('[ERROR] Backend not available. Make sure to run: npm run dev:backend');
          throw new Error('Backend service not running. Please start the backend server.');
        }
        
        logError(error as Error, `API Request: ${endpoint}`);
        throw handleNetworkError(error);
      }
    });
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Booking-specific methods
  async createBooking(bookingData: CreateBookingRequest): Promise<ApiResponse<CreateBookingResponse>> {
    return this.post<CreateBookingResponse>('/api/bookings', bookingData);
  }

  async getBookings(params?: BookingQueryParams): Promise<ApiResponse<BookingData[]>> {
    const queryString = params ? new URLSearchParams(params as unknown as Record<string, string>).toString() : '';
    const endpoint = queryString ? `/api/bookings?${queryString}` : '/api/bookings';
    return this.get<BookingData[]>(endpoint);
  }

  async getBookingStats(params?: BookingQueryParams): Promise<ApiResponse<BookingStatsResponse>> {
    const queryString = params ? new URLSearchParams(params as unknown as Record<string, string>).toString() : '';
    const endpoint = queryString ? `/api/bookings/stats?${queryString}` : '/api/bookings/stats';
    return this.get<BookingStatsResponse>(endpoint);
  }

  async getSeatStatus(params: SeatStatusQueryParams): Promise<ApiResponse<SeatStatusResponse>> {
    const queryString = new URLSearchParams(params as unknown as Record<string, string>).toString();
    return this.get<SeatStatusResponse>(`/api/seats/status?${queryString}`);
  }

  async saveBmsSeatStatus(seatIds: string[], status: 'BMS_BOOKED' | 'AVAILABLE', date: string, show: string): Promise<ApiResponse<any>> {
    return this.post('/api/seats/bms', { seatIds, status, date, show });
  }

  async updateSeatStatus(seatUpdates: Array<{ seatId: string; status: string }>, date: string, show: string): Promise<ApiResponse<any>> {
    return this.post('/api/seats/status', { seatUpdates, date, show });
  }

  async updateBooking(id: string, data: any): Promise<ApiResponse<BookingData>> {
    return this.put<BookingData>(`/api/bookings/${id}`, data);
  }

  async deleteBooking(id: string): Promise<ApiResponse<null>> {
    return this.delete<null>(`/api/bookings/${id}`);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.get<HealthCheckResponse>('/api/health');
  }

  // Ticket ID Management
  async getCurrentTicketId(): Promise<ApiResponse<{ currentId: number; currentTicketId: string; config: any }>> {
    return this.get<{ currentId: number; currentTicketId: string; config: any }>('/api/ticket-id/current');
  }

  async resetTicketId(newId: number): Promise<ApiResponse<{ currentId: number; currentTicketId: string }>> {
    return this.post<{ currentId: number; currentTicketId: string }>('/api/ticket-id/reset', { newId });
  }

  async getNextTicketId(): Promise<ApiResponse<{ nextTicketId: string }>> {
    return this.get<{ nextTicketId: string }>('/api/ticket-id/next');
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export convenience functions
export const createBooking = (data: CreateBookingRequest) => apiService.createBooking(data);
export const getBookings = (params?: BookingQueryParams) => apiService.getBookings(params);
export const getBookingStats = (params?: BookingQueryParams) => apiService.getBookingStats(params);
export const getSeatStatus = (params: SeatStatusQueryParams) => apiService.getSeatStatus(params);
export const saveBmsSeatStatus = (seatIds: string[], status: 'BMS_BOOKED' | 'AVAILABLE', date: string, show: string) => apiService.saveBmsSeatStatus(seatIds, status, date, show);
export const updateSeatStatus = (seatUpdates: Array<{ seatId: string; status: string }>, date: string, show: string) => apiService.updateSeatStatus(seatUpdates, date, show);
export const updateBooking = (id: string, data: any) => apiService.updateBooking(id, data);
export const deleteBooking = (id: string) => apiService.deleteBooking(id);
export const healthCheck = () => apiService.healthCheck();

// Ticket ID Management convenience functions
export const getCurrentTicketId = () => apiService.getCurrentTicketId();
export const resetTicketId = (newId: number) => apiService.resetTicketId(newId);
export const getNextTicketId = () => apiService.getNextTicketId();

export default apiService; 