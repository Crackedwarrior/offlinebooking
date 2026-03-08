import { convertEscposToPrinterCommands } from '../utils/converter';
import { Logger } from '../../../utils/logger';

// Use require to avoid TypeScript issues
const escpos = require('escpos');

const logger = Logger.withContext('services/escpos/printers/networkPrinter');

/**
 * Network Printer Module
 * Handles network printer connections (unused but preserved)
 */

/**
 * Print ticket via network printer
 * Note: This method is currently unused but preserved for future use
 */
export async function printViaNetwork(ticketData: string): Promise<void> {
  // Try network printer (if connected via network)
  const device = new escpos.Network('192.168.1.100'); // Default IP, adjust as needed
  
  logger.debug('Trying network printer');
  
  return new Promise((resolve, reject) => {
    device.open((error: any) => {
      if (error) {
        reject(new Error(`Network printer not found: ${error.message}`));
        return;
      }

      logger.debug('Network printer found and connected');
      
      const printer = new escpos.Printer(device);
      
      // Convert ESC/POS commands to printer operations
      convertEscposToPrinterCommands(printer, ticketData);
      
      printer
        .close()
        .then(() => {
          logger.info('Network printing completed successfully');
          resolve();
        })
        .catch((err: any) => {
          reject(new Error(`Network printing failed: ${err.message}`));
        });
    });
  });
}

