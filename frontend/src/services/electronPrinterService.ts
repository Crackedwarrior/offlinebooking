// Electron Printer Service
// Handles printer operations in Electron environment

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
        return await (window as any).electronAPI.getPrinters();
      } else {
        // Fallback for web environment
        return ['Test Printer 1', 'Test Printer 2', 'Epson TM-T81'];
      }
    } catch (error) {
      console.error('Failed to get printers:', error);
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
      console.error('Failed to get USB printers:', error);
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
      theaterName: ticketData.theaterName || 'SREELEKHA THEATER',
      location: ticketData.location || 'Chickmagalur',
      date: ticketData.date,
      showTime: ticketData.showTime,
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
      console.log('🖨️ Printing ticket via Electron:', ticketData);
      console.log('🖨️ Printer:', printerName);

      // Check if running in Electron
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const result = await (window as any).electronAPI.printTicket(ticketData, printerName);
        return result.success;
      } else {
        // Fallback for web environment
        console.log('🖨️ Would print ticket in desktop environment:', ticketData);
        return true; // Simulate success
      }
    } catch (error) {
      console.error('❌ Failed to print ticket:', error);
      return false;
    }
  }

  /**
   * Test printer connection
   */
  async testPrinter(printerName: string): Promise<boolean> {
    try {
      const testTicket: TicketData = {
        theaterName: this.config?.theaterName || 'SREELEKHA THEATER',
        location: this.config?.location || 'Chickmagalur',
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
      console.error('❌ Printer test failed:', error);
      return false;
    }
  }
}

export default ElectronPrinterService;
