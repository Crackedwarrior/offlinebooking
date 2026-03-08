import { getTheaterConfig } from '../../../config/theaterConfig';
import { Logger } from '../../../utils/logger';

// Use require to avoid TypeScript issues
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const logger = Logger.withContext('services/escpos/printers/usbPrinter');

/**
 * USB Printer Module
 * Handles USB thermal printer connections and printing
 */

/**
 * Print ticket via USB connection
 */
export async function printViaUSB(ticketData: string): Promise<void> {
  logger.debug('Searching for USB printer');
  
  return new Promise((resolve, reject) => {
    // Auto-detect USB printer without hardcoded IDs
    const device = new escpos.USB();
    
    device.open((error: any) => {
      if (error) {
        logger.warn('USB printer not found', { error: error.message });
        reject(new Error(`USB printer not found: ${error.message}`));
        return;
      }

      logger.debug('USB printer found and connected');
      
      const printer = new escpos.Printer(device);
      
      // Format the ticket properly for thermal printer
      printer
        .font('a')
        .align('ct')
        .style('b')
        .size(1, 1)
        .text(getTheaterConfig().name)
        .text(getTheaterConfig().location)
        .drawLine()
        .align('lt')
        .style('normal')
        .size(0, 0)
        .text(ticketData)
        .drawLine()
        .align('ct')
        .style('b')
        .text('THANK YOU')
        .text(getTheaterConfig().name)
        .cut()
        .close()
        .then(() => {
          logger.info('USB printing completed successfully');
          resolve();
        })
        .catch((err: any) => {
          logger.error('USB printing failed', { error: err.message });
          reject(new Error(`USB printing failed: ${err.message}`));
        });
    });
  });
}

