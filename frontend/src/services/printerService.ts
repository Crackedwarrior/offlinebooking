// Printer service for Epson TM-T20 M249A POS printer
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
  private printerPort: string = 'COM1'; // Default port, can be configured
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
  configurePrinter(port?: string, theaterName?: string, location?: string, gstin?: string) {
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
    const commands = [
      '\x1B\x40', // Initialize printer
      '\x1B\x61\x01', // Center alignment
      '\x1B\x21\x10', // Double height and width
      `${ticket.theaterName}\n`,
      '\x1B\x21\x00', // Normal size
      `${ticket.location}\n`,
      '\x1B\x61\x00', // Left alignment
      `Date : ${ticket.date}\n`,
      `Film : ${ticket.film}\n`,
      `Class : ${ticket.class}\n`,
      `SHOWTIME: ${ticket.showtime}\n`,
      `Row: ${ticket.row}-Seats: [${ticket.seatNumber}]\n`,
      `[NET:${ticket.netAmount.toFixed(2)}] [CGST:${ticket.cgst.toFixed(2)}] [SGST:${ticket.sgst.toFixed(2)}] [MC:${ticket.mc.toFixed(2)}]\n`,
      `${ticket.date} / ${ticket.showtime} ${ticket.transactionId}\n`,
      '\x1B\x21\x10', // Double height and width
      `Ticket Cost: ${ticket.totalAmount.toFixed(2)}\n`,
      '\x1B\x21\x00', // Normal size
      '\n\n\n', // Feed paper
      '\x1B\x69', // Cut paper
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

  // Send data to printer via backend API
  private async sendToPrinter(commands: string): Promise<void> {
    try {
      console.log('📤 Sending to printer via backend API');
      console.log('📤 Backend URL: http://localhost:3001/api/printer/print');
      console.log('📤 Commands length:', commands.length);
      
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
            port: this.printerPort,
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

  // Test printer connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing printer connection...');
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