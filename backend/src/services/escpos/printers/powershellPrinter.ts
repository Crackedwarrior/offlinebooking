import * as fs from 'fs';
import * as path from 'path';
import { createSimpleFormattedTicket } from '../formatters/ticketFormatter';
import { Logger } from '../../../utils/logger';

const logger = Logger.withContext('services/escpos/printers/powershellPrinter');

/**
 * PowerShell Printer Module
 * Handles printing via PowerShell commands (fallback method)
 */

/**
 * Print ticket via PowerShell with ESC/POS formatted text
 * Tries direct copy first, falls back to PowerShell Out-Printer
 */
export async function printViaPowerShellWithEscpos(ticketData: string, printerName: string): Promise<void> {
  logger.debug('Using direct file copy to printer port');
  
  // Create simple formatted text (not ESC/POS binary)
  const formattedTicket = createSimpleFormattedTicket(ticketData);
  
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filePath = path.join(tempDir, `ticket_simple_${Date.now()}.txt`);
  
  // Write simple text
  fs.writeFileSync(filePath, formattedTicket, 'utf8');
  
  logger.debug('Created simple ticket file', { filePath, ticketLength: formattedTicket.length });
  
  // Use direct copy command to printer (this should work for most thermal printers)
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  // Try direct copy to printer port first
  const command = `cmd /c copy "${filePath.replace(/\//g, '\\')}" "\\\\localhost\\${printerName.replace(/\s+/g, '')}"`;
  
  try {
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 10 * 1024 * 1024, 
      timeout: 30000,
      windowsHide: true
    });
    
    logger.info('Direct copy printing completed');
    
    // Clean up temp file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      logger.warn('Could not clean up temp file', { error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error' });
    }
    
  } catch (error) {
    logger.warn('Direct copy failed, trying PowerShell fallback');
    
    // Fallback to PowerShell Out-Printer
    const fallbackCommand = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '${filePath.replace(/\\/g, '\\\\')}' -Encoding UTF8 | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`;
    
    try {
      await execAsync(fallbackCommand, { 
        maxBuffer: 10 * 1024 * 1024, 
        timeout: 30000,
        windowsHide: true
      });
      
      logger.info('PowerShell fallback printing completed');
    } catch (fallbackError) {
      throw new Error(`Both direct copy and PowerShell printing failed: ${error}, ${fallbackError}`);
    }
    
    // Clean up temp file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      logger.warn('Could not clean up temp file', { error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error' });
    }
  }
}

/**
 * Print ticket via direct file (unused but preserved)
 * Fallback method for direct file printing
 */
export async function printViaDirectFile(ticketData: string, printerName: string): Promise<void> {
  // Fallback: Write to file and use minimal PowerShell command
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filePath = path.join(tempDir, `ticket_${Date.now()}.txt`);
  
  // Write clean text as UTF-8 for reliable printing
  fs.writeFileSync(filePath, ticketData, 'utf8');
  
  logger.debug('Created temp file for direct printing', { filePath, dataLength: ticketData.length });
  
  // Use the most minimal PowerShell command possible
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  const command = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '${filePath.replace(/\\/g, '\\\\')}' -Encoding UTF8 | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`;
  
  try {
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 10 * 1024 * 1024, 
      timeout: 30000,
      windowsHide: true
    });
    
    logger.info('Direct file printing completed');
    
    // Clean up temp file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      logger.warn('Could not clean up temp file', { error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error' });
    }
    
  } catch (error) {
    throw new Error(`Direct file printing failed: ${error}`);
  }
}

