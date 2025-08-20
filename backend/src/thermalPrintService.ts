import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface PrinterInfo {
  name: string;
  port: string;
  status: string | number;
}

interface TicketSeat {
  row: string;
  number: string;
  price: number;
}

interface TicketData {
  theaterName?: string;
  location?: string;
  gstin?: string;
  movieName?: string;
  date?: string;
  showTime?: string;
  screen?: string;
  seats?: TicketSeat[];
  totalAmount?: number;
}

interface PrintResult {
  success: boolean;
  printer?: string;
  message?: string;
  error?: string;
}

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
}

class ThermalPrintService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Get all available printers using PowerShell
  async getAllPrinters(): Promise<PrinterInfo[]> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, Port, PrinterStatus | ConvertTo-Json"', { windowsHide: true });
        
        try {
          const printers = JSON.parse(stdout);
          const printerList = Array.isArray(printers) ? printers : [printers];
          
          console.log('🔍 Found printers:', printerList.map(p => p.Name));
          return printerList.map(p => ({
            name: p.Name,
            port: p.Port || 'Unknown',
            status: p.PrinterStatus || 'Unknown'
          }));
        } catch (parseError) {
          console.error('❌ Failed to parse printer list:', parseError);
          return [];
        }
      } else {
        // For non-Windows systems, return empty array for now
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting printers:', error);
      return [];
    }
  }

  // Get thermal printers specifically
  async getThermalPrinters(): Promise<PrinterInfo[]> {
    const allPrinters = await this.getAllPrinters();
    const thermalKeywords = ['thermal', 'pos', 'receipt', 'epson', 'star', 'citizen'];
    
    return allPrinters.filter(printer => 
      thermalKeywords.some(keyword => 
        printer.name.toLowerCase().includes(keyword)
      )
    );
  }

  // Test printer connection using Windows print command
  async testPrinter(printerName: string): Promise<TestResult> {
    try {
      console.log(`🧪 Testing printer: ${printerName}`);
      
      // Create a simple test file
      const testContent = `
PRINTER TEST
============
If you can see this, your printer is working!
Test Time: ${new Date().toLocaleString()}
============
      `;
      
      const testFile = path.join(this.tempDir, `test_${Date.now()}.txt`);
      fs.writeFileSync(testFile, testContent);
      
      // Print using Windows print command
      const printCommand = `powershell -Command "Get-Content '${testFile}' | Out-Printer -Name '${printerName}'"`;
      await execAsync(printCommand, { windowsHide: true });
      
      // Clean up test file
      fs.unlinkSync(testFile);
      
      console.log(`✅ Printer test successful for: ${printerName}`);
      return { success: true, message: 'Printer test successful' };
    } catch (error) {
      console.error(`❌ Printer test failed for ${printerName}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Print ticket using Windows print dialog (rundll32)
  async printTicket(ticketData: TicketData, printerName: string | null = null): Promise<PrintResult> {
    try {
      // Auto-detect printer if not specified
      if (!printerName) {
        const thermalPrinters = await this.getThermalPrinters();
        if (thermalPrinters.length > 0) {
          printerName = thermalPrinters[0].name;
          console.log(`🖨️ Auto-selected printer: ${printerName}`);
        } else {
          throw new Error('No thermal printers found');
        }
      }

      // Format ticket data
      const formattedTicket = this.formatTicket(ticketData);
      
      // Create ticket content
      const ticketContent = this.createTicketContent(formattedTicket);
      
      // Save to temporary file
      const ticketFile = path.join(this.tempDir, `ticket_${Date.now()}.txt`);
      fs.writeFileSync(ticketFile, ticketContent);
      
      // Method 1: Try rundll32 to trigger Windows print dialog (full width support)
      try {
        console.log(`🖨️ Triggering print dialog for: ${printerName}`);
        // Use the correct rundll32 command to print the file
        const rundllCommand = `rundll32 printui.dll,PrintUIEntry /k /n "${printerName}" "${ticketFile}"`;
        await execAsync(rundllCommand, { windowsHide: true });
        
        console.log(`✅ Print dialog triggered for ${printerName}`);
        
        // Clean up ticket file after a delay (to allow printing to complete)
        setTimeout(() => {
          if (fs.existsSync(ticketFile)) {
            fs.unlinkSync(ticketFile);
            console.log('🧹 Ticket file cleaned up');
          }
        }, 30000); // 30 second delay
        
        return {
          success: true,
          printer: printerName,
          message: 'Print dialog opened successfully - please click Print'
        };
      } catch (rundllError) {
        console.log('❌ Rundll32 failed, trying PowerShell fallback...');
        
        // Method 2: Fallback to PowerShell (narrow width, but functional)
        try {
          console.log(`🖨️ Trying PowerShell fallback for: ${printerName}`);
          const printCommand = `powershell -Command "Get-Content '${ticketFile}' | Out-Printer -Name '${printerName}'"`;
          await execAsync(printCommand, { windowsHide: true });
          
          // Clean up ticket file
          fs.unlinkSync(ticketFile);
          
          console.log(`✅ Ticket printed successfully on ${printerName} (narrow width)`);
          
          return {
            success: true,
            printer: printerName,
            message: 'Ticket printed successfully (narrow width)'
          };
        } catch (psError) {
          // Clean up ticket file
          if (fs.existsSync(ticketFile)) {
            fs.unlinkSync(ticketFile);
          }
          
          throw new Error(`Both rundll32 and PowerShell methods failed: ${psError}`);
        }
      }
    } catch (error) {
      console.error('❌ Print error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        printer: printerName || undefined
      };
    }
  }

  // Create formatted ticket content
  createTicketContent(ticketData: TicketData): string {
    const PAPER_WIDTH = 48; // Optimized for 80mm thermal paper (48 characters - standard thermal width)
    
    // Helper function to center text
    const centerText = (text: string): string => {
      const padding = Math.max(0, Math.floor((PAPER_WIDTH - text.length) / 2));
      return ' '.repeat(padding) + text;
    };
    
    // Helper function to create full-width line
    const fullWidthLine = (char: string = '='): string => char.repeat(PAPER_WIDTH);
    
    // Helper function to format left-aligned text with proper spacing
    const leftAlign = (text: string, indent: number = 0): string => {
      const spaces = ' '.repeat(indent);
      return spaces + text;
    };
    
    // Helper function to format right-aligned text
    const rightAlign = (text: string): string => {
      const padding = Math.max(0, PAPER_WIDTH - text.length);
      return ' '.repeat(padding) + text;
    };
    
    // Helper function to create justified text (fills the full width)
    const justifyText = (text: string): string => {
      if (text.length >= PAPER_WIDTH) return text.substring(0, PAPER_WIDTH);
      
      const words = text.split(' ');
      if (words.length <= 1) return text;
      
      const totalSpaces = PAPER_WIDTH - text.length;
      const gaps = words.length - 1;
      const spacesPerGap = Math.floor(totalSpaces / gaps);
      const extraSpaces = totalSpaces % gaps;
      
      let result = words[0];
      for (let i = 1; i < words.length; i++) {
        const spaces = spacesPerGap + (i <= extraSpaces ? 1 : 0);
        result += ' '.repeat(spaces) + words[i];
      }
      
      return result;
    };
    
    const lines = [
      '',
      centerText('SREELEKHA THEATER'),
      centerText('Chickmagalur'),
      centerText('GSTIN: 29AAVFS7423E120'),
      '',
      fullWidthLine('='),
      justifyText(`Movie: ${ticketData.movieName}`),
      justifyText(`Date: ${ticketData.date}`),
      justifyText(`Time: ${ticketData.showTime}`),
      justifyText(`Screen: ${ticketData.screen}`),
      '',
      justifyText('Seats:'),
      ...(ticketData.seats || []).map(seat => justifyText(`  ${seat.row}-${seat.number} (₹${seat.price})`)),
      '',
      fullWidthLine('='),
      rightAlign(`Total: ₹${ticketData.totalAmount}`),
      '',
      centerText('Thank you for visiting!'),
      centerText('Enjoy your movie!'),
      '',
      fullWidthLine('='),
      ''
    ];
    
    return lines.join('\n');
  }

  // Format ticket data for printing
  formatTicket(ticketData: TicketData): TicketData {
    return {
      theaterName: ticketData.theaterName || 'SREELEKHA THEATER',
      location: ticketData.location || 'Chickmagalur',
      gstin: ticketData.gstin || '29AAVFS7423E120',
      movieName: ticketData.movieName || 'Movie',
      date: ticketData.date || new Date().toLocaleDateString(),
      showTime: ticketData.showTime || 'Show Time',
      screen: ticketData.screen || 'Screen 1',
      seats: ticketData.seats || [],
      totalAmount: ticketData.totalAmount || 0
    };
  }

  // Get printer status
  async getPrinterStatus(printerName: string): Promise<any> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`powershell -Command "Get-Printer -Name '${printerName}' | Select-Object Name, Port, PrinterStatus | ConvertTo-Json"`, { windowsHide: true });
        
        try {
          const printer = JSON.parse(stdout);
          return {
            status: printer.PrinterStatus || 'UNKNOWN',
            port: printer.Port,
            isDefault: false // We'll assume false for now
          };
        } catch (parseError) {
          return { status: 'NOT_FOUND', message: 'Printer not found' };
        }
      } else {
        return { status: 'UNSUPPORTED', message: 'Platform not supported' };
      }
    } catch (error) {
      console.error('❌ Error getting printer status:', error);
      return { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default ThermalPrintService;
