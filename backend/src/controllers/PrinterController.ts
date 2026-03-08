/**
 * Printer Controller
 * Main orchestrator - routes to specific controllers
 * 
 * Refactored: Split into ThermalController, EscposController, PdfController
 * See: controllers/printer/
 */

import { Request, Response } from 'express';
import { BaseController } from './printer/BaseController';
import { ThermalController } from './printer/ThermalController';
import { EscposController } from './printer/EscposController';
import { PdfController } from './printer/PdfController';

export class PrinterController {
  private baseController: BaseController;
  private thermalController: ThermalController;
  private escposController: EscposController;
  private pdfController: PdfController;

  constructor() {
    this.baseController = new BaseController();
    this.thermalController = new ThermalController();
    this.escposController = new EscposController();
    this.pdfController = new PdfController();
  }

  // Base controller methods
  async list(req: Request, res: Response): Promise<void> {
    return this.baseController.list(req, res);
  }

  async test(req: Request, res: Response): Promise<void> {
    return this.baseController.test(req, res);
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    return this.baseController.getStatus(req, res);
  }

  async getQueue(req: Request, res: Response): Promise<void> {
    return this.baseController.getQueue(req, res);
  }

  // ESC/POS controller methods
  async print(req: Request, res: Response): Promise<void> {
    return this.escposController.print(req, res);
  }

  // Thermal controller methods
  async getThermalList(req: Request, res: Response): Promise<void> {
    return this.thermalController.getThermalList(req, res);
  }

  async testThermal(req: Request, res: Response): Promise<void> {
    return this.thermalController.testThermal(req, res);
  }

  // PDF controller methods
  async printThermal(req: Request, res: Response): Promise<void> {
    return this.pdfController.printThermal(req, res);
  }
}
