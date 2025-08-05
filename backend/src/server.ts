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

  console.log('📝 Creating booking with data:', {
    tickets: tickets.length,
    total,
    show,
    screen,
    movie,
    date,
    seatIds: tickets.map((t: any) => t.id)
  });

  try {
    // Check if a booking with the same seats already exists for this date and show
    // Since bookedSeats is a JSON array, we need to check differently
    const existingBookings = await prisma.booking.findMany({
      where: {
        date: date ? new Date(date) : new Date(timestamp),
        show: show as any,
      }
    });

    // Check if any existing booking has the same seat IDs
    const seatIds = tickets.map((t: any) => t.id);
    const existingBooking = existingBookings.find(booking => {
      const bookingSeats = booking.bookedSeats as string[];
      return bookingSeats.length === seatIds.length && 
             seatIds.every(id => bookingSeats.includes(id));
    });

    if (existingBooking) {
      console.log('⚠️ Booking already exists for these seats:', existingBooking.id);
      
      // Return the existing booking instead of creating a duplicate
      const existingBookingData: BookingData = {
        id: existingBooking.id,
        date: existingBooking.date.toISOString(),
        show: existingBooking.show,
        screen: existingBooking.screen,
        movie: existingBooking.movie,
        movieLanguage: 'HINDI',
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

      const response: CreateBookingResponse = {
        success: true,
        bookings: [existingBookingData],
        message: `Booking already exists for these seats`
      };
      
      return res.status(200).json(response);
    }

    // Create a single booking record instead of multiple class-based bookings
    // This prevents duplicate bookings for the same seats
    const newBooking = await prisma.booking.create({
      data: {
        date: date ? new Date(date) : new Date(timestamp),
        show: show as any,
        screen,
        movie,
        bookedSeats: tickets.map((t: any) => t.id),
        classLabel: tickets[0]?.classLabel || 'MIXED', // Use first ticket's class or 'MIXED' for multiple classes
        seatCount: tickets.length,
        pricePerSeat: Math.round(total / tickets.length),
        totalPrice: total,
        synced: false,
      }
    });
    
    console.log('✅ Booking created successfully:', newBooking.id);
    
    // Transform Prisma result to API type
    const bookingData: BookingData = {
      id: newBooking.id,
      date: newBooking.date.toISOString(),
      show: newBooking.show,
      screen: newBooking.screen,
      movie: newBooking.movie,
      movieLanguage: 'HINDI', // Default value
      bookedSeats: newBooking.bookedSeats as string[],
      seatCount: tickets.length,
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

    const response: CreateBookingResponse = {
      success: true, 
      bookings: [bookingData], // Return single booking in array for compatibility
      message: `Created booking successfully`
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    throw error; // Let the error handler deal with it
  }
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
  
  // Parse the date and create a range that covers the entire day
  // Use UTC to avoid timezone issues
  const dateObj = new Date(date + 'T00:00:00.000Z');
  const startOfDay = new Date(dateObj);
  const endOfDay = new Date(dateObj);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
  
  if (date) {
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
  
  // Get BMS marked seats from the BmsBooking table for this specific date and show
  const bmsSeats = await prisma.bmsBooking.findMany({
    where: {
      date: {
        gte: startOfDay,
        lt: endOfDay
      },
      show: show as any
    },
    select: {
      seatId: true,
      classLabel: true
    }
  });
  
  console.log('📊 Seat status response:', {
    date,
    show,
    bookingsFound: bookings.length,
    totalBookedSeats: bookedSeats.length,
    bmsSeatsFound: bmsSeats.length,
    sampleBookedSeats: bookedSeats.slice(0, 5),
    sampleBmsSeats: bmsSeats.slice(0, 5)
  });
  
  // Get selected seats from in-memory storage
  const storageKey = getStorageKey(date, show);
  const selectedSeats = selectedSeatsStorage.get(storageKey) || new Set();
  const selectedSeatsArray = Array.from(selectedSeats).map(seatId => ({
    seatId,
    class: 'SELECTED' // We don't store class info for selected seats, just mark as selected
  }));
  
  const response: SeatStatusResponse = {
    success: true,
    data: {
      date,
      show,
      bookedSeats,
      bmsSeats: bmsSeats.map(seat => ({
        seatId: seat.seatId,
        class: seat.classLabel
      })),
      selectedSeats: selectedSeatsArray,
      totalBooked: bookedSeats.length,
      totalBms: bmsSeats.length,
      totalSelected: selectedSeatsArray.length
    }
  };
  
  res.json(response);
}));

// Save BMS seat status
app.post('/api/seats/bms', asyncHandler(async (req: Request, res: Response) => {
  const { seatIds, status, date, show } = req.body;
  
  if (!seatIds || !Array.isArray(seatIds)) {
    throw new ValidationError('seatIds array is required');
  }
  
  if (!status || !['BMS_BOOKED', 'AVAILABLE'].includes(status)) {
    throw new ValidationError('status must be BMS_BOOKED or AVAILABLE');
  }
  
  if (!date || !show) {
    throw new ValidationError('date and show are required');
  }
  
  console.log('📝 Saving BMS seat status:', { seatIds, status, date, show });
  
  // Update or create BMS booking records
  const results = await Promise.all(
    seatIds.map(async (seatId: string) => {
      // Determine class label based on seat ID
      let classLabel = 'STAR CLASS'; // default
      if (seatId.startsWith('BOX')) classLabel = 'BOX';
      else if (seatId.startsWith('SC2')) classLabel = 'SECOND CLASS';
      else if (seatId.startsWith('SC')) classLabel = 'STAR CLASS';
      else if (seatId.startsWith('CB')) classLabel = 'CLASSIC';
      else if (seatId.startsWith('FC')) classLabel = 'FIRST CLASS';
      
      if (status === 'BMS_BOOKED') {
        // Create BMS booking record
        return await prisma.bmsBooking.upsert({
          where: { 
            seatId_date_show: {
              seatId,
              date: new Date(date),
              show: show as any
            }
          },
          update: { 
            status: status as any,
            updatedAt: new Date()
          },
          create: {
            seatId,
            date: new Date(date),
            show: show as any,
            classLabel,
            status: status as any
          }
        });
      } else {
        // Remove BMS booking record
        return await prisma.bmsBooking.deleteMany({
          where: {
            seatId,
            date: new Date(date),
            show: show as any
          }
        });
      }
    })
  );
  
  console.log(`✅ Updated ${results.length} BMS bookings to status: ${status}`);
  
  const response = {
    success: true,
    message: `Updated ${results.length} BMS bookings to ${status}`,
    data: results
  };
  
  res.json(response);
}));

// In-memory storage for selected seats (temporary solution)
const selectedSeatsStorage = new Map<string, Set<string>>();

// Helper function to get storage key
const getStorageKey = (date: string, show: string) => `${date}-${show}`;

// Update seat status (for move operations)
app.post('/api/seats/status', asyncHandler(async (req: Request, res: Response) => {
  const { seatUpdates, date, show } = req.body;
  
  if (!seatUpdates || !Array.isArray(seatUpdates)) {
    throw new ValidationError('seatUpdates array is required');
  }
  
  if (!date || !show) {
    throw new ValidationError('date and show are required');
  }
  
  console.log('📝 Updating seat status:', { seatUpdates, date, show });
  
  const storageKey = getStorageKey(date, show);
  if (!selectedSeatsStorage.has(storageKey)) {
    selectedSeatsStorage.set(storageKey, new Set());
  }
  const selectedSeats = selectedSeatsStorage.get(storageKey)!;
  
  // Process each seat update
  const results = await Promise.all(
    seatUpdates.map(async (update: { seatId: string; status: string }) => {
      const { seatId, status } = update;
      
      if (!['AVAILABLE', 'SELECTED', 'BOOKED', 'BLOCKED'].includes(status)) {
        throw new ValidationError(`Invalid status: ${status}`);
      }
      
      // Update in-memory storage
      if (status === 'SELECTED') {
        selectedSeats.add(seatId);
      } else {
        selectedSeats.delete(seatId);
      }
      
      console.log(`🔄 Seat ${seatId} status updated to ${status} for ${date} ${show}`);
      
      return { seatId, status, success: true };
    })
  );
  
  console.log(`✅ Updated ${results.length} seat statuses. Current selected seats for ${storageKey}:`, Array.from(selectedSeats));
  
  const response = {
    success: true,
    message: `Updated ${results.length} seat statuses`,
    data: results
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