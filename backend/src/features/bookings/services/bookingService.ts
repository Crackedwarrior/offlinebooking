import { PrismaClient } from '@prisma/client';
import { 
  CreateBookingRequest, 
  CreateBookingResponse, 
  BookingData, 
  BookingQueryParams,
  BookingStatsResponse,
  BookingSource 
} from '../../../types/api';
import { Logger } from '../../../utils/logger';

const logger = Logger.withContext('services/bookingService');

export class BookingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check if a booking with the same seats already exists for this date and show
   * OPTIMIZED: Uses database query to check for overlapping seats first, then verifies exact match
   * This is much faster than loading all bookings and filtering in memory
   */
  async checkDuplicateBooking(date: Date, show: string, seatIds: string[]): Promise<any | null> {
    // Sort seat IDs for consistent comparison
    const sortedSeatIds = [...seatIds].sort();
    const seatIdsLength = sortedSeatIds.length;

    // First, use a database query to find bookings that might match
    // We check for bookings with the same date, show, and same number of seats
    // Then check if any of those bookings have overlapping seats
    try {
      // Get bookings with same date, show, and seat count
      // This narrows down the search significantly
      const candidateBookings = await this.prisma.booking.findMany({
        where: {
          date: date,
          show: show as any,
          seatCount: seatIdsLength, // Only check bookings with same seat count
        },
        // Limit to first 20 matches (most bookings won't have same seat count)
        take: 20
      });

      // Check for exact match in the candidate bookings
      // This is much faster than checking all bookings
      for (const booking of candidateBookings) {
        const bookingSeats = booking.bookedSeats as string[];
        
        // Quick check: same length
        if (bookingSeats.length !== seatIdsLength) {
          continue;
        }

        // Sort and compare arrays for exact match
        const sortedBookingSeats = [...bookingSeats].sort();
        const isExactMatch = sortedBookingSeats.length === sortedSeatIds.length &&
          sortedBookingSeats.every((seat, index) => seat === sortedSeatIds[index]);

        if (isExactMatch) {
          return booking;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error checking duplicate booking', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Fallback to original method if query fails
      const existingBookings = await this.prisma.booking.findMany({
        where: {
          date: date,
          show: show as any,
        },
        take: 100 // Limit fallback to 100 bookings
      });

      const existingBooking = existingBookings.find((booking: any) => {
        const bookingSeats = booking.bookedSeats as string[];
        return bookingSeats.length === seatIds.length && 
               seatIds.every(id => bookingSeats.includes(id));
      });

      return existingBooking || null;
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingRequest: CreateBookingRequest): Promise<CreateBookingResponse> {
    const { 
      tickets, 
      total, 
      show, 
      screen, 
      movie, 
      movieLanguage = 'HINDI',
      date,
      timestamp,
      source = 'LOCAL'
    } = bookingRequest;

    const seatIds = tickets.map((t: any) => t.id);
    const bookingDate = date ? new Date(date) : new Date(timestamp);



    // Create a single booking record instead of multiple class-based bookings
    const now = new Date();
    const newBooking = await this.prisma.booking.create({
      data: {
        date: bookingDate,
        show: show as any,
        screen,
        movie,
        movieLanguage,
        bookedSeats: tickets.map((t: any) => t.id),
        classLabel: tickets[0]?.classLabel || 'MIXED', // Use first ticket's class or 'MIXED' for multiple classes
        seatCount: tickets.length,
        pricePerSeat: Math.round(total / tickets.length),
        totalPrice: total,
        source: source as BookingSource, // Save the source to the database
        synced: false,
        printedAt: now, // Set printedAt to current time (same as booking time)
      }
    });
    
    logger.info('Booking created successfully', { bookingId: newBooking.id });
    
    // Transform Prisma result to API type
    const bookingData: BookingData = {
      id: newBooking.id,
      date: newBooking.date.toISOString(),
      show: newBooking.show,
      screen: newBooking.screen,
      movie: newBooking.movie,
      movieLanguage: newBooking.movieLanguage,
      bookedSeats: newBooking.bookedSeats as string[],
      seatCount: tickets.length,
      classLabel: newBooking.classLabel,
      pricePerSeat: newBooking.pricePerSeat,
      totalPrice: newBooking.totalPrice,
      status: 'CONFIRMED',
      source: newBooking.source,
      synced: newBooking.synced,
      createdAt: newBooking.createdAt.toISOString(),
      updatedAt: newBooking.updatedAt.toISOString(),
      bookedAt: newBooking.createdAt.toISOString(),
    };

    return {
      success: true,
      bookings: [bookingData],
      message: 'Booking created successfully'
    };
  }

  /**
   * Get all bookings with optional filtering
   */
  async getAllBookings(queryParams: BookingQueryParams): Promise<BookingData[]> {
    const { date, show, status } = queryParams;
    
    logger.debug('GET /api/bookings called', { date, show, status });
    
    const whereClause: any = {};
    
    if (date) {
      whereClause.date = new Date(date);
    }
    
    if (show) {
      whereClause.show = show;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return bookings.map((booking: any) => ({
      id: booking.id,
      date: booking.date.toISOString(),
      show: booking.show,
      screen: booking.screen,
      movie: booking.movie,
      movieLanguage: booking.movieLanguage,
      bookedSeats: booking.bookedSeats as string[],
      seatCount: booking.seatCount,
      classLabel: booking.classLabel,
      pricePerSeat: booking.pricePerSeat,
      totalPrice: booking.totalPrice,
      status: booking.status,
      source: booking.source,
      synced: booking.synced,
      customerName: booking.customerName || undefined,
      customerPhone: booking.customerPhone || undefined,
      customerEmail: booking.customerEmail || undefined,
      notes: booking.notes || undefined,
      totalIncome: booking.totalIncome || undefined,
      localIncome: booking.localIncome || undefined,
      bmsIncome: booking.bmsIncome || undefined,
      vipIncome: booking.vipIncome || undefined,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      bookedAt: booking.bookedAt.toISOString(),
    }));
  }

  /**
   * Get booking statistics
   */
  async getBookingStats(date?: string, show?: string) {
    const where: any = {};
    
    if (date) {
      // Parse the date and create a range that covers the entire day
      // Use UTC to avoid timezone issues
      const dateObj = new Date(date as string + 'T00:00:00.000Z');
      const startOfDay = new Date(dateObj);
      const endOfDay = new Date(dateObj);
      endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
      
      where.date = {
        gte: startOfDay,
        lt: endOfDay
      };
    }
    if (show) where.show = show;
    
    const [totalBookings, totalRevenue, bookingsByClass] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.aggregate({
        where,
        _sum: { totalPrice: true }
      }),
      this.prisma.booking.groupBy({
        by: ['classLabel'],
        where,
        _count: { id: true },
        _sum: { totalPrice: true }
      })
    ]);
    
    return {
      totalBookings,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      bookingsByClass: bookingsByClass.map((item: any) => ({
        class: item.classLabel,
        count: item._count.id,
        revenue: item._sum.totalPrice || 0
      }))
    };
  }

  /**
   * Update a booking by ID
   */
  async updateBooking(id: string, updateData: any): Promise<BookingData | null> {
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: updateData
    });

    return {
      id: updatedBooking.id,
      date: updatedBooking.date.toISOString(),
      show: updatedBooking.show,
      screen: updatedBooking.screen,
      movie: updatedBooking.movie,
      movieLanguage: updatedBooking.movieLanguage,
      bookedSeats: updatedBooking.bookedSeats as string[],
      seatCount: updatedBooking.seatCount,
      classLabel: updatedBooking.classLabel,
      pricePerSeat: updatedBooking.pricePerSeat,
      totalPrice: updatedBooking.totalPrice,
      status: updatedBooking.status,
      source: updatedBooking.source,
      synced: updatedBooking.synced,
      customerName: updatedBooking.customerName || undefined,
      customerPhone: updatedBooking.customerPhone || undefined,
      customerEmail: updatedBooking.customerEmail || undefined,
      notes: updatedBooking.notes || undefined,
      totalIncome: updatedBooking.totalIncome || undefined,
      localIncome: updatedBooking.localIncome || undefined,
      bmsIncome: updatedBooking.bmsIncome || undefined,
      vipIncome: updatedBooking.vipIncome || undefined,
      createdAt: updatedBooking.createdAt.toISOString(),
      updatedAt: updatedBooking.updatedAt.toISOString(),
      bookedAt: updatedBooking.bookedAt.toISOString(),
    };
  }

  /**
   * Mark a booking as printed
   */
  async markBookingAsPrinted(id: string): Promise<BookingData | null> {
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { printedAt: new Date() }
    });

    return {
      id: updatedBooking.id,
      date: updatedBooking.date.toISOString(),
      show: updatedBooking.show,
      screen: updatedBooking.screen,
      movie: updatedBooking.movie,
      movieLanguage: updatedBooking.movieLanguage,
      bookedSeats: updatedBooking.bookedSeats as string[],
      seatCount: updatedBooking.seatCount,
      classLabel: updatedBooking.classLabel,
      pricePerSeat: updatedBooking.pricePerSeat,
      totalPrice: updatedBooking.totalPrice,
      status: updatedBooking.status,
      source: updatedBooking.source,
      synced: updatedBooking.synced,
      customerName: updatedBooking.customerName || undefined,
      customerPhone: updatedBooking.customerPhone || undefined,
      customerEmail: updatedBooking.customerEmail || undefined,
      notes: updatedBooking.notes || undefined,
      totalIncome: updatedBooking.totalIncome || undefined,
      localIncome: updatedBooking.localIncome || undefined,
      bmsIncome: updatedBooking.bmsIncome || undefined,
      vipIncome: updatedBooking.vipIncome || undefined,
      createdAt: updatedBooking.createdAt.toISOString(),
      updatedAt: updatedBooking.updatedAt.toISOString(),
      bookedAt: updatedBooking.bookedAt.toISOString(),
    };
  }

  /**
   * Delete a booking by ID
   */
  async deleteBooking(id: string): Promise<boolean> {
    await this.prisma.booking.delete({
      where: { id }
    });
    return true;
  }
}
