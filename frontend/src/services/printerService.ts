// Printer service for Epson TM-T20 M249A POS printer
// We'll use dynamic imports for Tauri to handle environments where it might not be available
export interface TicketData {
  theaterName: string;
  location: string;
  date: string;
  film: string;
  class: string;
  showtime: string;
  row: string;
  seatNumber: string;
  netAmount: number;
  cgst: number;
  sgst: number;
  mc: number;
  totalAmount: number;
  transactionId: string;
  gstin: string;
}

export interface PrintJob {
  tickets: TicketData[];
  timestamp: string;
}

export class PrinterService {
  private static instance: PrinterService;
  private printerName: string = 'EPSON TM-T81 ReceiptE4'; // Default printer name for Windows
  private printerPort: string = 'COM1'; // Fallback port for serial printers
  private theaterName: string = 'SREELEKHA THEATER';
  private location: string = 'Chickmagalur';
  private gstin: string = '29AAVFS7423E120';

  private constructor() {}

  static getInstance(): PrinterService {
    if (!PrinterService.instance) {
      PrinterService.instance = new PrinterService();
    }
    return PrinterService.instance;
  }

  // Configure printer settings
  configurePrinter(printerName?: string, port?: string, theaterName?: string, location?: string, gstin?: string) {
    if (printerName) this.printerName = printerName;
    if (port) this.printerPort = port;
    if (theaterName) this.theaterName = theaterName;
    if (location) this.location = location;
    if (gstin) this.gstin = gstin;
  }

  // Calculate GST and other charges
  private calculateCharges(amount: number) {
    const netAmount = Math.round(amount / 1.18); // Assuming 18% GST
    const gstAmount = amount - netAmount;
    const cgst = Math.round(gstAmount / 2);
    const sgst = gstAmount - cgst;
    const mc = 2; // Municipal Corporation charge
    
    return {
      netAmount,
      cgst,
      sgst,
      mc,
      totalAmount: amount
    };
  }

  // Generate transaction ID
  private generateTransactionId(): string {
    const now = new Date();
    const dateStr = now.getFullYear().toString().slice(-2) + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `${dateStr}${timeStr}CSH ${random}0001/001`;
  }

  // Format ticket data for printing
  formatTicketData(
    seatId: string,
    row: string,
    seatNumber: number,
    classLabel: string,
    price: number,
    date: string,
    showtime: string,
    movieName: string
  ): TicketData {
    const charges = this.calculateCharges(price);
    const transactionId = this.generateTransactionId();
    
    return {
      theaterName: this.theaterName,
      location: this.location,
      date: new Date(date).toLocaleDateString('en-GB'), // DD/MM/YYYY format
      film: movieName,
      class: classLabel,
      showtime: showtime,
      row: row,
      seatNumber: seatNumber.toString(),
      netAmount: charges.netAmount,
      cgst: charges.cgst,
      sgst: charges.sgst,
      mc: charges.mc,
      totalAmount: charges.totalAmount,
      transactionId,
      gstin: this.gstin
    };
  }

  // Generate ESC/POS commands for the ticket
  private generateEscPosCommands(ticket: TicketData): string {
    // Epson TM-T81 on 80mm typically supports ~42 columns with Font A
    const maxCols = 42;
    const wrap = (text: string): string => {
      const lines: string[] = [];
      let i = 0;
      while (i < text.length) {
        lines.push(text.slice(i, i + maxCols));
        i += maxCols;
      }
      return lines.join('\n');
    };

    const center = (text: string): string => {
      if (text.length >= maxCols) return text;
      const pad = Math.floor((maxCols - text.length) / 2);
      return ' '.repeat(pad) + text;
    };

    const commands = [
      '\x1B\x40', // Initialize printer
      '\x1B\x74\x00', // Set code page (PC437) for stable ASCII
      '\x1B\x52\x00', // Select USA character set

      // Header
      '\x1B\x61\x01', // Center alignment
      '\x1D\x21\x01', // Double height (not width) for title
      `${center(ticket.theaterName)}` + '\n',
      '\x1D\x21\x00', // Normal size
      `${center(ticket.location)}` + '\n',

      // Body
      '\x1B\x61\x00', // Left alignment
      `${wrap(`Date : ${ticket.date}`)}\n`,
      `${wrap(`Film : ${ticket.film}`)}\n`,
      `${wrap(`Class : ${ticket.class}`)}\n`,
      `${wrap(`SHOWTIME: ${ticket.showtime}`)}\n`,
      `${wrap(`Row: ${ticket.row}-Seats: [${ticket.seatNumber}]`)}\n`,
      `${wrap(`[NET:${ticket.netAmount.toFixed(2)}] [CGST:${ticket.cgst.toFixed(2)}] [SGST:${ticket.sgst.toFixed(2)}] [MC:${ticket.mc.toFixed(2)}]`)}\n`,
      `${wrap(`${ticket.date} / ${ticket.showtime} ${ticket.transactionId}`)}\n`,

      // Price emphasized but still safe width
      '\x1B\x61\x01',
      '\x1D\x21\x01', // Double height
      `${center(`Ticket Cost: ${ticket.totalAmount.toFixed(2)}`)}\n`,
      '\x1D\x21\x00',
      '\x1B\x61\x00',

      '\n\n', // Feed a bit
      '\x1D\x56\x00' // Full cut
    ];

    return commands.join('');
  }

  // Print a single ticket
  async printTicket(ticket: TicketData): Promise<boolean> {
    try {
      console.log('🖨️ Printing ticket:', ticket);
      
      // In a real implementation, this would send ESC/POS commands to the printer
      // For now, we'll simulate the printing process
      const escPosCommands = this.generateEscPosCommands(ticket);
      
      // Simulate printer communication
      await this.sendToPrinter(escPosCommands);
      
      console.log('✅ Ticket printed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to print ticket:', error);
      return false;
    }
  }

  // Print multiple tickets
  async printTickets(tickets: TicketData[]): Promise<boolean> {
    try {
      console.log(`🖨️ Printing ${tickets.length} tickets`);
      console.log('🖨️ Ticket data:', tickets);
      
      for (const ticket of tickets) {
        console.log('🖨️ Printing individual ticket:', ticket);
        const success = await this.printTicket(ticket);
        if (!success) {
          console.error('❌ Failed to print ticket:', ticket);
          return false;
        }
        
        // Small delay between tickets
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('✅ All tickets printed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to print tickets:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return false;
    }
  }

  // Send data to printer via backend API or Tauri commands
  private async sendToPrinter(commands: string): Promise<void> {
    try {
      console.log('📤 Sending to printer');
      console.log('📤 Commands length:', commands.length);
      
      // Check if we're running in Tauri - FIX: More robust detection
      const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
      
      if (isTauri) {
        console.log('📤 Using Tauri API for printing');
        try {
          // Use Tauri command to print
          // Access the Tauri API through the window object
          if (window.__TAURI__ && window.__TAURI__.invoke) {
            const result = await window.__TAURI__.invoke('print_ticket', { 
              port: this.printerPort,
              commands: commands
            });
            console.log('✅ Tauri printer response:', result);
          } else {
            throw new Error('Tauri API not available');
          }
        } catch (tauriError) {
          console.error('❌ Tauri printing failed, falling back to backend API:', tauriError);
          // Fall back to backend API
          await this.sendToPrinterViaBackend(commands);
        }
      } else {
        console.log('📤 Using backend API for printing');
        // Use backend API
        await this.sendToPrinterViaBackend(commands);
      }
    } catch (error) {
      console.error('❌ Printer communication failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw new Error(`Printer communication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Send data to printer via backend API
  private async sendToPrinterViaBackend(commands: string): Promise<void> {
    console.log('📤 Sending to printer via backend API');
    console.log('📤 Backend URL: http://localhost:3001/api/printer/print');
    
    // Send print request to backend
    const response = await fetch('http://localhost:3001/api/printer/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tickets: [{
          commands: commands,
          timestamp: new Date().toISOString()
        }],
        printerConfig: {
          name: this.printerName, // Send printer name for Windows printing
          port: this.printerPort, // Keep port as fallback for serial printers
          theaterName: this.theaterName,
          location: this.location,
          gstin: this.gstin
        }
      })
    });

    console.log('📤 Response status:', response.status);
    console.log('📤 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📤 Error response text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Printer response:', result);
  }

  // Test printer connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing printer connection...');
      
      // Check if we're running in Tauri
      const isTauri = window.__TAURI__ !== undefined;
      
      if (isTauri) {
        console.log('🔍 Using Tauri API for printer connection test');
        try {
          // Use Tauri command to test printer connection
          // Access the Tauri API through the window object
          if (window.__TAURI__ && window.__TAURI__.invoke) {
            const result = await window.__TAURI__.invoke('test_printer_connection', { port: this.printerPort });
            console.log('✅ Tauri printer connection test result:', result);
            return true;
          } else {
            throw new Error('Tauri API not available');
          }
        } catch (tauriError) {
          console.error('❌ Tauri printer test failed, falling back to backend API:', tauriError);
          // Fall back to backend API
          return await this.testConnectionViaBackend();
        }
      } else {
        console.log('🔍 Using backend API for printer connection test');
        // Use backend API
        return await this.testConnectionViaBackend();
      }
    } catch (error) {
      console.error('❌ Printer connection test failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return false;
    }
  }
  
  // Test printer connection via backend API
  private async testConnectionViaBackend(): Promise<boolean> {
    console.log('🔍 Testing printer connection via backend API');
    console.log('🔍 Backend URL: http://localhost:3001/api/printer/test');
    
    // Send test request to backend
    const response = await fetch('http://localhost:3001/api/printer/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        printerConfig: {
          port: this.printerPort,
          theaterName: this.theaterName,
          location: this.location,
          gstin: this.gstin
        }
      })
    });

    console.log('🔍 Response status:', response.status);
    console.log('🔍 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 Error response text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Printer connection test successful:', result);
    return true;
  }

  // Get printer status
  async getPrinterStatus(): Promise<{
    connected: boolean;
    ready: boolean;
    paperStatus: string;
    errorStatus: string;
  }> {
    try {
      // In a real implementation, this would query the printer status
      // For now, return simulated status
      return {
        connected: true,
        ready: true,
        paperStatus: 'OK',
        errorStatus: 'No Error'
      };
    } catch (error) {
      console.error('❌ Failed to get printer status:', error);
      return {
        connected: false,
        ready: false,
        paperStatus: 'Unknown',
        errorStatus: 'Connection Failed'
      };
    }
  }
}

export default PrinterService.getInstance();