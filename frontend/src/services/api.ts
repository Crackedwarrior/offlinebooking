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

  // Health check
  async healthCheck(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.get<HealthCheckResponse>('/api/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export convenience functions
export const createBooking = (data: CreateBookingRequest) => apiService.createBooking(data);
export const getBookings = (params?: BookingQueryParams) => apiService.getBookings(params);
export const getBookingStats = (params?: BookingQueryParams) => apiService.getBookingStats(params);
export const getSeatStatus = (params: SeatStatusQueryParams) => apiService.getSeatStatus(params);
export const healthCheck = () => apiService.healthCheck();

export default apiService; 