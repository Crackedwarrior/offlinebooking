import { TicketPdfGenerator } from '../utils/ticketPdfGenerator';
import { getTheaterConfig } from '../config/theaterConfig';

export interface TicketData {
  theaterName: string;
  location: string;
  date: string;
  film: string;
  class: string;
  row: string;
  seatNumber: string;
  showtime: string;
  netAmount: number;
  cgst: number;
  sgst: number;
  mc: number;
  totalAmount: number;
  transactionId: string;
}

export interface PrinterConfig {
  name: string;
  port: string;
  theaterName: string;
  location: string;
  gstin: string;
  printerType: 'thermal' | 'pdf' | 'backend';
}

export class PrinterService {
  private static instance: PrinterService;
  private printerConfig: PrinterConfig | null = null;

  private constructor() {
    this.loadPrinterConfig();
  }

  public static getInstance(): PrinterService {
    if (!PrinterService.instance) {
      PrinterService.instance = new PrinterService();
    }
    return PrinterService.instance;
  }

  private loadPrinterConfig(): void {
    try {
      const savedConfig = localStorage.getItem('printerConfig');
      if (savedConfig) {
        this.printerConfig = JSON.parse(savedConfig);
        console.log('[PRINT] Printer configuration loaded:', this.printerConfig);
      }
    } catch (error) {
      console.error('[ERROR] Failed to load printer configuration:', error);
    }
  }

  public getPrinterConfig(): PrinterConfig | null {
    return this.printerConfig;
  }

  public setPrinterConfig(config: PrinterConfig): void {
    this.printerConfig = config;
    localStorage.setItem('printerConfig', JSON.stringify(config));
    console.log('[PRINT] Printer configuration saved:', config);
  }

  // Format seat data into TicketData format for printing
  public formatTicketData(
    seatId: string,
    row: string,
    seatNumber: string,
    classLabel: string,
    price: number,
    date: string,
    showtime: string,
    movieName: string
  ): TicketData {
    const config = this.getPrinterConfig();
    const theaterName = config?.theaterName || getTheaterConfig().name;
    const location = config?.location || getTheaterConfig().location;
    
    // Calculate GST components (assuming 18% total GST: 9% CGST + 9% SGST)
    const gstRate = 0.18;
    const cgstRate = 0.09;
    const sgstRate = 0.09;
    
    // Calculate net amount (price before GST)
    const netAmount = price / (1 + gstRate);
    const cgst = netAmount * cgstRate;
    const sgst = netAmount * sgstRate;
    const mc = 0; // Municipal Corporation tax (if any)
    const totalAmount = price;
    
    // Generate transaction ID
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    return {
      theaterName,
      location,
      date,
      film: movieName,
      class: classLabel,
      row,
      seatNumber,
      showtime,
      netAmount,
      cgst,
      sgst,
      mc,
      totalAmount,
      transactionId
    };
  }

  // Generate optimized movie ticket with proper alignment
  private generateCleanTicket(ticket: TicketData): string {
    // Ultra-compact ticket using full 42-character width of TM-T81
    const commands = [
      '\x1B\x40',        // Initialize printer
      '\x1B\x74\x00',    // Set code page to PC437 (Windows-1252)
      '\x1B\x52\x00',    // Select USA character set
      '\x1B\x61\x01',    // Center alignment
      '\x1B\x21\x30',    // Double height and width for header
      `${getTheaterConfig().name}\n`,
      '\x1B\x21\x00',    // Normal size
      `${getTheaterConfig().location}\n`,
      '\x1B\x61\x00',    // Left alignment
      '==========================================\n', // 42 characters
      '\x1B\x21\x10',    // Double height for important info
      `Date: ${ticket.date}  Time: ${ticket.showtime}\n`,
      `Film: ${ticket.film}\n`,
      `Class: ${ticket.class}\n`,
      `Seat: ${ticket.row}-${ticket.seatNumber}\n`,
      '\x1B\x21\x00',    // Normal size
      '==========================================\n', // 42 characters
      '\x1B\x45\x01',    // Bold on for pricing
      `Net: Rs.${ticket.netAmount.toFixed(2)}  CGST: Rs.${ticket.cgst.toFixed(2)}\n`,
      `SGST: Rs.${ticket.sgst.toFixed(2)}  MC: Rs.${ticket.mc.toFixed(2)}\n`,
      '\x1B\x45\x00',    // Bold off
      '==========================================\n', // 42 characters
      '\x1B\x21\x30',    // Double height and width for total
      `TOTAL: Rs.${ticket.totalAmount.toFixed(2)}\n`,
      '\x1B\x21\x00',    // Normal size
      '==========================================\n', // 42 characters
      `ID: ${ticket.transactionId}\n`,
      '\x1B\x61\x01',    // Center alignment
      '\x1B\x21\x10',    // Double height
      'THANK YOU!\n',
      '\x1B\x21\x00',    // Normal size
      `${getTheaterConfig().name}\n`,
      '\x1B\x61\x00',    // Left alignment
      '\x1B\x69'         // Cut paper
    ];
    return commands.join('');
  }

  // Print multiple tickets
  async printTickets(tickets: TicketData[]): Promise<boolean> {
    try {
      console.log('[PRINT] Printing tickets:', tickets.length);
      
      // Always use native desktop printing for desktop app
      return await this.printTicketsNative(tickets);
      
    } catch (error) {
      console.error('[ERROR] Failed to print tickets:', error);
      return false;
    }
  }

  // Print tickets using native desktop printing
  private async printTicketsNative(tickets: TicketData[]): Promise<boolean> {
    try {
      console.log('[PRINT] Using backend printing service for', tickets.length, 'tickets');
      
      // Always use backend printing service for desktop app
      return await this.printToBackendPrinter(tickets);
      
    } catch (error) {
      console.error('[ERROR] Failed to print tickets using backend service:', error);
      return false;
    }
  }

  // Print to backend printer service (supports thermal and PDF)
  private async printToBackendPrinter(tickets: TicketData[]): Promise<boolean> {
    try {
      console.log('[PRINT] Printing via backend service:', tickets.length, 'tickets');
      
      const config = this.getPrinterConfig();
      const printerName = config?.name || 'EPSON TM-T81 Receipt';
      
      // Convert tickets to the format expected by backend
      const backendTickets = tickets.map(ticket => ({
        commands: this.generateCleanTicket(ticket),
        seatId: `${ticket.row}-${ticket.seatNumber}`,
        movieName: ticket.film,
        date: ticket.date,
        showTime: ticket.showtime,
        price: ticket.totalAmount,
        customerName: 'Customer'
      }));
      
      // Send to backend printing service
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/printer/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tickets: backendTickets,
          printerConfig: {
            name: printerName,
            port: config?.port || '',
            theaterName: config?.theaterName || getTheaterConfig().name,
            location: config?.location || getTheaterConfig().location,
            gstin: config?.gstin || ''
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Backend printing failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[PRINT] Printed tickets via backend:', result);
      
      console.log('[PRINT] All tickets printed successfully via backend service');
      return true;
      
    } catch (error) {
      console.error('[ERROR] Failed to print via backend:', error);
      return false;
    }
  }

  // Send to printer (main method)
  async sendToPrinter(tickets: TicketData[]): Promise<boolean> {
    try {
      console.log('[PRINT] Printing tickets:', tickets.length);
      console.log('[PRINT] Ticket data:', tickets);
      
      // Use the backend printing service
      return await this.printTickets(tickets);
      
    } catch (error) {
      console.error('[ERROR] Failed to send to printer:', error);
      return false;
    }
  }
}

export default PrinterService;