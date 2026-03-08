/**
 * PDF Controller
 * Handles PDF printing endpoints (thermal PDF generation)
 */

import { Request, Response } from 'express';
import PdfPrintService from '../../pdfPrintService';
import { KannadaPdfKitService } from '../../kannadaPdfKitService';
import { getTheaterConfig } from '../../config/theaterConfig';
import { formatTicketData } from '../../services/pdf/common/ticketFormatter';
import { KannadaTicketGenerator } from '../../services/pdf/generators/kannadaTicketGenerator';
import { EnglishTicketGenerator } from '../../services/pdf/generators/englishTicketGenerator';
import path from 'path';
import * as fs from 'fs';
import { Logger } from '../../utils/logger';

const logger = Logger.withContext('controllers/printer/PdfController');

export class PdfController {
  private pdfPrintService: PdfPrintService;
  private kannadaPdfKitService: KannadaPdfKitService;

  constructor() {
    this.pdfPrintService = new PdfPrintService();
    this.kannadaPdfKitService = new KannadaPdfKitService();
  }

  /**
   * Print ticket using thermal printer (PDF generation)
   */
  async printThermal(req: Request, res: Response): Promise<void> {
    const { ticketData, printerName, movieSettings } = req.body;
    
    if (!ticketData) {
      res.status(400).json({
        success: false,
        error: 'Ticket data is required'
      });
      return;
    }

    // Check if movie should be printed in Kannada
    const shouldPrintInKannada = movieSettings?.printInKannada === true;
    
    logger.debug('Printing ticket', {
      language: shouldPrintInKannada ? 'Kannada' : 'English',
      printerName
    }, req.requestId);

    // Check if this is a web request
    const isWebRequest = printerName === 'web-pdf-printer';
    
    if (isWebRequest) {
      // For web requests, generate PDF and return it directly
      logger.debug('Web request detected - generating PDF for download', {}, req.requestId);
      
      try {
        // Determine temp directory
        const tempDir = path.join(__dirname, '..', '..', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        let pdfPath: string;
        if (shouldPrintInKannada) {
          const formattedTicket = formatTicketData(ticketData, true, false);
          const generator = new KannadaTicketGenerator(tempDir);
          pdfPath = await generator.generatePDF(formattedTicket);
        } else {
          const formattedTicket = formatTicketData(ticketData, false, true);
          const generator = new EnglishTicketGenerator(tempDir);
          pdfPath = await generator.generatePDF(formattedTicket);
        }
        
        logger.debug('PDF generated for web download', { pdfPath }, req.requestId);
        
        // Read PDF file and send as response
        const pdfBuffer = fs.readFileSync(pdfPath);
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketData.ticketId || Date.now()}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send PDF buffer
        res.send(pdfBuffer);
        
        // Clean up PDF file after a delay
        setTimeout(() => {
          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
            logger.debug('PDF file cleaned up', { pdfPath }, req.requestId);
          }
        }, 30000);
        
        logger.info('PDF sent to web client successfully', {}, req.requestId);
        return;
        
      } catch (error) {
        logger.error('Error generating PDF for web', {
          error: error instanceof Error ? error.message : 'Unknown error'
        }, req.requestId);
        res.status(500).json({
          success: false,
          error: 'Failed to generate PDF for web download',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
      }
    }
    
    // For desktop requests, use the original printing logic
    try {
      logger.debug('Desktop request detected - using thermal printer service', {}, req.requestId);
      
      let printResult;
      if (shouldPrintInKannada) {
        logger.debug('Using KannadaPdfKitService for desktop printing', {}, req.requestId);
        printResult = await this.kannadaPdfKitService.printTicket(ticketData, printerName);
      } else {
        logger.debug('Using PdfPrintService for desktop printing', {}, req.requestId);
        printResult = await this.pdfPrintService.printTicket(ticketData, printerName);
      }
      
      logger.debug('Desktop print result', { success: printResult.success }, req.requestId);
      
      if (printResult.success) {
        res.json({
          success: true,
          message: printResult.message || 'Ticket printed successfully',
          printer: printResult.printer || printerName
        });
      } else {
        res.status(500).json({
          success: false,
          error: printResult.error || 'Failed to print ticket'
        });
      }
      
    } catch (error) {
      logger.error('Error in desktop printing', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, req.requestId);
      res.status(500).json({
        success: false,
        error: 'Desktop printing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

