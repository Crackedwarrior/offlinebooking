import { DEBUG_CONFIG } from '@/config/debug';

// Simple Tauri detection
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}

// Backend API base URL
const BACKEND_URL = 'http://localhost:3001';

export interface PrinterInfo {
  name: string;
  port?: string;
  status?: string;
}

export class TauriPrinterService {
  private static instance: TauriPrinterService;

  static getInstance(): TauriPrinterService {
    if (!TauriPrinterService.instance) {
      TauriPrinterService.instance = new TauriPrinterService();
    }
    return TauriPrinterService.instance;
  }

  async getAllPrinters(): Promise<string[]> {
    try {
      DEBUG_CONFIG.log('PRINTER', '🔍 Fetching all printers via backend API...');
      
      const response = await fetch(`${BACKEND_URL}/api/thermal-printer/list`);
      const data = await response.json();
      
      if (data.success) {
        const printerNames = data.allPrinters.map((p: any) => p.name);
        DEBUG_CONFIG.log('PRINTER', '✅ Found real printers via backend:', printerNames);
        return printerNames;
      } else {
        throw new Error(data.error || 'Failed to get printers');
      }
    } catch (error) {
      DEBUG_CONFIG.error('PRINTER', '❌ Error fetching all printers:', error);
      // Return empty array if backend is not available - no fallback
      return [];
    }
  }

  async getUsbPrinters(): Promise<string[]> {
    try {
      DEBUG_CONFIG.log('PRINTER', '🔍 Fetching USB printers via backend API...');
      
      const response = await fetch(`${BACKEND_URL}/api/thermal-printer/list`);
      const data = await response.json();
      
      if (data.success) {
        const thermalPrinters = data.thermalPrinters.map((p: any) => p.name);
        DEBUG_CONFIG.log('PRINTER', '✅ Found thermal printers via backend:', thermalPrinters);
        return thermalPrinters;
      } else {
        throw new Error(data.error || 'Failed to get USB printers');
      }
    } catch (error) {
      DEBUG_CONFIG.error('PRINTER', '❌ Error fetching USB printers:', error);
      return [];
    }
  }

  async getSerialPrinters(): Promise<string[]> {
    try {
      DEBUG_CONFIG.log('PRINTER', '🔍 Fetching serial printers via backend API...');
      
      const response = await fetch(`${BACKEND_URL}/api/thermal-printer/list`);
      const data = await response.json();
      
      if (data.success) {
        // Filter for serial printers (COM ports)
        const serialPrinters = data.allPrinters
          .filter((p: any) => p.port && p.port.toLowerCase().includes('com'))
          .map((p: any) => p.name);
        
        DEBUG_CONFIG.log('PRINTER', '✅ Found serial printers via backend:', serialPrinters);
        return serialPrinters;
      } else {
        throw new Error(data.error || 'Failed to get serial printers');
      }
    } catch (error) {
      DEBUG_CONFIG.error('PRINTER', '❌ Error fetching serial printers:', error);
      return [];
    }
  }

  async printTicket(ticketData: any, printerName?: string, movieSettings?: any): Promise<boolean> {
    try {
      DEBUG_CONFIG.log('PRINTER', '🖨️ Printing ticket via backend API...');
      DEBUG_CONFIG.log('PRINTER', '📄 Printer:', printerName || 'Auto-detect');
      DEBUG_CONFIG.log('PRINTER', '📄 Data length:', JSON.stringify(ticketData).length);
      DEBUG_CONFIG.log('PRINTER', '🎬 Movie settings:', movieSettings);

      const response = await fetch(`${BACKEND_URL}/api/thermal-printer/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketData,
          printerName,
          movieSettings
        })
      });

      const result = await response.json();
      
      if (result.success) {
        DEBUG_CONFIG.log('PRINTER', '✅ Ticket printed successfully via backend:', result);
        return true;
      } else {
        DEBUG_CONFIG.error('PRINTER', '❌ Backend printing failed:', result.error);
        return false;
      }
    } catch (error) {
      DEBUG_CONFIG.error('PRINTER', '❌ Error printing ticket:', error);
      return false;
    }
  }

  async testPrinterConnection(printerName: string): Promise<boolean> {
    try {
      DEBUG_CONFIG.log('PRINTER', '🧪 Testing printer connection via backend API...');
      DEBUG_CONFIG.log('PRINTER', '📄 Printer:', printerName);

      const response = await fetch(`${BACKEND_URL}/api/thermal-printer/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ printerName })
      });

      const result = await response.json();
      
      if (result.success) {
        DEBUG_CONFIG.log('PRINTER', '✅ Printer test successful via backend:', result);
        return true;
      } else {
        DEBUG_CONFIG.error('PRINTER', '❌ Backend printer test failed:', result.error);
        return false;
      }
    } catch (error) {
      DEBUG_CONFIG.error('PRINTER', '❌ Error testing printer connection:', error);
      return false;
    }
  }

  async testPrinters(): Promise<string[]> {
    try {
      DEBUG_CONFIG.log('PRINTER', '🧪 Testing all printers via backend API...');
      
      const response = await fetch(`${BACKEND_URL}/api/thermal-printer/list`);
      const data = await response.json();
      
      if (data.success) {
        const testResults = [];
        for (const printer of data.thermalPrinters) {
          const isWorking = await this.testPrinterConnection(printer.name);
          testResults.push(`${printer.name}: ${isWorking ? '✅ Working' : '❌ Failed'}`);
        }
        
        DEBUG_CONFIG.log('PRINTER', '✅ Printer tests completed:', testResults);
        return testResults;
      } else {
        throw new Error(data.error || 'Failed to get printers for testing');
      }
    } catch (error) {
      DEBUG_CONFIG.error('PRINTER', '❌ Error testing printers:', error);
      return ['❌ Backend not available for printer testing'];
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
