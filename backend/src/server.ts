// src/server.ts

import express from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import { config, validateConfig } from './config';
import { 
  requestIdMiddleware, 
  errorLogger, 
  errorHandler, 
  asyncHandler, 
  validateBookingData 
} from './middleware/errorHandler';
import { 
  ValidationError, 
  NotFoundError, 
  DatabaseError, 
  handleDatabaseError 
} from './utils/errors';
import {
  type CreateBookingRequest,
  type CreateBookingResponse,
  type BookingData,
  type BookingQueryParams,
  type SeatStatusQueryParams,
  type BookingStatsResponse,
  type HealthCheckResponse,
  type SeatStatusResponse,
  type ApiResponse
} from './types/api';

// Validate configuration on startup
if (!validateConfig()) {
  process.exit(1);
}

const app = express();
const prisma = new PrismaClient();

// Configure CORS
app.use(cors({
  origin: config.api.corsOrigin,
  credentials: true,
}));

app.use(express.json());

// Add request ID middleware
app.use(requestIdMiddleware);

// Request logging middleware (if enabled)
if (config.logging.enableRequestLogging) {
  app.use((req: Request, res: Response, next) => {
    console.log(`[${req.requestId}] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

app.post('/api/bookings', validateBookingData, asyncHandler(async (req: Request, res: Response) => {
  const bookingRequest: CreateBookingRequest = req.body;
  const { 
    tickets, 
    total, 
    totalTickets, 
    timestamp, 
    show, 
    screen, 
    movie, 
    date,
    source = 'LOCAL',
    customerName,
    customerPhone,
    customerEmail,
    notes
  } = bookingRequest;

  // Group tickets by class for separate bookings
  const ticketGroups: Record<string, any[]> = tickets.reduce((groups: Record<string, any[]>, ticket: any) => {
    const classLabel = ticket.classLabel || 'UNKNOWN';
    if (!groups[classLabel]) {
      groups[classLabel] = [];
    }
    groups[classLabel].push(ticket);
    return groups;
  }, {});

  const bookings = [];

  for (const [classLabel, classTickets] of Object.entries(ticketGroups)) {
    const classTotal = classTickets.reduce((sum: number, t: any) => sum + t.price, 0);
    const pricePerSeat = Math.round(classTotal / classTickets.length);

          // Create booking with current schema fields
      const newBooking = await prisma.booking.create({
        data: {
          date: date ? new Date(date) : new Date(timestamp),
          show: show as any,
          screen,
          movie,
          bookedSeats: classTickets.map((t: any) => t.id),
          classLabel: classLabel, // Use 'classLabel' field from current schema
          seatCount: classTickets.length,
          pricePerSeat,
          totalPrice: classTotal,
          synced: false,
        }
      });
      
      // Transform Prisma result to API type
      const bookingData: BookingData = {
        id: newBooking.id,
        date: newBooking.date.toISOString(),
        show: newBooking.show,
        screen: newBooking.screen,
        movie: newBooking.movie,
        movieLanguage: 'HINDI', // Default value
        bookedSeats: newBooking.bookedSeats as string[],
        seatCount: classTickets.length,
        classLabel: newBooking.classLabel,
        pricePerSeat: newBooking.pricePerSeat,
        totalPrice: newBooking.totalPrice,
        status: 'CONFIRMED',
        source: 'LOCAL',
        synced: newBooking.synced,
        customerName,
        customerPhone,
        customerEmail,
        notes,
        totalIncome: 0,
        localIncome: 0,
        bmsIncome: 0,
        vipIncome: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bookedAt: newBooking.bookedAt.toISOString(),
      };
      
      bookings.push(bookingData);
  }

  const response: CreateBookingResponse = {
    success: true, 
    bookings,
    message: `Created ${bookings.length} booking(s) successfully`
  };
  
  res.status(201).json(response);
}));

app.get('/api/bookings', asyncHandler(async (req: Request, res: Response) => {
  const queryParams: BookingQueryParams = req.query as any;
  const { date, show, status } = queryParams;
  
  console.log('🔍 GET /api/bookings called with params:', { date, show, status });
  
  // Build filter conditions
  const where: any = {};
  if (date) {
    // Parse the date and create a range that covers the entire day
    // Use UTC to avoid timezone issues
    const dateObj = new Date(date + 'T00:00:00.000Z');
    const startOfDay = new Date(dateObj);
    const endOfDay = new Date(dateObj);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    
    where.date = {
      gte: startOfDay,
      lt: endOfDay
    };
    console.log('📅 Date filter:', { 
      inputDate: date, 
      startOfDay: startOfDay.toISOString(), 
      endOfDay: endOfDay.toISOString() 
    });
  }
  if (show) where.show = show;
  if (status) where.status = status;
  
  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { bookedAt: 'desc' },
  });
  
  console.log('📊 Found bookings:', bookings.length);
  console.log('📊 Where clause:', JSON.stringify(where, null, 2));
  
  // Transform to API response format
  const bookingData: BookingData[] = bookings.map(booking => ({
    id: booking.id,
    date: booking.date.toISOString(),
    show: booking.show,
    screen: booking.screen,
    movie: booking.movie,
    movieLanguage: 'HINDI',
    bookedSeats: booking.bookedSeats as string[],
    seatCount: (booking.bookedSeats as string[]).length,
            classLabel: booking.classLabel,
    pricePerSeat: booking.pricePerSeat,
    totalPrice: booking.totalPrice,
    status: 'CONFIRMED',
    source: 'LOCAL',
    synced: booking.synced,
    totalIncome: 0,
    localIncome: 0,
    bmsIncome: 0,
    vipIncome: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bookedAt: booking.bookedAt.toISOString(),
  }));
  
  const response: ApiResponse<BookingData[]> = {
    success: true,
    data: bookingData,
  };
  
  console.log('📤 Sending response:', {
    success: response.success,
    dataLength: response.data?.length || 0,
    sampleBooking: response.data?.[0]
  });
  
  res.json(response);
}));

// Health check endpoint
app.get('/api/health', asyncHandler(async (_req: Request, res: Response) => {
  // Test database connection
  await prisma.$queryRaw`SELECT 1`;
  
  const response: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    database: 'connected',
  };
  
  res.json(response);
}));

// Get booking statistics
app.get('/api/bookings/stats', asyncHandler(async (req: Request, res: Response) => {
  const { date, show } = req.query;
  
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
    prisma.booking.count({ where }),
    prisma.booking.aggregate({
      where,
      _sum: { totalPrice: true }
    }),
    prisma.booking.groupBy({
      by: ['classLabel'],
      where,
      _count: { id: true },
      _sum: { totalPrice: true }
    })
  ]);
  
  const response: BookingStatsResponse = {
    success: true,
    data: {
      totalBookings,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      bookingsByClass: bookingsByClass.map(item => ({
        class: item.classLabel,
        count: item._count.id,
        revenue: item._sum.totalPrice || 0
      }))
    }
  };
  
  res.json(response);
}));

// Get seat status for a specific date and show
app.get('/api/seats/status', asyncHandler(async (req: Request, res: Response) => {
  const queryParams: SeatStatusQueryParams = req.query as any;
  const { date, show } = queryParams;
  
  if (!date || !show) {
    throw new ValidationError('Date and show are required');
  }
  
  // Build filter conditions with date range
  const where: any = {};
  if (date) {
    // Parse the date and create a range that covers the entire day
    // Use UTC to avoid timezone issues
    const dateObj = new Date(date + 'T00:00:00.000Z');
    const startOfDay = new Date(dateObj);
    const endOfDay = new Date(dateObj);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    
    where.date = {
      gte: startOfDay,
      lt: endOfDay
    };
  }
  if (show) where.show = show;
  
  const bookings = await prisma.booking.findMany({
    where,
    select: {
      bookedSeats: true,
      classLabel: true
    }
  });
  
  // Extract all booked seats
  const bookedSeats = bookings.flatMap(booking => 
    (booking.bookedSeats as string[]).map(seatId => ({
      seatId,
      class: booking.classLabel
    }))
  );
  
  console.log('📊 Seat status response:', {
    date,
    show,
    bookingsFound: bookings.length,
    totalBookedSeats: bookedSeats.length,
    sampleBookedSeats: bookedSeats.slice(0, 5)
  });
  
  const response: SeatStatusResponse = {
    success: true,
    data: {
      date,
      show,
      bookedSeats,
      totalBooked: bookedSeats.length
    }
  };
  
  res.json(response);
}));

// Update a booking
app.put('/api/bookings/:id', validateBookingData, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  
  console.log('📝 Updating booking:', { id, updateData });
  
  // Validate booking exists
  const existingBooking = await prisma.booking.findUnique({
    where: { id }
  });
  
  if (!existingBooking) {
    throw new NotFoundError(`Booking with ID ${id} not found`);
  }
  
  // Update the booking
  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      movie: updateData.movie,
      movieLanguage: updateData.movieLanguage,
      pricePerSeat: updateData.pricePerSeat,
      totalPrice: updateData.pricePerSeat * existingBooking.seatCount,
      status: updateData.status,
      updatedAt: new Date()
    }
  });
  
  console.log('✅ Booking updated successfully:', { id, updatedBooking });
  
  const response: ApiResponse<BookingData> = {
    success: true,
    data: {
      ...updatedBooking,
      date: updatedBooking.date.toISOString(),
      createdAt: updatedBooking.createdAt.toISOString(),
      updatedAt: updatedBooking.updatedAt.toISOString(),
      bookedAt: updatedBooking.bookedAt.toISOString(),
      bookedSeats: Array.isArray(updatedBooking.bookedSeats) ? (updatedBooking.bookedSeats as string[]) : [],
      customerName: updatedBooking.customerName || undefined,
      customerPhone: updatedBooking.customerPhone || undefined,
      customerEmail: updatedBooking.customerEmail || undefined,
      notes: updatedBooking.notes || undefined,
      totalIncome: updatedBooking.totalIncome || undefined,
      localIncome: updatedBooking.localIncome || undefined,
      bmsIncome: updatedBooking.bmsIncome || undefined,
      vipIncome: updatedBooking.vipIncome || undefined
    },
    message: 'Booking updated successfully'
  };
  
  res.json(response);
}));

// Delete a booking
app.delete('/api/bookings/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  console.log('🗑️ Deleting booking:', { id });
  
  // Validate booking exists
  const existingBooking = await prisma.booking.findUnique({
    where: { id }
  });
  
  if (!existingBooking) {
    throw new NotFoundError(`Booking with ID ${id} not found`);
  }
  
  // Delete the booking
  await prisma.booking.delete({
    where: { id }
  });
  
  console.log('✅ Booking deleted successfully:', { id });
  
  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: 'Booking deleted successfully'
  };
  
  res.json(response);
}));

// Add error handling middleware (must be last)
app.use(errorLogger);
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      code: 404,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    }
  });
});

app.listen(config.server.port, () => {
  console.log(`🚀 Server running at http://localhost:${config.server.port}`);
  console.log(`📊 Environment: ${config.server.nodeEnv}`);
  console.log(`🔗 CORS Origin: ${config.api.corsOrigin}`);
  console.log(`🔧 Error handling: Enabled`);
}); 