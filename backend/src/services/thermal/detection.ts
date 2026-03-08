/**
 * Thermal Printer Detection Module
 * Handles printer detection and listing
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../../utils/logger';

const logger = Logger.withContext('services/thermal/detection');

const execAsync = promisify(exec);

export interface PrinterInfo {
  name: string;
  port: string;
  status: string | number;
}

/**
 * Get all available printers using PowerShell
 */
export async function getAllPrinters(): Promise<PrinterInfo[]> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, Port, PrinterStatus | ConvertTo-Json"', { windowsHide: true });
      
      try {
        const printers = JSON.parse(stdout);
        const printerList = Array.isArray(printers) ? printers : [printers];
        
        logger.debug('Found printers', { count: printerList.length, printers: printerList.map((p: any) => p.Name) });
        return printerList.map((p: any) => ({
          name: p.Name,
          port: p.Port || 'Unknown',
          status: p.PrinterStatus || 'Unknown'
        }));
      } catch (parseError) {
        logger.warn('Failed to parse printer list', { error: parseError instanceof Error ? parseError.message : 'Unknown error' });
        return [];
      }
    } else {
      // For non-Windows systems, return empty array for now
      return [];
    }
  } catch (error) {
    logger.error('Error getting printers', { error: error instanceof Error ? error.message : 'Unknown error' });
    return [];
  }
}

/**
 * Get thermal printers specifically
 */
export async function getThermalPrinters(): Promise<PrinterInfo[]> {
  const allPrinters = await getAllPrinters();
  const thermalKeywords = ['thermal', 'pos', 'receipt', 'epson', 'star', 'citizen'];
  
  return allPrinters.filter(printer => 
    thermalKeywords.some(keyword => 
      printer.name.toLowerCase().includes(keyword)
    )
  );
}

/**
 * Get printer status
 */
export async function getPrinterStatus(printerName: string): Promise<any> {
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
    logger.error('Error getting printer status', { error: error instanceof Error ? error.message : 'Unknown error', printerName });
    return { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

