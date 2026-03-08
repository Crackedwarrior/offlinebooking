/**
 * Thermal Controller
 * Handles thermal printer-specific endpoints
 */

import { Request, Response } from 'express';
import ThermalPrintService from '../../thermalPrintService';
import { Logger } from '../../utils/logger';

const logger = Logger.withContext('controllers/printer/ThermalController');

export class ThermalController {
  private thermalPrintService: ThermalPrintService;

  constructor() {
    this.thermalPrintService = new ThermalPrintService();
  }

  /**
   * Get thermal printers list
   */
  async getThermalList(req: Request, res: Response): Promise<void> {
    try {
      const allPrinters = await this.thermalPrintService.getAllPrinters();
      const thermalPrinters = await this.thermalPrintService.getThermalPrinters();
      
      res.json({
        success: true,
        allPrinters,
        thermalPrinters,
        recommended: thermalPrinters.length > 0 ? thermalPrinters[0].name : null
      });
    } catch (error) {
      logger.error('Error getting thermal printers', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, req.requestId);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test thermal printer
   */
  async testThermal(req: Request, res: Response): Promise<void> {
    const { printerName } = req.body;
    
    if (!printerName) {
      res.status(400).json({
        success: false,
        error: 'Printer name is required'
      });
      return;
    }

    const result = await this.thermalPrintService.testPrinter(printerName);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Printer test successful for ${printerName}`,
        printer: printerName
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        printer: printerName
      });
    }
  }
}

