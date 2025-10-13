// Electron Printer Service
// Handles printer operations in Electron environment

import { getTheaterConfig } from '../config/theaterConfig';

export interface PrinterConfig {
  name: string;
  theaterName: string;
  location: string;
  gstin?: string;
}

export interface TicketData {
  theaterName: string;
  location: string;
  date: string;
  showTime: string;
  showKey: string;
  movieName: string;
  movieLanguage: string;
  classLabel: string;
  row: string;
  seatRange: string;
  seatCount: number;
  individualPrice: number;
  totalPrice: number;
  isDecoupled: boolean;
  seatIds: string[];
  transactionId: string;
}

export class ElectronPrinterService {
  private static instance: ElectronPrinterService;
  private config: PrinterConfig | null = null;

  private constructor() {}

  static getInstance(): ElectronPrinterService {
    if (!ElectronPrinterService.instance) {
      ElectronPrinterService.instance = new ElectronPrinterService();
    }
    return ElectronPrinterService.instance;
  }

  /**
   * Get all available printers
   */
  async getAllPrinters(): Promise<string[]> {
    try {
      // Check if running in Electron
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const printers = await (window as any).electronAPI.getPrinters();
        console.log('[PRINT] Real printers fetched:', printers);
        return printers;
      } else {
        // Fallback for web environment - return empty array instead of hardcoded data
        console.log('[WARN] Running in web environment, no real printers available');
        return [];
      }
    } catch (error) {
      console.error('[ERROR] Failed to get printers:', error);
      return [];
    }
  }

  /**
   * Get USB printers only
   */
  async getUsbPrinters(): Promise<string[]> {
    try {
      const allPrinters = await this.getAllPrinters();
      // Filter for USB printers (this is a simple filter, you might need more sophisticated logic)
      return allPrinters.filter(printer => 
        printer.toLowerCase().includes('usb') || 
        printer.toLowerCase().includes('epson') ||
        printer.toLowerCase().includes('thermal')
      );
    } catch (error) {
      console.error('[ERROR] Failed to get USB printers:', error);
      return [];
    }
  }

  /**
   * Set printer configuration
   */
  setPrinterConfig(config: PrinterConfig): void {
    this.config = config;
  }

  /**
   * Get printer configuration
   */
  getPrinterConfig(): PrinterConfig | null {
    return this.config;
  }

  /**
   * Format ticket data for thermal printer
   */
  formatTicketForThermal(ticketData: any): TicketData {
    return {
      theaterName: ticketData.theaterName || getTheaterConfig().name,
      location: ticketData.location || getTheaterConfig().location,
      date: ticketData.date,
      showTime: ticketData.showTime,
      showKey: ticketData.showKey,
      movieName: ticketData.movieName,
      movieLanguage: ticketData.movieLanguage || 'Kannada',
      classLabel: ticketData.classLabel,
      row: ticketData.row,
      seatRange: ticketData.seatRange,
      seatCount: ticketData.seatCount,
      individualPrice: ticketData.individualPrice,
      totalPrice: ticketData.totalPrice,
      isDecoupled: ticketData.isDecoupled || false,
      seatIds: ticketData.seatIds || [],
      transactionId: ticketData.transactionId
    };
  }

  /**
   * Print a ticket
   */
  async printTicket(ticketData: TicketData, printerName: string, movieData?: any): Promise<boolean> {
    try {
      console.log('[PRINT] Printing ticket via Electron:', ticketData);
      console.log('[PRINT] Printer:', printerName);
      
      // 🚀 FRONTEND DEBUG: Log which service will be used based on movie data
      if (movieData && movieData.printInKannada) {
        console.log('[PRINT] FRONTEND DEBUG: Movie is set to print in Kannada');
        console.log('[PRINT] FRONTEND DEBUG: Backend will use FastKannadaPrintService (wkhtmltopdf)');
        console.log('[PRINT] FRONTEND DEBUG: This should be 3-5x faster than the old Puppeteer method');
      } else {
        console.log('[PRINT] FRONTEND DEBUG: Movie is set to print in English');
        console.log('[PRINT] FRONTEND DEBUG: Backend will use PdfPrintService (PDFKit)');
      }
      
      console.log('[PRINT] FRONTEND DEBUG: Movie data being sent:', movieData);

      // Check if running in Electron
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const result = await (window as any).electronAPI.printTicket(ticketData, printerName, movieData);
        return result.success;
      } else {
        // Fallback for web environment
        console.log('[PRINT] Would print ticket in desktop environment:', ticketData);
        return true; // Simulate success
      }
    } catch (error) {
      console.error('[ERROR] Failed to print ticket:', error);
      return false;
    }
  }

  /**
   * Test printer connection
   */
  async testPrinter(printerName: string): Promise<boolean> {
    try {
      const testTicket: TicketData = {
        theaterName: this.config?.theaterName || getTheaterConfig().name,
        location: this.config?.location || getTheaterConfig().location,
        date: new Date().toLocaleDateString(),
        showTime: '2:00 PM',
        movieName: 'TEST MOVIE',
        movieLanguage: 'Kannada',
        classLabel: 'TEST CLASS',
        row: 'A',
        seatRange: '1',
        seatCount: 1,
        individualPrice: 100,
        totalPrice: 100,
        isDecoupled: false,
        seatIds: ['TEST1'],
        transactionId: 'TEST123'
      };

      return await this.printTicket(testTicket, printerName);
    } catch (error) {
      console.error('[ERROR] Printer test failed:', error);
      return false;
    }
  }
}

export default ElectronPrinterService;
