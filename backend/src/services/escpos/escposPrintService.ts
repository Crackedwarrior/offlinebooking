import { createFormattedTicket } from './formatters/ticketFormatter';
import { printViaUSB } from './printers/usbPrinter';
import { printViaPowerShellWithEscpos } from './printers/powershellPrinter';
import { Logger } from '../../utils/logger';

// Use require to avoid TypeScript issues
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const logger = Logger.withContext('services/escpos/escposPrintService');

/**
 * ESC/POS Print Service
 * Main service for thermal printer ticket printing
 * Orchestrates USB and PowerShell printing methods
 */
export class EscposPrintService {
  /**
   * Print ticket silently (main entry point)
   * Tries USB connection first, falls back to PowerShell
   */
  static async printSilently(ticketData: any, printerName: string): Promise<void> {
    try {
      // Using ESCPOS library for thermal printing
      
      // Format the ticket data into proper text
      const formattedTicket = createFormattedTicket(ticketData);
      
      // Method 1: Try USB connection first
      try {
        await printViaUSB(formattedTicket);
        return;
      } catch (error) {
        logger.warn('USB method failed, trying PowerShell with formatted text');
      }

      // Method 2: Fallback to PowerShell with formatted text
      await printViaPowerShellWithEscpos(formattedTicket, printerName);
      
    } catch (error) {
      logger.error('ESCPOS printing failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * List available printers
   * Note: Simplified implementation - in practice you'd need to enumerate devices
   */
  static async listAvailablePrinters(): Promise<any[]> {
    try {
      // List USB printers
      const usbDevice = new escpos.USB();
      const printers: any[] = [];
      
      // This is a simplified approach - in practice you'd need to enumerate devices
      logger.debug('Available printers will be listed here');
      
      return printers;
    } catch (error) {
      logger.error('Error listing printers', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }
}

