/**
 * Kannada PDF Service - Backward Compatibility Wrapper
 * This file maintains backward compatibility while using the refactored services
 */

import kannadaPdfService from './services/pdf/kannadaPdfService';
import type { TicketData, PrintResult, TestResult, PrinterInfo } from './services/pdf/common/types';

// Re-export types for backward compatibility
export type { TicketData, PrintResult, TestResult, PrinterInfo };

/**
 * Wrapper class that matches the old API
 * Delegates to the new refactored service
 */
export class KannadaPdfKitService {
  async getAllPrinters(): Promise<PrinterInfo[]> {
    return kannadaPdfService.getAllPrinters();
  }

  async getThermalPrinters(): Promise<PrinterInfo[]> {
    return kannadaPdfService.getThermalPrinters();
  }

  async testPrinter(printerName: string): Promise<TestResult> {
    return kannadaPdfService.testPrinter(printerName);
  }

  async printTicket(ticketData: TicketData, printerName: string | null = null): Promise<PrintResult> {
    return kannadaPdfService.printTicket(ticketData, printerName);
  }
}
