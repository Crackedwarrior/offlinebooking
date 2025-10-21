import { Request, Response } from 'express';
import { BookingService } from '../services/bookingService';
import { 
  CreateBookingRequest, 
  CreateBookingResponse, 
  BookingData, 
  BookingQueryParams,
  BookingStatsResponse,
  ApiResponse 
} from '../types/api';
import { InputSanitizer } from '../utils/inputSanitizer';
import { auditLogger } from '../utils/auditLogger';

export class BookingController {
  private bookingService: BookingService;

  constructor(bookingService: BookingService) {
    this.bookingService = bookingService;
  }

  /**
   * Create a new booking
   */
  async create(req: Request, res: Response): Promise<void> {
    const bookingRequest: CreateBookingRequest = req.body;
    const { 
      tickets, 
      total, 
      totalTickets, 
      timestamp, 
      show, 
      screen, 
      movie, 
      movieLanguage = 'HINDI',
      date,
      source = 'LOCAL',
      customerName,
      customerPhone,
      customerEmail,
      notes
    } = bookingRequest;

    // Sanitize input data with strict validation for critical fields
    const sanitizedCustomerName = customerName ? InputSanitizer.validateAndReject(customerName, 'customerName', 100) : 'Walk-in Customer';
    const sanitizedCustomerPhone = InputSanitizer.sanitizePhone(customerPhone);
    const sanitizedCustomerEmail = customerEmail ? InputSanitizer.sanitizeEmail(customerEmail) : { data: '', sanitized: false };
    const sanitizedNotes = InputSanitizer.sanitizeString(notes, 500);
    
    // Check for dangerous content
    if (customerName) {
      InputSanitizer.logDangerousContent(customerName, 'customerName', req.requestId);
    }
    InputSanitizer.logDangerousContent(customerPhone, 'customerPhone', req.requestId);
    InputSanitizer.logDangerousContent(customerEmail, 'customerEmail', req.requestId);
    InputSanitizer.logDangerousContent(notes, 'notes', req.requestId);

    // Log booking attempt
    auditLogger.logBooking(
      'CREATE_BOOKING_ATTEMPT',
      true, // We'll update this based on success
      'anonymous', // We'll add user authentication later
      req.ip,
      req.get('User-Agent'),
      {
        ticketsCount: tickets.length,
        total,
        show,
        screen,
        movie,
        date,
        source,
        sanitized: {
          customerName: customerName ? sanitizedCustomerName !== customerName : false,
          customerPhone: sanitizedCustomerPhone.sanitized,
          customerEmail: sanitizedCustomerEmail.sanitized,
          notes: sanitizedNotes.sanitized
        }
      },
      req.requestId
    );

    console.log('[BOOKING] Creating booking with data:', {
      tickets: tickets.length,
      total,
      show,
      screen,
      movie,
      date,
      seatIds: tickets.map((t: any) => t.id)
    });

    try {
      const result = await this.bookingService.createBooking(bookingRequest);
      
      // Log successful booking
      auditLogger.logBooking(
        'CREATE_BOOKING_SUCCESS',
        true,
        'anonymous',
        req.ip,
        req.get('User-Agent'),
        {
          bookingId: result.bookings[0]?.id,
          ticketsCount: tickets.length,
          total,
          show,
          screen,
          movie,
          date,
          source
        },
        req.requestId
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('[ERROR] Failed to create booking:', error);
      
      // Log failed booking
      auditLogger.logBooking(
        'CREATE_BOOKING_FAILED',
        false,
        'anonymous',
        req.ip,
        req.get('User-Agent'),
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          ticketsCount: tickets.length,
          total,
          show,
          screen,
          movie,
          date,
          source
        },
        req.requestId
      );

      const response: CreateBookingResponse = {
        success: false,
        bookings: [],
        message: 'Failed to create booking'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get all bookings with optional filtering
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const queryParams: BookingQueryParams = req.query as any;
    const { date, show, status } = queryParams;
    
    console.log('[DB] GET /api/bookings called with params:', { date, show, status });
    
    try {
      const bookings = await this.bookingService.getAllBookings(queryParams);
      
      const response: ApiResponse<BookingData[]> = {
        success: true,
        data: bookings,
        message: 'Bookings retrieved successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('[ERROR] Failed to get bookings:', error);
      
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: 'Failed to retrieve bookings'
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Get booking statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    const { date, show } = req.query;
    
    try {
      const stats = await this.bookingService.getBookingStats(
        date as string, 
        show as string
      );
      
      const response: BookingStatsResponse = {
        success: true,
        data: stats
      };
      
      res.json(response);
    } catch (error) {
      console.error('[ERROR] Failed to get booking stats:', error);
      
      const response: BookingStatsResponse = {
        success: false,
        data: {
          totalBookings: 0,
          totalRevenue: 0,
          bookingsByClass: []
        }
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Update a booking by ID
   */
  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('[BOOKING] Updating booking:', { id, updateData });
    
    try {
      const updatedBooking = await this.bookingService.updateBooking(id, updateData);
      
      if (!updatedBooking) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'Booking not found'
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse<BookingData> = {
        success: true,
        data: updatedBooking,
        message: 'Booking updated successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('[ERROR] Failed to update booking:', error);
      
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: 'Failed to update booking'
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Mark a booking as printed
   */
  async markPrinted(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    console.log('[BOOKING] Marking booking as printed:', { id });
    
    try {
      const updatedBooking = await this.bookingService.markBookingAsPrinted(id);
      
      if (!updatedBooking) {
        const response: ApiResponse<null> = {
          success: false,
          data: null,
          message: 'Booking not found'
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse<BookingData> = {
        success: true,
        data: updatedBooking,
        message: 'Booking marked as printed successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('[ERROR] Failed to mark booking as printed:', error);
      
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: 'Failed to mark booking as printed'
      };
      
      res.status(500).json(response);
    }
  }

  /**
   * Delete a booking by ID
   */
  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    
    console.log('[BOOKING] Deleting booking:', { id });
    
    try {
      await this.bookingService.deleteBooking(id);
      
      const response: ApiResponse<null> = {
        success: true,
        data: null,
        message: 'Booking deleted successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('[ERROR] Failed to delete booking:', error);
      
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: 'Failed to delete booking'
      };
      
      res.status(500).json(response);
    }
  }
}
