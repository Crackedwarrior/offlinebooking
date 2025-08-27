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
  type ApiResponse,
  BookingSource
} from './types/api';
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer';
import { windowsPrintService } from './printService';
import { NativePrintService } from './nativePrint';
import { EscposPrintService } from './escposPrintService';
import ThermalPrintService from './thermalPrintService';
import PdfPrintService from './pdfPrintService';
import KannadaPdfService from './kannadaPdfService';
import PrinterSetup from './printerSetup';
import ticketIdService from './ticketIdService';
import fs from 'fs';
import path from 'path';

// Add ESC/POS imports at the top
import escpos from 'escpos';
escpos.USB = require('escpos-usb');
escpos.Network = require('escpos-network');

// Validate configuration on startup
if (!validateConfig()) {
  process.exit(1);
}

const app = express();
const prisma = new PrismaClient();
const thermalPrintService = new ThermalPrintService();
const pdfPrintService = new PdfPrintService();
const kannadaPdfService = new KannadaPdfService();

// Configure CORS
app.use(cors({
  origin: config.api.corsOrigin,
  credentials: true,
}));

app.use(express.json());

// Add request ID middleware
app.use(requestIdMiddleware);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv
  });
});

// Add printer list endpoint
app.get('/api/printer/list', async (req, res) => {
  try {
    console.log('🔍 Getting list of available printers...');
    
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"', { windowsHide: true });
      
      try {
        const printers = JSON.parse(stdout);
        const printerNames = Array.isArray(printers) 
          ? printers.map((p: any) => p.Name).filter(Boolean)
          : [];
        
        console.log('✅ Found printers:', printerNames);
        res.json({ success: true, printers: printerNames });
        } catch (parseError) {
        console.error('❌ Failed to parse printer list:', parseError);
        res.json({ success: true, printers: [] });
        }
      } else {
      res.json({ success: true, printers: [] });
    }
  } catch (error) {
    console.error('❌ Failed to get printer list:', error);
    res.status(500).json({ success: false, error: 'Failed to get printer list' });
  }
});

// Printer test endpoint
app.post('/api/printer/test', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🖨️ Testing printer connection...');
    const { printerConfig } = req.body;
    
    // Log the printer configuration
    console.log('🖨️ Printer configuration:', printerConfig);
    
    // Actually try to connect to the printer
    // For now we'll simulate success, but in a real implementation
    // this would attempt to establish a connection to the physical printer
    const connected = true;
    
    if (connected) {
      console.log('✅ Printer connection successful');
      res.json({
        success: true,
        message: 'Printer connection test successful',
        timestamp: new Date().toISOString(),
        printerInfo: {
          port: printerConfig?.port || 'COM1',
          status: 'connected',
          ready: true
        }
      });
    } else {
      throw new Error('Could not connect to printer');
    }
  } catch (error) {
    console.error('❌ Printer test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Printer connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Print job status endpoint
app.get('/api/printer/status/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  // Get queue status which includes job information
  const queueStatus = windowsPrintService.getQueueStatus();
  const jobStatus = queueStatus.jobs.find(job => job.id === jobId);
  
  if (!jobStatus) {
    return res.status(404).json({
      success: false,
      error: 'Print job not found'
    });
  }
  
  res.json({
    success: true,
    jobStatus,
    queueStatus
  });
}));

// Print queue status endpoint
app.get('/api/printer/queue', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    queueStatus: windowsPrintService.getQueueStatus()
  });
}));

// Global flag to prevent multiple simultaneous print operations
let isPrinting = false;

// Printer print endpoint
app.post('/api/printer/print', asyncHandler(async (req: Request, res: Response) => {
    const { tickets, printerConfig } = req.body;
    
    console.log('🖨️ Printing tickets:', {
      ticketCount: tickets?.length || 0,
      printerConfig,
      rawBody: req.body
    });
    
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      throw new Error('No tickets provided or invalid tickets format');
    }

  try {
    console.log('🖨️ Using ESC/POS service for thermal printing...');
    
    // Process each ticket
    for (const ticket of tickets) {
      // Create raw ticket data for the service to format
      const ticketData = {
        theaterName: printerConfig.theaterName || 'SREELEKHA THEATER',
        location: printerConfig.location || 'Chickmagalur',
        date: ticket.date || new Date().toLocaleDateString(),
        showTime: ticket.showTime || '2:00 PM',
        movieName: ticket.movieName || 'MOVIE',
        class: ticket.class || 'CLASS',
        seatId: ticket.seatId || 'A1',
        netAmount: ticket.netAmount || 0,
        cgst: ticket.cgst || 0,
        sgst: ticket.sgst || 0,
        mc: ticket.mc || 0,
        price: ticket.price || 0,
        transactionId: ticket.transactionId || 'TXN' + Date.now()
      };
      
      console.log('🖨️ Printing ticket data:', ticketData);
      await EscposPrintService.printSilently(ticketData, printerConfig.name);
    }

    console.log('✅ All tickets printed successfully via ESC/POS');
          res.json({
            success: true,
      message: `${tickets.length} tickets printed successfully`,
            timestamp: new Date().toISOString(),
            printerInfo: {
        name: printerConfig.name,
        status: 'printed',
        method: 'Direct ESC/POS'
      }
    });

  } catch (error) {
    console.error('❌ ESC/POS printing failed:', error);
    res.status(500).json({
      success: false,
      message: 'ESC/POS printing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// ===== THERMAL PRINTER ENDPOINTS =====

// Get all available printers (including thermal)
app.get('/api/thermal-printer/list', asyncHandler(async (req: Request, res: Response) => {
  try {
    const allPrinters = await thermalPrintService.getAllPrinters();
    const thermalPrinters = await thermalPrintService.getThermalPrinters();
    
    res.json({
      success: true,
      allPrinters,
      thermalPrinters,
      recommended: thermalPrinters.length > 0 ? thermalPrinters[0].name : null
    });
  } catch (error) {
    console.error('❌ Error getting thermal printers:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Test thermal printer
app.post('/api/thermal-printer/test', asyncHandler(async (req: Request, res: Response) => {
  const { printerName } = req.body;
  
  if (!printerName) {
    throw new Error('Printer name is required');
  }

  const result = await thermalPrintService.testPrinter(printerName);
  
  if (result.success) {
    res.json({
      success: true,
      message: `Printer test successful for ${printerName}`,
      printer: printerName
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      printer: printerName
    });
  }
}));

// Print ticket using PDF generation (English or Kannada version based on movie settings)
app.post('/api/thermal-printer/print', asyncHandler(async (req: Request, res: Response) => {
  const { ticketData, printerName, movieSettings } = req.body;
  
  if (!ticketData) {
    throw new Error('Ticket data is required');
  }

  // Check if movie should be printed in Kannada
  const shouldPrintInKannada = movieSettings?.printInKannada === true;
  
  console.log(`🖨️ Printing ticket - Language: ${shouldPrintInKannada ? 'Kannada' : 'English'}`);
  console.log(`🎬 Movie settings:`, movieSettings);
  console.log(`🎬 Ticket data:`, ticketData);
  console.log(`🎬 Movie language in ticket data:`, ticketData.movieLanguage);

  // Use appropriate service based on language setting
  const result = shouldPrintInKannada 
    ? await kannadaPdfService.printTicket(ticketData, printerName)
    : await pdfPrintService.printTicket(ticketData, printerName);
  
  if (result.success) {
    res.json({
      success: true,
      message: result.message,
      printer: result.printer
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      printer: result.printer
    });
  }
}));

// Print ticket using old text-based thermal printer (fallback)
app.post('/api/thermal-printer/print-text', asyncHandler(async (req: Request, res: Response) => {
  const { ticketData, printerName } = req.body;
  
  if (!ticketData) {
    throw new Error('Ticket data is required');
  }

  const result = await thermalPrintService.printTicket(ticketData, printerName);
  
  if (result.success) {
    res.json({
      success: true,
      message: result.message,
      printer: result.printer
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      printer: result.printer
    });
  }
}));

// Get printer status
app.get('/api/thermal-printer/status/:printerName', asyncHandler(async (req: Request, res: Response) => {
  const { printerName } = req.params;
  
  const status = await thermalPrintService.getPrinterStatus(printerName);
  
  res.json({
    success: true,
    printer: printerName,
    status
  });
}));

// Preview ticket format
app.post('/api/thermal-printer/preview', asyncHandler(async (req: Request, res: Response) => {
  const { ticketData } = req.body;
  
  if (!ticketData) {
    throw new Error('Ticket data is required');
  }

  const formattedTicket = thermalPrintService.formatTicket(ticketData);
  const previewContent = thermalPrintService.createTicketContent(formattedTicket);
  
  res.json({
    success: true,
    preview: previewContent,
    lines: previewContent.split('\n'),
    characterCount: previewContent.length
  });
}));

// Printer setup endpoints
app.get('/api/printer-setup/list', asyncHandler(async (req: Request, res: Response) => {
  try {
    const printers = await PrinterSetup.listPrinters();
    res.json({ success: true, printers });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}));

app.post('/api/printer-setup/properties', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { printerName } = req.body;
    const result = await PrinterSetup.openPrinterProperties(printerName);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}));

app.post('/api/printer-setup/setup', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { printerName } = req.body;
    const result = await PrinterSetup.setupPrinter(printerName);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}));

app.get('/api/printer-setup/info/:printerName', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { printerName } = req.params;
    const info = await PrinterSetup.getPrinterInfo(printerName);
    res.json({ success: true, info });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}));

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

    // Get source from request or default to LOCAL
    const source = bookingRequest.source || 'LOCAL';
    console.log('📝 Booking source:', source);
    
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
        source: source as BookingSource, // Save the source to the database
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
      source: source as BookingSource,
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
      show: show as any,
      status: 'BMS_BOOKED' // Ensure we only get BMS_BOOKED seats
    },
    select: {
      seatId: true,
      classLabel: true
    }
  });
  
  console.log('🔍 BMS seats found:', {
    date,
    show,
    count: bmsSeats.length,
    seats: bmsSeats.map(seat => ({ id: seat.seatId, class: seat.classLabel }))
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
        console.log(`Creating BMS booking for seat ${seatId} with class ${classLabel}`);
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
            classLabel, // Ensure class label is updated
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

// Ticket ID Management Endpoints
app.get('/api/ticket-id/current', asyncHandler(async (req: Request, res: Response) => {
  const config = ticketIdService.getConfig();
  const currentTicketId = ticketIdService.getCurrentTicketId();
  
  const response: ApiResponse<{ currentId: number; currentTicketId: string; config: any }> = {
    success: true,
    data: {
      currentId: config.currentId,
      currentTicketId,
      config
    },
    message: 'Current ticket ID retrieved successfully'
  };
  
  res.json(response);
}));

app.post('/api/ticket-id/reset', asyncHandler(async (req: Request, res: Response) => {
  const { newId } = req.body;
  
  if (typeof newId !== 'number' || newId < 0) {
    throw new ValidationError('newId must be a positive number');
  }
  
  ticketIdService.resetTicketId(newId);
  const currentTicketId = ticketIdService.getCurrentTicketId();
  
  const response: ApiResponse<{ currentId: number; currentTicketId: string }> = {
    success: true,
    data: {
      currentId: newId,
      currentTicketId
    },
    message: `Ticket ID reset to ${currentTicketId}`
  };
  
  res.json(response);
}));

app.get('/api/ticket-id/next', asyncHandler(async (req: Request, res: Response) => {
  const nextTicketId = ticketIdService.getNextTicketId();
  
  const response: ApiResponse<{ nextTicketId: string }> = {
    success: true,
    data: {
      nextTicketId
    },
    message: 'Next ticket ID generated successfully'
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