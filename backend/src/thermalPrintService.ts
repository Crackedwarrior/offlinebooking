/**
 * Thermal Print Service
 * Main service orchestrator - delegates to modular services
 * 
 * Refactored: Extracted into detection, formatter, and generator modules
 * See: services/thermal/
 */

import { ThermalTicketGenerator } from './services/thermal/generator';
import type { PrinterInfo } from './services/thermal/detection';
import type { PrintResult, TestResult } from './services/thermal/generator';
import type { TicketData } from './services/thermal/formatter';

// Re-export types for backward compatibility
export type { PrinterInfo, PrintResult, TestResult, TicketData };

/**
 * Thermal Print Service Class
 * Wrapper that maintains backward compatibility
 */
class ThermalPrintService {
  private generator: ThermalTicketGenerator;

  constructor() {
    this.generator = new ThermalTicketGenerator();
  }

  async getAllPrinters(): Promise<PrinterInfo[]> {
    return this.generator.getAllPrinters();
  }

  async getThermalPrinters(): Promise<PrinterInfo[]> {
    return this.generator.getThermalPrinters();
  }

  async testPrinter(printerName: string): Promise<TestResult> {
    return this.generator.testPrinter(printerName);
  }

  async printTicket(ticketData: TicketData, printerName: string | null = null): Promise<PrintResult> {
    return this.generator.printTicket(ticketData, printerName);
  }

  async getPrinterStatus(printerName: string): Promise<any> {
    return this.generator.getPrinterStatus(printerName);
  }
}

export default ThermalPrintService;
