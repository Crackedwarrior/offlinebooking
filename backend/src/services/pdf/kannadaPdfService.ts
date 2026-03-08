/**
 * Kannada PDF Service (Refactored)
 * Lightweight service that uses extracted utilities and generators
 */

import path from 'path';
import fs from 'fs';
import { getAllPrinters, getThermalPrinters, printPDF, testPrinter } from './common/printerUtils';
import { formatTicketData } from './common/ticketFormatter';
import { PDFWorkerPool } from './workers/pdfWorkerPool';
import { KannadaTicketGenerator } from './generators/kannadaTicketGenerator';
import type { TicketData, PrintResult, TestResult, PrinterInfo } from './common/types';

class KannadaPdfService {
  private tempDir: string;
  private workerPool: PDFWorkerPool | null = null;
  private useWorkers: boolean;

  constructor(useWorkers: boolean = true) {
    // Determine temp directory
    this.tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    this.useWorkers = useWorkers;
    
    // Initialize worker pool if enabled
    if (this.useWorkers) {
      try {
        this.workerPool = new PDFWorkerPool(4, 100, 30000, this.tempDir);
        console.log('[PRINT] Kannada PDF Worker Pool initialized');
      } catch (error) {
        console.warn('[WARNING] Failed to initialize worker pool, falling back to synchronous generation:', error);
        this.useWorkers = false;
      }
    }
  }

  async getAllPrinters(): Promise<PrinterInfo[]> {
    return getAllPrinters();
  }

  async getThermalPrinters(): Promise<PrinterInfo[]> {
    return getThermalPrinters();
  }

  async testPrinter(printerName: string): Promise<TestResult> {
    return testPrinter(printerName, this.tempDir);
  }

  async printTicket(ticketData: TicketData, printerName: string | null = null): Promise<PrintResult> {
    console.log('[PRINT] KannadaPdfService.printTicket called!');
    console.log('[PRINT] Ticket data received:', ticketData);

    try {
      // Auto-detect printer if not specified
      if (!printerName) {
        const thermalPrinters = await this.getThermalPrinters();
        if (thermalPrinters.length > 0) {
          printerName = thermalPrinters[0].name;
          console.log(`[PRINT] Auto-selected printer: ${printerName}`);
        } else {
          throw new Error('No thermal printers found');
        }
      }

      let pdfPath: string;

      // Generate PDF using worker pool or synchronous generator
      if (this.useWorkers && this.workerPool) {
        console.log('[PRINT] Generating PDF using worker pool...');
        pdfPath = await this.workerPool.generatePDF(ticketData, 'kannada');
      } else {
        console.log('[PRINT] Generating PDF synchronously...');
        // Fallback to synchronous generation
        const formattedTicket = formatTicketData(ticketData, true, false);
        const generator = new KannadaTicketGenerator(this.tempDir);
        pdfPath = await generator.generatePDF(formattedTicket);
      }

      console.log(`[PRINT] PDF file created: ${pdfPath}`);

      // Print using SumatraPDF
      const printResult = await printPDF(pdfPath, printerName);

      // Clean up PDF file after a delay
      setTimeout(() => {
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
          console.log('[PRINT] PDF file cleaned up');
        }
      }, 30000); // 30 second delay

      return printResult;
    } catch (error) {
      console.error('[ERROR] PDF print error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        printer: printerName || undefined
      };
    }
  }

  /**
   * Shutdown worker pool (call on application shutdown)
   */
  async shutdown(): Promise<void> {
    if (this.workerPool) {
      await this.workerPool.shutdown();
      this.workerPool = null;
    }
  }

  /**
   * Get worker pool statistics
   */
  getWorkerStats() {
    return this.workerPool?.getStats() || null;
  }
}

// Export singleton instance
export const kannadaPdfService = new KannadaPdfService(false);
export default kannadaPdfService;

