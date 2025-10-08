// API Type Definitions for Backend

import { Show } from '@prisma/client';

// Define enum types as string literals
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'PENDING' | 'REFUNDED';
export type BookingSource = 'LOCAL' | 'BMS' | 'VIP' | 'ONLINE';
export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED' | 'BMS_BOOKED' | 'SELECTED';

// Base API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  message?: string;
}

export interface AppError {
  type: string;
  message: string;
  code: number;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// Booking Types
export interface BookingData {
  id: string;
  date: string;
  show: Show;
  screen: string;
  movie: string;
  movieLanguage: string;
  bookedSeats: string[];
  seatCount: number;
  classLabel: string;
  pricePerSeat: number;
  totalPrice: number;
  status: BookingStatus;
  source: BookingSource;
  synced: boolean;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  totalIncome?: number;
  localIncome?: number;
  bmsIncome?: number;
  vipIncome?: number;
  createdAt: string;
  updatedAt: string;
  bookedAt: string;
}

export interface CreateBookingRequest {
  tickets: TicketData[];
  total: number;
  totalTickets: number;
  timestamp: string;
  show: Show;
  screen: string;
  movie: string;
  date?: string;
  source?: BookingSource;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
}

export interface TicketData {
  id: string;
  row: string;
  number: number;
  classLabel: string;
  price: number;
}

export interface CreateBookingResponse {
  success: boolean;
  bookings: BookingData[];
  message: string;
}

// Seat Types
export interface SeatData {
  id: string;
  seatId: string;
  row: string;
  number: number;
  classLabel: string;
  status: SeatStatus;
  bookingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeatStatusResponse {
  success: boolean;
  data: {
    date: string;
    show: Show;
    bookedSeats: Array<{
      seatId: string;
      class: string;
    }>;
    bmsSeats: Array<{
      seatId: string;
      class: string;
    }>;
    selectedSeats: Array<{
      seatId: string;
      class: string;
    }>;
    totalBooked: number;
    totalBms: number;
    totalSelected: number;
  };
}

// Statistics Types
export interface BookingStats {
  totalBookings: number;
  totalRevenue: number;
  bookingsByClass: Array<{
    class: string;
    count: number;
    revenue: number;
  }>;
}

export interface BookingStatsResponse {
  success: boolean;
  data: BookingStats;
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  environment: string;
  database: 'healthy' | 'unhealthy';
  databaseDetails?: string;
  system?: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    requests: {
      total: number;
      averageResponseTime: number;
      errorRate: number;
    };
    database: {
      connectionCount: number;
      queryCount: number;
      averageQueryTime: number;
    };
  };
  logging?: {
    totalFiles: number;
    totalSize: number;
    oldestLog: string;
    newestLog: string;
  };
  warnings?: string[];
  error?: string;
}

// Query Parameters
export interface BookingQueryParams {
  date?: string;
  show?: Show;
  status?: BookingStatus;
  source?: BookingSource;
  classLabel?: string;
  limit?: number;
  offset?: number;
}

export interface SeatStatusQueryParams {
  date: string;
  show: Show;
}

// Movie Types
export interface MovieData {
  id: string;
  name: string;
  language: string;
  screen: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Show Configuration Types
export interface ShowConfigData {
  id: string;
  show: Show;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Pricing Configuration Types
export interface PricingConfigData {
  id: string;
  classLabel: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error Response Types
export interface ValidationErrorResponse {
  success: false;
  error: {
    type: 'VALIDATION_ERROR';
    message: string;
    code: 400;
    details: Record<string, string[]>;
    timestamp: string;
    requestId: string;
  };
}

export interface NotFoundErrorResponse {
  success: false;
  error: {
    type: 'NOT_FOUND';
    message: string;
    code: 404;
    timestamp: string;
    requestId: string;
  };
}

export interface ServerErrorResponse {
  success: false;
  error: {
    type: 'INTERNAL_ERROR' | 'DATABASE_ERROR';
    message: string;
    code: 500;
    timestamp: string;
    requestId: string;
    details?: any;
  };
}

// Utility Types
export type ApiErrorResponse = ValidationErrorResponse | NotFoundErrorResponse | ServerErrorResponse;

// Request/Response Type Guards
export function isApiResponse<T>(obj: any): obj is ApiResponse<T> {
  return typeof obj === 'object' && obj !== null && 'success' in obj;
}

export function isAppError(obj: any): obj is AppError {
  return typeof obj === 'object' && obj !== null && 
         'type' in obj && 'message' in obj && 'code' in obj;
}

export function isBookingData(obj: any): obj is BookingData {
  return typeof obj === 'object' && obj !== null && 
         'id' in obj && 'date' in obj && 'show' in obj && 'movie' in obj;
}

export function isCreateBookingRequest(obj: any): obj is CreateBookingRequest {
  return typeof obj === 'object' && obj !== null && 
         'tickets' in obj && 'total' in obj && 'show' in obj && 'movie' in obj;
} 