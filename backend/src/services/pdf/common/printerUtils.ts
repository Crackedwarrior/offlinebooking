/**
 * Common printer utilities
 * Extracted from kannadaPdfKitService.ts and pdfPrintService.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import type { PrinterInfo, PrintResult, TestResult } from './types';

const execAsync = promisify(exec);

/**
 * Get all available printers using PowerShell
 */
export async function getAllPrinters(): Promise<PrinterInfo[]> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, Port, PrinterStatus | ConvertTo-Json"', { 
        windowsHide: true,
        timeout: 10000,
        maxBuffer: 1024 * 1024
      });
      
      try {
        const printers = JSON.parse(stdout);
        const printerList = Array.isArray(printers) ? printers : [printers];
        
        console.log('[PRINT] Found printers:', printerList.map((p: any) => p.Name));
        return printerList.map((p: any) => ({
          name: p.Name,
          port: p.Port || 'Unknown',
          status: p.PrinterStatus || 'Unknown'
        }));
      } catch (parseError) {
        console.error('[ERROR] Failed to parse printer list:', parseError);
        return [];
      }
    } else {
      // For non-Windows systems, return empty array for now
      return [];
    }
  } catch (error) {
    console.error('[ERROR] Error getting printers:', error);
    return [];
  }
}

/**
 * Get thermal printers specifically
 * Uses two methods: JSON parsing (preferred) and line parsing (fallback)
 */
export async function getThermalPrinters(): Promise<PrinterInfo[]> {
  try {
    // Try JSON method first (from pdfPrintService)
    const allPrinters = await getAllPrinters();
    const thermalKeywords = ['thermal', 'pos', 'receipt', 'epson', 'star', 'citizen'];
    
    const filtered = allPrinters.filter(printer => 
      thermalKeywords.some(keyword => 
        printer.name.toLowerCase().includes(keyword)
      )
    );

    if (filtered.length > 0) {
      console.log(`[PRINT] Found ${filtered.length} thermal printers (JSON method)`);
      return filtered;
    }

    // Fallback to line parsing method (from kannadaPdfKitService)
    console.log('[PRINT] Trying fallback method for thermal printers...');
    const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus"', {
      timeout: 10000,
      maxBuffer: 1024 * 1024
    });

    const lines = stdout.split('\n').filter(line => line.trim());
    const printers: PrinterInfo[] = [];

    for (let i = 2; i < lines.length; i++) { // Skip header lines
      const line = lines[i].trim();
      if (line) {
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          const name = parts[0];
          const driverName = parts[1];
          const portName = parts[2];
          const status = parts[3];

          // Check if it's a thermal printer
          if (name.toLowerCase().includes('epson') || 
              name.toLowerCase().includes('thermal') || 
              name.toLowerCase().includes('receipt') ||
              driverName.toLowerCase().includes('thermal') ||
              driverName.toLowerCase().includes('receipt')) {
            
            printers.push({
              name: name,
              port: portName,
              status: status
            });
          }
        }
      }
    }

    console.log(`[PRINT] Found ${printers.length} thermal printers (fallback method)`);
    return printers;

  } catch (error) {
    console.log('[ERROR] Error scanning printers:', error);
    return [];
  }
}

/**
 * Find SumatraPDF executable path
 * Searches multiple common installation locations
 */
export function findSumatraPDF(): string | null {
  const sumatraPaths = [
    'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
    'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
    path.join(process.env.LOCALAPPDATA || '', 'SumatraPDF\\SumatraPDF.exe'),
    path.join(process.env.USERPROFILE || '', 'AppData\\Local\\SumatraPDF\\SumatraPDF.exe'),
    'C:\\Users\\Hi\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe',
    path.join(process.env.PROGRAMFILES || '', 'SumatraPDF\\SumatraPDF.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'SumatraPDF\\SumatraPDF.exe')
  ];
  
  for (const sumatraPath of sumatraPaths) {
    if (fs.existsSync(sumatraPath)) {
      console.log(`[PRINT] Found SumatraPDF at: ${sumatraPath}`);
      return sumatraPath;
    }
  }
  
  return null;
}

/**
 * Validate printer name to prevent command injection
 */
export function validatePrinterName(printerName: string): boolean {
  if (!printerName || 
      printerName.includes('"') || 
      printerName.includes(';') || 
      printerName.includes('|') || 
      printerName.includes('&')) {
    return false;
  }
  return true;
}

/**
 * Print PDF using SumatraPDF
 */
export async function printPDF(pdfPath: string, printerName: string): Promise<PrintResult> {
  try {
    console.log(`[PRINT] Printing PDF to ${printerName}...`);
    
    // Validate printer name
    if (!validatePrinterName(printerName)) {
      throw new Error('Invalid printer name: contains forbidden characters');
    }
    
    // Find SumatraPDF
    const sumatraPath = findSumatraPDF();
    if (!sumatraPath) {
      throw new Error('SumatraPDF not found. Please install SumatraPDF for thermal printing.');
    }
    
    // Execute print command
    const printCommand = `"${sumatraPath}" -print-to "${printerName}" "${pdfPath}"`;
    console.log('[PRINT] Executing print command...');
    
    const { stdout, stderr } = await execAsync(printCommand, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true
    });
    
    if (stderr) {
      console.log('[PRINT] Print stderr:', stderr);
    }
    
    console.log('[PRINT] SumatraPDF print executed successfully!');
    console.log('[PRINT] Print output:', stdout);
    
    return {
      success: true,
      printer: printerName,
      message: 'Ticket printed successfully using SumatraPDF'
    };
    
  } catch (error) {
    console.log('[ERROR] PDF print failed:', error);
    return {
      success: false,
      error: `Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Test printer connection using Windows print command
 */
export async function testPrinter(printerName: string, tempDir: string): Promise<TestResult> {
  try {
    console.log(`[PRINT] Testing printer: ${printerName}`);
    
    // Validate printer name
    if (!validatePrinterName(printerName)) {
      throw new Error('Invalid printer name: contains forbidden characters');
    }
    
    // Create a simple test file
    const testFile = path.join(tempDir, `test_${Date.now()}.txt`);
    const testContent = `Test print from ${printerName}\nDate: ${new Date().toLocaleString()}\n\n`;
    fs.writeFileSync(testFile, testContent);
    
    // Try to print using PowerShell
    const psCommand = `powershell -Command "Start-Process -FilePath '${testFile}' -Verb Print"`;
    await execAsync(psCommand, { windowsHide: true });
    
    // Clean up test file
    setTimeout(() => {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }, 10000);
    
    return {
      success: true,
      message: `Test print sent to ${printerName}`
    };
  } catch (error) {
    console.error(`[ERROR] Test print failed for ${printerName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

