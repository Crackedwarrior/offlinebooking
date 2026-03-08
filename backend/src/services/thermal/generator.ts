/**
 * Thermal Ticket Generator Module
 * Handles ticket printing operations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getAllPrinters, getThermalPrinters, getPrinterStatus, type PrinterInfo } from './detection';
import { formatTicket, createTicketContent, type TicketData } from './formatter';
import { Logger } from '../../utils/logger';

const logger = Logger.withContext('services/thermal/generator');

const execAsync = promisify(exec);

export interface PrintResult {
  success: boolean;
  printer?: string;
  message?: string;
  error?: string;
}

export interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export class ThermalTicketGenerator {
  private tempDir: string;

  constructor() {
    // Use production path handling
    const basePath = process.env.NODE_ENV === 'production' ? process.cwd() : path.join(__dirname, '../../');
    this.tempDir = path.join(basePath, 'temp');
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Get all available printers
   */
  async getAllPrinters(): Promise<PrinterInfo[]> {
    return getAllPrinters();
  }

  /**
   * Get thermal printers specifically
   */
  async getThermalPrinters(): Promise<PrinterInfo[]> {
    return getThermalPrinters();
  }

  /**
   * Test printer connection
   */
  async testPrinter(printerName: string): Promise<TestResult> {
    try {
      logger.debug('Testing printer', { printerName });
      
      const testContent = `
PRINTER TEST
============
If you can see this, your printer is working!
Test Time: ${new Date().toLocaleString()}
============
      `;
      
      const testFile = path.join(this.tempDir, `test_${Date.now()}.txt`);
      fs.writeFileSync(testFile, testContent);
      
      const printCommand = `powershell -Command "Get-Content '${testFile}' | Out-Printer -Name '${printerName}'"`;
      await execAsync(printCommand, { windowsHide: true });
      
      fs.unlinkSync(testFile);
      
      logger.info('Printer test successful', { printerName });
      return { success: true, message: 'Printer test successful' };
    } catch (error) {
      logger.error('Printer test failed', { printerName, error: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Print ticket using optimized printer settings
   */
  async printTicket(ticketData: TicketData, printerName: string | null = null): Promise<PrintResult> {
    try {
      // Auto-detect printer if not specified
      if (!printerName) {
        const thermalPrinters = await this.getThermalPrinters();
        if (thermalPrinters.length > 0) {
          printerName = thermalPrinters[0].name;
          logger.debug('Auto-selected printer', { printerName });
        } else {
          throw new Error('No thermal printers found');
        }
      }

      // Format ticket data
      const formattedTicket = formatTicket(ticketData);
      
      // Create ticket content
      const ticketContent = createTicketContent(formattedTicket);
      
      // Save to temporary file
      const ticketFile = path.join(this.tempDir, `ticket_${Date.now()}.txt`);
      fs.writeFileSync(ticketFile, ticketContent);
      
      logger.debug('Ticket file created', { ticketFile });
      
      // Method 1: Use PowerShell Start-Process for automatic printing
      try {
        logger.debug('Printing automatically with PowerShell', { printerName });
        const psCommand = `powershell -Command "Start-Process -FilePath '${ticketFile}' -Verb Print"`;
        await execAsync(psCommand, { windowsHide: true });
        
        logger.info('Automatic print executed successfully', { printerName });
        
        // Clean up ticket file after a delay
        setTimeout(() => {
          if (fs.existsSync(ticketFile)) {
            fs.unlinkSync(ticketFile);
            logger.debug('Ticket file cleaned up', { ticketFile });
          }
        }, 30000);
      
        return {
          success: true,
          printer: printerName,
          message: 'Ticket printed automatically with optimized settings'
        };
      } catch (psError) {
        logger.warn('Automatic print failed', { printerName, error: psError instanceof Error ? psError.message : 'Unknown error' });
      }
      
      // Method 2: Fallback to manual printing
      try {
        logger.debug('Fallback: Opening file for manual print', { printerName });
        const openCommand = `start "" "${ticketFile}"`;
        await execAsync(openCommand, { windowsHide: true });
        
        logger.info('File opened for manual print', { printerName });
        
        return {
          success: true,
          printer: printerName,
          message: 'File opened for manual printing (fallback method)'
        };
      } catch (openError) {
        logger.warn('File open failed', { printerName, error: openError instanceof Error ? openError.message : 'Unknown error' });
      }
      
      // Clean up ticket file if all methods failed
      if (fs.existsSync(ticketFile)) {
        fs.unlinkSync(ticketFile);
      }
      
      return {
        success: false,
        error: 'All printing methods failed',
        printer: printerName || undefined
      };
    } catch (error) {
      logger.error('Print error', { error: error instanceof Error ? error.message : 'Unknown error', printerName: printerName || undefined });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        printer: printerName || undefined
      };
    }
  }

  /**
   * Get printer status
   */
  async getPrinterStatus(printerName: string): Promise<any> {
    return getPrinterStatus(printerName);
  }
}

