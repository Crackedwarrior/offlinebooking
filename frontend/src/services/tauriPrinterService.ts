// Try to import Tauri API, use real commands in both dev and production
let invoke: any;
let isTauriAvailable = false;

try {
  const tauriModule = require('@tauri-apps/api/tauri');
  invoke = tauriModule.invoke;
  isTauriAvailable = true;
  console.log('✅ Using real Tauri commands (both dev and production)');
} catch (error) {
  console.warn('❌ Tauri API not available, using mock for development');
  isTauriAvailable = false;
  // Mock invoke function for development
  invoke = async (command: string, args: any) => {
    console.log(`[MOCK] Tauri command: ${command}`, args);
    
    // Mock responses for development - these simulate real printer detection
    switch (command) {
      case 'list_all_printers':
        return [
          'EPSON TM-T81 ReceiptE4',
          'EPSON TM-T20',
          'EPSON TM-T88VI',
          'Star TSP100',
          'Citizen CT-S310II',
          'Microsoft Print to PDF',
          'HP LaserJet Pro M404n',
          'Canon PIXMA TS3320'
        ];
      case 'list_usb_printers':
        return [
          'EPSON TM-T81 ReceiptE4',
          'EPSON TM-T20',
          'EPSON TM-T88VI',
          'Star TSP100',
          'Citizen CT-S310II'
        ];
      case 'list_printers':
        return [
          'EPSON TM-T81 ReceiptE4 (COM1)',
          'Star TSP100 (COM2)',
          'Citizen CT-S310II (USB001)'
        ];
      case 'print_ticket':
      case 'print_ticket_raw':
        console.log('[MOCK] Printing ticket:', args);
        return true;
      case 'test_printers':
        return [
          'EPSON TM-T81 ReceiptE4',
          'EPSON TM-T20',
          'Star TSP100',
          'Citizen CT-S310II'
        ];
      default:
        console.log(`[MOCK] Unknown command: ${command}`);
        return null;
    }
  };
}

export interface PrinterInfo {
  name: string;
  port?: string;
}

export class TauriPrinterService {
  private static instance: TauriPrinterService;

  static getInstance(): TauriPrinterService {
    if (!TauriPrinterService.instance) {
      TauriPrinterService.instance = new TauriPrinterService();
    }
    return TauriPrinterService.instance;
  }

  /**
   * Get all available printers on the system
   */
  async getAllPrinters(): Promise<string[]> {
    try {
      console.log('🔍 Fetching all printers via Tauri...');
      const printers = await invoke('list_all_printers');
      console.log('✅ Found printers:', printers);
      return printers;
    } catch (error) {
      console.error('❌ Error fetching all printers:', error);
      return [];
    }
  }

  /**
   * Get USB printers specifically
   */
  async getUsbPrinters(): Promise<string[]> {
    try {
      console.log('🔍 Fetching USB printers via Tauri...');
      const printers = await invoke('list_usb_printers');
      console.log('✅ Found USB printers:', printers);
      return printers;
    } catch (error) {
      console.error('❌ Error fetching USB printers:', error);
      return [];
    }
  }

  /**
   * Get serial/COM port printers
   */
  async getSerialPrinters(): Promise<string[]> {
    try {
      console.log('🔍 Fetching serial printers via Tauri...');
      const printers = await invoke('list_printers');
      console.log('✅ Found serial printers:', printers);
      return printers;
    } catch (error) {
      console.error('❌ Error fetching serial printers:', error);
      return [];
    }
  }

  /**
   * Print ticket using native Windows API
   */
  async printTicket(ticketData: string, printerName: string): Promise<boolean> {
    try {
      console.log('🖨️ Printing ticket via Tauri native API...');
      console.log('📄 Printer:', printerName);
      console.log('📄 Data length:', ticketData.length);
      
      await invoke('print_ticket', { ticketData, printerName });
      
      console.log('✅ Ticket printed successfully via Tauri');
      return true;
    } catch (error) {
      console.error('❌ Error printing via Tauri native API:', error);
      
      // Fallback to raw printing
      try {
        console.log('🔄 Trying fallback raw printing...');
        await invoke('print_ticket_raw', { ticketData, printerName });
        console.log('✅ Ticket printed successfully via fallback');
        return true;
      } catch (fallbackError) {
        console.error('❌ Fallback printing also failed:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Test printer connection
   */
  async testPrinterConnection(port: string): Promise<boolean> {
    try {
      console.log('🧪 Testing printer connection on port:', port);
      const result = await invoke('test_printer_connection', { port });
      console.log('✅ Printer connection test result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error testing printer connection:', error);
      return false;
    }
  }

  /**
   * Get test printers (for development)
   */
  async getTestPrinters(): Promise<string[]> {
    try {
      console.log('🧪 Getting test printers...');
      const printers = await invoke('test_printers');
      console.log('✅ Test printers:', printers);
      return printers;
    } catch (error) {
      console.error('❌ Error getting test printers:', error);
      return [];
    }
  }

  /**
   * Format ticket data for thermal printer
   */
  formatTicketForThermal(ticketData: any): string {
    const maxWidth = 42; // Standard thermal printer width
    
    // Center text helper
    const centerText = (text: string) => {
      const padding = Math.max(0, Math.floor((maxWidth - text.length) / 2));
      return ' '.repeat(padding) + text + ' '.repeat(maxWidth - text.length - padding);
    };
    
    // Right align text helper
    const rightText = (label: string, value: string) => {
      const text = `${label}: Rs.${value}`;
      const padding = Math.max(0, maxWidth - text.length);
      return ' '.repeat(padding) + text;
    };
    
    // Left align with padding
    const leftText = (text: string) => {
      return text + ' '.repeat(Math.max(0, maxWidth - text.length));
    };
    
    let ticket = '';
    
    // Header
    ticket += '='.repeat(maxWidth) + '\n';
    ticket += centerText('SREELEKHA THEATER') + '\n';
    ticket += centerText('Chickmagalur') + '\n';
    ticket += '='.repeat(maxWidth) + '\n';
    
    // Ticket details
    ticket += leftText(`Date: ${ticketData.date || new Date().toLocaleDateString()}`) + '\n';
    ticket += leftText(`Time: ${ticketData.showTime || '2:00 PM'}`) + '\n';
    ticket += leftText(`Film: ${ticketData.movieName || 'MOVIE'}`) + '\n';
    ticket += leftText(`Class: ${ticketData.class || 'CLASS'}`) + '\n';
    ticket += leftText(`Seat: ${ticketData.seatId || 'A1'}`) + '\n';
    ticket += '-'.repeat(maxWidth) + '\n';
    
    // Pricing - right aligned
    ticket += rightText('Net', (ticketData.netAmount || 0).toString()) + '\n';
    ticket += rightText('CGST', (ticketData.cgst || 0).toString()) + '\n';
    ticket += rightText('SGST', (ticketData.sgst || 0).toString()) + '\n';
    ticket += rightText('MC', (ticketData.mc || 0).toString()) + '\n';
    ticket += '-'.repeat(maxWidth) + '\n';
    
    // Total
    ticket += centerText(`TOTAL: Rs.${ticketData.price || 0}`) + '\n';
    ticket += centerText(`ID: ${ticketData.transactionId || 'TXN' + Date.now()}`) + '\n';
    ticket += '-'.repeat(maxWidth) + '\n';
    
    // Footer
    ticket += centerText('THANK YOU FOR VISITING') + '\n';
    ticket += centerText('SREELEKHA THEATER') + '\n';
    ticket += '='.repeat(maxWidth) + '\n';
    
    return ticket;
  }
}

export default TauriPrinterService;
