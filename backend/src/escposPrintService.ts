import * as fs from 'fs';
import * as path from 'path';

// Use require to avoid TypeScript issues
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

export class EscposPrintService {
  static async printSilently(ticketData: string, printerName: string): Promise<void> {
    try {
      console.log('🖨️ Using ESCPOS library for silent printing...');
      
      // Method 1: Try USB connection first
      try {
        await this.printViaUSB(ticketData);
        return;
      } catch (error) {
        console.log('⚠️ USB method failed, trying network...');
      }

      // Method 2: Try network connection
      try {
        await this.printViaNetwork(ticketData);
        return;
      } catch (error) {
        console.log('⚠️ Network method failed, trying direct file...');
      }

      // Method 3: Fallback to direct file writing
      await this.printViaDirectFile(ticketData, printerName);
      
    } catch (error) {
      console.error('❌ ESCPOS printing failed:', error);
      throw error;
    }
  }

  private static async printViaUSB(ticketData: string): Promise<void> {
    // Find USB printer
    const device = new escpos.USB();
    
    // Try to find the Epson TM-T81 printer
    const options = {
      vendorId: 0x04b8, // Epson vendor ID
      productId: 0x0e15  // Common Epson TM-T81 product ID (may need adjustment)
    };

    console.log('🔍 Searching for USB printer...');
    
    return new Promise((resolve, reject) => {
      device.open((error: any) => {
        if (error) {
          reject(new Error(`USB printer not found: ${error.message}`));
          return;
        }

        console.log('✅ USB printer found and connected');
        
        const printer = new escpos.Printer(device);
        
        // Convert ESC/POS commands to printer operations
        this.convertEscposToPrinterCommands(printer, ticketData);
        
        printer
          .close()
          .then(() => {
            console.log('✅ USB printing completed successfully');
            resolve();
          })
          .catch((err: any) => {
            reject(new Error(`USB printing failed: ${err.message}`));
          });
      });
    });
  }

  private static async printViaNetwork(ticketData: string): Promise<void> {
    // Try network printer (if connected via network)
    const device = new escpos.Network('192.168.1.100'); // Default IP, adjust as needed
    
    console.log('🔍 Trying network printer...');
    
    return new Promise((resolve, reject) => {
      device.open((error: any) => {
        if (error) {
          reject(new Error(`Network printer not found: ${error.message}`));
          return;
        }

        console.log('✅ Network printer found and connected');
        
        const printer = new escpos.Printer(device);
        
        // Convert ESC/POS commands to printer operations
        this.convertEscposToPrinterCommands(printer, ticketData);
        
        printer
          .close()
          .then(() => {
            console.log('✅ Network printing completed successfully');
            resolve();
          })
          .catch((err: any) => {
            reject(new Error(`Network printing failed: ${err.message}`));
          });
      });
    });
  }

  private static async printViaDirectFile(ticketData: string, printerName: string): Promise<void> {
    // Fallback: Write to file and use minimal PowerShell command
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = path.join(tempDir, `ticket_${Date.now()}.txt`);
    fs.writeFileSync(filePath, ticketData, 'binary');
    
    console.log('📁 Created temp file for direct printing:', filePath);
    
    // Use the most minimal PowerShell command possible
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const command = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '${filePath.replace(/\\/g, '\\\\')}' | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`;
    
    try {
      const { stdout, stderr } = await execAsync(command, { 
        maxBuffer: 10 * 1024 * 1024, 
        timeout: 30000,
        windowsHide: true
      });
      
      console.log('✅ Direct file printing completed');
      
      // Clean up temp file
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up temp file:', cleanupError);
      }
      
    } catch (error) {
      throw new Error(`Direct file printing failed: ${error}`);
    }
  }

  private static convertEscposToPrinterCommands(printer: any, escposData: string): void {
    // Parse ESC/POS commands and convert to printer operations
    const commands = escposData.split('\n');
    
    for (const command of commands) {
      if (command.includes('\x1B\x40')) {
        // Initialize printer
        printer.initialize();
      } else if (command.includes('\x1B\x61\x01')) {
        // Center alignment
        printer.align('center');
      } else if (command.includes('\x1B\x61\x00')) {
        // Left alignment
        printer.align('left');
      } else if (command.includes('\x1B\x21\x10')) {
        // Double height and width
        printer.style('b');
        printer.size(2, 2);
      } else if (command.includes('\x1B\x21\x00')) {
        // Normal size
        printer.style('normal');
        printer.size(1, 1);
      } else if (command.includes('\x1B\x2D\x01')) {
        // Underline on
        printer.style('u');
      } else if (command.includes('\x1B\x2D\x00')) {
        // Underline off
        printer.style('normal');
      } else if (command.includes('\x1B\x69')) {
        // Cut paper
        printer.cut();
      } else if (command.trim() && !command.startsWith('\x1B')) {
        // Regular text (not ESC commands)
        printer.text(command);
      }
    }
  }

  static async listAvailablePrinters(): Promise<any[]> {
    try {
      // List USB printers
      const usbDevice = new escpos.USB();
      const printers: any[] = [];
      
      // This is a simplified approach - in practice you'd need to enumerate devices
      console.log('🔍 Available printers will be listed here');
      
      return printers;
    } catch (error) {
      console.error('❌ Error listing printers:', error);
      return [];
    }
  }
}
