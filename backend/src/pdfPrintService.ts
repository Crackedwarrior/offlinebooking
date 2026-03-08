/**
 * English PDF Service - Backward Compatibility Wrapper
 * This file maintains backward compatibility while using the refactored services
 */

import englishPdfService from './services/pdf/englishPdfService';
import type { TicketData, PrintResult, TestResult, PrinterInfo } from './services/pdf/common/types';

// Re-export types for backward compatibility
export type { TicketData, PrintResult, TestResult, PrinterInfo };

/**
 * Wrapper class that matches the old API
 * Delegates to the new refactored service
 */
export default class PdfPrintService {
  async getAllPrinters(): Promise<PrinterInfo[]> {
    return englishPdfService.getAllPrinters();
  }

  async getThermalPrinters(): Promise<PrinterInfo[]> {
    return englishPdfService.getThermalPrinters();
  }

  async testPrinter(printerName: string): Promise<TestResult> {
    return englishPdfService.testPrinter(printerName);
  }

  async printTicket(ticketData: TicketData, printerName: string | null = null): Promise<PrintResult> {
    return englishPdfService.printTicket(ticketData, printerName);
  }
}
