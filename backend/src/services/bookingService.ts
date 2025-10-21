import { PrismaClient } from '@prisma/client';
import { 
  CreateBookingRequest, 
  CreateBookingResponse, 
  BookingData, 
  BookingQueryParams,
  BookingStatsResponse,
  BookingSource 
} from '../types/api';

export class BookingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Check if a booking with the same seats already exists for this date and show
   */
  async checkDuplicateBooking(date: Date, show: string, seatIds: string[]): Promise<any | null> {
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        date: date,
        show: show as any,
      }
    });

    // Check if any existing booking has the same seat IDs
    const existingBooking = existingBookings.find((booking: any) => {
      const bookingSeats = booking.bookedSeats as string[];
      return bookingSeats.length === seatIds.length && 
             seatIds.every(id => bookingSeats.includes(id));
    });

    return existingBooking || null;
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

    // Check for duplicate booking
    const existingBooking = await this.checkDuplicateBooking(bookingDate, show, seatIds);
    
    if (existingBooking) {
      console.log('[BOOKING] Booking already exists for these seats:', existingBooking.id);
      
      // Return the existing booking instead of creating a duplicate
      const existingBookingData: BookingData = {
        id: existingBooking.id,
        date: existingBooking.date.toISOString(),
        show: existingBooking.show,
        screen: existingBooking.screen,
        movie: existingBooking.movie,
        movieLanguage: existingBooking.movieLanguage,
        bookedSeats: existingBooking.bookedSeats as string[],
        seatCount: existingBooking.seatCount,
        classLabel: existingBooking.classLabel,
        pricePerSeat: existingBooking.pricePerSeat,
        totalPrice: existingBooking.totalPrice,
        status: existingBooking.status,
        source: existingBooking.source,
        synced: existingBooking.synced,
        customerName: existingBooking.customerName || undefined,
        customerPhone: existingBooking.customerPhone || undefined,
        customerEmail: existingBooking.customerEmail || undefined,
        notes: existingBooking.notes || undefined,
        totalIncome: existingBooking.totalIncome || undefined,
        localIncome: existingBooking.localIncome || undefined,
        bmsIncome: existingBooking.bmsIncome || undefined,
        vipIncome: existingBooking.vipIncome || undefined,
        createdAt: existingBooking.createdAt.toISOString(),
        updatedAt: existingBooking.updatedAt.toISOString(),
        bookedAt: existingBooking.bookedAt.toISOString(),
      };

      return {
        success: true,
        bookings: [existingBookingData],
        message: `Booking already exists for these seats`
      };
    }

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
    
    console.log('[BOOKING] Booking created successfully:', newBooking.id);
    
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
    
    console.log('[DB] GET /api/bookings called with params:', { date, show, status });
    
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
