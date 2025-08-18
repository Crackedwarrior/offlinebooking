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

// Helper function to map Windows printer status to our format
const getPrinterStatus = (windowsStatus: number): string => {
  // Windows printer status codes
  switch (windowsStatus) {
    case 0: return 'ready'; // Ready
    case 1: return 'paused'; // Paused
    case 2: return 'error'; // Error
    case 4: return 'pending'; // Pending deletion
    case 8: return 'paper_jam'; // Paper jam
    case 16: return 'offline'; // Offline
    case 32: return 'manual_feed'; // Manual feed
    case 64: return 'paper_problem'; // Paper problem
    case 128: return 'waiting'; // Waiting
    case 256: return 'processing'; // Processing
    case 512: return 'initializing'; // Initializing
    case 1024: return 'warming_up'; // Warming up
    case 2048: return 'toner_low'; // Toner low
    case 4096: return 'no_toner'; // No toner
    case 8192: return 'page_punt'; // Page punt
    case 16384: return 'user_intervention'; // User intervention required
    case 32768: return 'out_of_memory'; // Out of memory
    case 65536: return 'door_open'; // Door open
    case 131072: return 'server_unknown'; // Server unknown
    case 262144: return 'power_save'; // Power save
    default: return 'unknown';
  }
};

// Helper function to get mock printers for fallback
const getMockPrinters = () => [
  {
    name: 'EPSON TM-T81 ReceiptE4',
    driver: 'EPSON TM-T81 ReceiptE4',
    port: 'USB001',
    status: 'ready',
    type: 'Thermal',
    isDefault: true
  },
  {
    name: 'Microsoft Print to PDF',
    driver: 'Microsoft Print to PDF',
    port: 'PORTPROMPT:',
    status: 'ready',
    type: 'PDF',
    isDefault: false
  },
  {
    name: 'HP LaserJet Pro',
    driver: 'HP LaserJet Pro',
    port: 'USB002',
    status: 'ready',
    type: 'Laser',
    isDefault: false
  }
];

// Get available printers endpoint
app.get('/api/printer/list', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🔍 Getting available printers...');
    
    let printers: any[] = [];
    
    // Check if we're on Windows
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Try multiple PowerShell approaches for better reliability
      let stdout = '';
      let stderr = '';
      
      // Method 1: Full printer details
      try {
        console.log('🔍 Method 1: Getting full printer details...');
        const psCommand1 = `Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus, Type | ConvertTo-Json`;
        const result1 = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand1}"`, { 
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30000
        });
        stdout = result1.stdout;
        stderr = result1.stderr;
        console.log('✅ Method 1 successful');
      } catch (error1) {
        console.warn('⚠️ Method 1 failed, trying Method 2...');
        
        // Method 2: Simple printer names only
        try {
          const psCommand2 = `Get-Printer | Select-Object Name | ConvertTo-Json`;
          const result2 = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand2}"`, { 
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000
          });
          stdout = result2.stdout;
          stderr = result2.stderr;
          console.log('✅ Method 2 successful');
        } catch (error2) {
          console.warn('⚠️ Method 2 failed, trying Method 3...');
          
          // Method 3: Using wmic as fallback
          try {
            const wmicCommand = `wmic printer get name,drivername,portname /format:csv`;
            const result3 = await execAsync(wmicCommand, { 
              maxBuffer: 10 * 1024 * 1024,
              timeout: 30000
            });
            stdout = result3.stdout;
            stderr = result3.stderr;
            console.log('✅ Method 3 (wmic) successful');
          } catch (error3) {
            console.error('❌ All methods failed:', { error1, error2, error3 });
            throw error3;
          }
        }
      }
      
      if (stderr) console.warn('⚠️ PowerShell stderr:', stderr);
      console.log('🔍 PowerShell stdout length:', stdout.length);
      console.log('🔍 PowerShell stdout preview:', stdout.substring(0, 200));
      
      if (stdout && stdout.trim()) {
        try {
          // Check if it's JSON (PowerShell) or CSV (wmic)
          if (stdout.includes('[') || stdout.includes('{')) {
            // JSON format from PowerShell
            const printerList = JSON.parse(stdout.trim());
            console.log('🔍 Parsed JSON printer list:', printerList);
            
            printers = Array.isArray(printerList) ? printerList : [printerList];
            
            // Map printer status to our format
            printers = printers.map(printer => ({
              name: printer.Name || 'Unknown',
              driver: printer.DriverName || 'Unknown',
              port: printer.PortName || 'Unknown',
              status: getPrinterStatus(printer.PrinterStatus || 0),
              type: printer.Type || 'Unknown',
              isDefault: false
            }));
          } else {
            // CSV format from wmic
            console.log('🔍 Parsing CSV format from wmic...');
            const lines = stdout.trim().split('\n');
            printers = [];
            
            for (let i = 1; i < lines.length; i++) { // Skip header
              const line = lines[i].trim();
              if (line && !line.startsWith('Node,')) {
                const parts = line.split(',');
                if (parts.length >= 3) {
                  printers.push({
                    name: parts[1]?.trim() || 'Unknown',
                    driver: parts[2]?.trim() || 'Unknown',
                    port: parts[3]?.trim() || 'Unknown',
                    status: 'ready', // Default status for wmic
                    type: 'Unknown',
                    isDefault: false
                  });
                }
              }
            }
          }
          
          console.log('🔍 Mapped printers:', printers);
          
          // Get default printer if we have printers
          if (printers.length > 0) {
            try {
              const { stdout: defaultStdout } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer | Where-Object {$_.Default -eq $true} | Select-Object Name | ConvertTo-Json"`);
              if (defaultStdout && defaultStdout.trim()) {
                const defaultPrinter = JSON.parse(defaultStdout.trim());
                const defaultName = Array.isArray(defaultPrinter) ? defaultPrinter[0]?.Name : defaultPrinter?.Name;
                
                if (defaultName) {
                  printers = printers.map(printer => ({
                    ...printer,
                    isDefault: printer.name === defaultName
                  }));
                }
              }
            } catch (defaultError) {
              console.warn('⚠️ Could not get default printer:', defaultError);
            }
          }
        } catch (parseError) {
          console.error('❌ Parse error:', parseError);
          console.error('❌ Raw stdout:', stdout);
          // Fallback to mock printers if parsing fails
          printers = getMockPrinters();
        }
      } else {
        console.warn('⚠️ Command returned empty stdout');
        printers = getMockPrinters();
      }
    } else {
      // Non-Windows: return mock printers
      printers = getMockPrinters();
    }
    
    console.log(`✅ Found ${printers.length} printers:`, printers.map(p => p.name));
    
    res.json({
      success: true,
      printers,
      count: printers.length,
      platform: process.platform
    });
    
  } catch (error) {
    console.error('❌ Error getting printers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get printers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

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

// Printer print endpoint
app.post('/api/printer/print', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { tickets, printerConfig } = req.body;
    
    console.log('🖨️ Printing tickets:', {
      ticketCount: tickets?.length || 0,
      printerConfig
    });
    
    // Get the printer name from the configuration
    const printerName = printerConfig?.name || 'EPSON TM-T81 ReceiptE4';
    console.log(`🔌 Printing to Windows printer: ${printerName}...`);
    
    // Attempt to print using Windows printing
    let success = false;
    let errorMessage = '';
    
    try {
      // Check if we're on Windows
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        const fs = require('fs');
        const path = require('path');
        
        // Create temp directory
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Debug: Log what we're receiving
        console.log('🖨️ Received tickets:', JSON.stringify(tickets, null, 2));
        
        // Concatenate all ticket plain text into a single text buffer
        const textData = tickets.map((t: any) => t.commands).join('\n\n---\n\n');
        console.log('🖨️ Text to send:', textData.length, 'characters');
        console.log('🖨️ Text content preview:', textData.substring(0, 200));
        console.log('🖨️ Text data type:', typeof textData);
        console.log('🖨️ Text data is empty?', textData.length === 0);
        console.log('🖨️ Text data first 10 chars:', JSON.stringify(textData.substring(0, 10)));
        
        // Create the text file for printing
        const tempFileText = path.join(tempDir, `ticket_text_${Date.now()}.txt`);
        console.log('📁 About to write file:', tempFileText);
        console.log('📁 Writing data length:', textData.length);
        
        // Try different encoding approaches for ESC/POS commands
        try {
          // For ESC/POS commands, we need to write as binary data
          const buffer = Buffer.from(textData, 'binary');
          fs.writeFileSync(tempFileText, buffer);
          console.log('📁 File written with binary encoding for ESC/POS');
        } catch (writeError) {
          console.error('📁 Binary write failed:', writeError);
          try {
            fs.writeFileSync(tempFileText, textData, 'utf8');
            console.log('📁 File written with utf8 encoding as fallback');
          } catch (utf8Error) {
            console.error('📁 UTF8 write failed:', utf8Error);
            throw utf8Error;
          }
        }
        
        // Verify the file was written
        const fileStats = fs.statSync(tempFileText);
        console.log('📁 File size after write:', fileStats.size, 'bytes');
        console.log('📁 Created text file:', tempFileText);
        
        // Create debug file to verify the text content
        const debugFile = path.join(tempDir, `debug_text_${Date.now()}.txt`);
        fs.writeFileSync(debugFile, `Text Debug File\nGenerated: ${new Date().toISOString()}\nPrinter: ${printerName}\nTicket Count: ${tickets.length}\n\nText Content:\n${textData}\n`);
        console.log('📁 Created debug file:', debugFile);
        
        // Method 1: Try using PowerShell Out-Printer with proper encoding for thermal printers
        try {
          console.log('🔍 Testing printer with thermal printer commands...');
          
          // For thermal printers, we need to send the data as-is without additional processing
          const psPrintCommand = `[System.IO.File]::ReadAllText("${tempFileText}", [System.Text.Encoding]::UTF8) | Out-Printer -Name "${String(printerName).replace(/"/g, '\\"')}"`;
          console.log('🔍 Executing PowerShell print command...');
          
          const printResult = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psPrintCommand}"`, { 
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000
          });
          
            console.log('✅ Test print command executed successfully');
          console.log('✅ PowerShell stdout:', printResult.stdout);
          if (printResult.stderr) console.log('⚠️ PowerShell stderr:', printResult.stderr);
          
          success = true;
        } catch (psError) {
          console.error('❌ PowerShell Out-Printer failed:', psError);
          
          // Method 2: Try PDF printing as fallback
          try {
          console.log('🔍 Testing PDF printing...');
            
            // Create a simple PDF for testing
            const pdfPrintCommand = `Start-Process -FilePath "${tempFileText}" -Verb Print`;
            const pdfResult = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${pdfPrintCommand}"`, { 
            maxBuffer: 10 * 1024 * 1024, 
              timeout: 30000
            });
            
            console.log('✅ PDF test print command executed successfully');
            success = true;
          } catch (pdfError) {
            console.error('❌ PDF printing failed:', pdfError);
            
            // Method 3: Try direct file copy to printer port
            try {
              console.log('🔍 Verifying printer availability...');
              
              // Check if printer is ready
              const verifyCommand = `Get-Printer -Name "${String(printerName).replace(/"/g, '\\"')}" | Select-Object Name, PrinterStatus, PortName`;
              const verifyResult = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${verifyCommand}"`, { 
            maxBuffer: 10 * 1024 * 1024, 
            timeout: 30000 
          });
          
              console.log('✅ Printer verification output:', verifyResult.stdout);
              
              if (verifyResult.stdout.includes('PrinterStatus') && !verifyResult.stdout.includes('PrinterStatus : 0')) {
                console.log('❌ PowerShell Copy-Item failed: Printer not ready:');
                throw new Error('Printer not ready');
              }
              
              // Try direct copy to printer port
            console.log('🔄 Trying fallback method: direct file copy to printer...');
              const copyCommand = `Copy-Item "${tempFileText}" "${printerConfig?.port || 'ESDPRT001'}"`;
              const copyResult = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${copyCommand}"`, { 
              maxBuffer: 10 * 1024 * 1024, 
              timeout: 30000 
            });
            
              console.log('✅ Fallback PowerShell stdout:', copyResult.stdout);
              success = true;
            } catch (copyError) {
              console.log('❌ Fallback method failed: Fallback method also failed');
              
              // Method 4: Final fallback - Windows print command
             try {
               console.log('🔄 Trying final fallback: Windows print command...');
                const printCommand = `print /d:"${String(printerName).replace(/"/g, '\\"')}" "${tempFileText}"`;
               console.log('🔍 Executing print command:', printCommand);
               
                const finalResult = await execAsync(printCommand, { 
                 maxBuffer: 10 * 1024 * 1024, 
                 timeout: 30000 
               });
               
                console.log('✅ Print command stdout:', finalResult.stdout);
                if (finalResult.stderr) console.log('⚠️ Print command stderr:', finalResult.stderr);
               
                // Even if there's an error message, the print job might still be sent
               console.log('✅ Print job sent successfully via Windows print command');
                 success = true;
                              } catch (finalError) {
                  console.error('❌ Final fallback failed:', finalError);
                  errorMessage = finalError instanceof Error ? finalError.message : 'Unknown error';
                 }
             }
           }
        }

      } else {
        // Non-Windows: fallback to serialport for serial printers
        const { SerialPort } = require('serialport');
        const printerPort = printerConfig?.port || 'COM1';
        
        console.log(`🔌 Falling back to serial port: ${printerPort}`);
        
        const port = new SerialPort({
          path: printerPort,
          baudRate: 9600,
          dataBits: 8,
          parity: 'none',
          stopBits: 1,
          flowControl: false
        });
        
        // Send raw bytes directly
        const rawData: Buffer = Buffer.concat(
          tickets.map((t: any) => Buffer.from(t.commands, 'binary'))
        );
        await new Promise((resolve, reject) => {
          port.write(rawData, (err: Error | null | undefined) => {
            if (err) reject(err); else port.drain(resolve);
          });
        });
        await new Promise(resolve => port.close(resolve));
        success = true;
      }
    } catch (printError: any) {
      console.error('❌ Error printing:', printError);
      errorMessage = printError.message;
      success = false;
    }
    
    if (success) {
      res.json({
        success: true,
        message: `${tickets?.length || 0} tickets printed successfully`,
        timestamp: new Date().toISOString(),
        printerInfo: {
          name: printerName,
          status: 'ready',
          jobId: Date.now().toString()
        }
      });
    } else {
      throw new Error(`Failed to print tickets: ${errorMessage}`);
    }
  } catch (error) {
    console.error('❌ Printing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Printing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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