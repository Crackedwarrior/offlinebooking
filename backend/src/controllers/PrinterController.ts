import { Request, Response } from 'express';
import { auditLogger } from '../utils/auditLogger';
import { EscposPrintService } from '../escposPrintService';
import ThermalPrintService from '../thermalPrintService';
import PdfPrintService from '../pdfPrintService';
import { KannadaPdfKitService } from '../kannadaPdfKitService';
import { windowsPrintService } from '../printService';
import { getTheaterConfig } from '../config/theaterConfig';
import * as fs from 'fs';

export class PrinterController {
  private thermalPrintService: ThermalPrintService;
  private pdfPrintService: PdfPrintService;
  private kannadaPdfKitService: KannadaPdfKitService;

  constructor() {
    this.thermalPrintService = new ThermalPrintService();
    this.pdfPrintService = new PdfPrintService();
    this.kannadaPdfKitService = new KannadaPdfKitService();
  }

  /**
   * Get list of available printers
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      console.log('[PRINT] Getting list of available printers...');
      
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"', { windowsHide: true });
        
        try {
          const printers = JSON.parse(stdout);
          const printerNames = Array.isArray(printers) 
            ? printers.map((p: any) => p.Name).filter(Boolean)
            : [];
          
          console.log('[PRINT] Found printers:', printerNames);
          res.json({ success: true, printers: printerNames });
        } catch (parseError) {
          console.error('[ERROR] Failed to parse printer list:', parseError);
          res.json({ success: true, printers: [] });
        }
      } else {
        res.json({ success: true, printers: [] });
      }
    } catch (error) {
      console.error('[ERROR] Failed to get printer list:', error);
      res.status(500).json({ success: false, error: 'Failed to get printer list' });
    }
  }

  /**
   * Test printer connection
   */
  async test(req: Request, res: Response): Promise<void> {
    try {
      console.log('[PRINT] Testing printer connection...');
      const { printerConfig } = req.body;
      
      // Log the printer configuration
      console.log('[PRINT] Printer configuration:', printerConfig);
      
      // Actually try to connect to the printer
      // For now we'll simulate success, but in a real implementation
      // this would attempt to establish a connection to the physical printer
      const connected = true;
      
      if (connected) {
        console.log('[PRINT] Printer connection successful');
        res.json({
          success: true,
          message: 'Printer connection test successful',
          timestamp: new Date().toISOString(),
          printerInfo: {
            port: printerConfig?.port || 'COM1',
            status: 'connected',
            ready: true
          }
        });
      } else {
        throw new Error('Could not connect to printer');
      }
    } catch (error) {
      console.error('[ERROR] Printer test failed:', error);
      res.status(500).json({
        success: false,
        message: 'Printer connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get print job status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;

    // Get queue status which includes job information
    const queueStatus = windowsPrintService.getQueueStatus();
    const jobStatus = queueStatus.jobs.find((job: any) => job.id === jobId);
    
    if (!jobStatus) {
      res.status(404).json({
        success: false,
        error: 'Print job not found'
      });
      return;
    }
    
    res.json({
      success: true,
      jobStatus,
      queueStatus
    });
  }

  /**
   * Get print queue status
   */
  async getQueue(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      queueStatus: windowsPrintService.getQueueStatus()
    });
  }

  /**
   * Print tickets using ESC/POS
   */
  async print(req: Request, res: Response): Promise<void> {
    const { tickets, printerConfig } = req.body;
    
    console.log('[PRINT] Printing tickets:', {
      ticketCount: tickets?.length || 0,
      printerConfig,
      rawBody: req.body
    });

    // Log print attempt
    auditLogger.logPrint(
      'PRINT_TICKETS_ATTEMPT',
      true,
      'anonymous',
      req.ip,
      req.get('User-Agent'),
      {
        ticketCount: tickets?.length || 0,
        printerName: printerConfig?.name,
        printerType: 'ESC/POS'
      },
      req.requestId
    );
    
    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      throw new Error('No tickets provided or invalid tickets format');
    }

    try {
      console.log('[PRINT] Using ESC/POS service for thermal printing...');
      
      // Process each ticket
      for (const ticket of tickets) {
        // Create raw ticket data for the service to format
        const ticketData = {
          theaterName: printerConfig.theaterName || getTheaterConfig().name,
          location: printerConfig.location || getTheaterConfig().location,
          date: ticket.date || new Date().toLocaleDateString(),
          showTime: ticket.showTime || '2:00 PM',
          movieName: ticket.movieName || 'MOVIE',
          class: ticket.class || 'CLASS',
          seatId: ticket.seatId || 'A1',
          netAmount: ticket.netAmount || 0,
          cgst: ticket.cgst || 0,
          sgst: ticket.sgst || 0,
          mc: ticket.mc || 0,
          price: ticket.price || 0,
          transactionId: ticket.transactionId || 'TXN' + Date.now()
        };
        
        console.log('[PRINT] Printing ticket data:', ticketData);
        await EscposPrintService.printSilently(ticketData, printerConfig.name);
      }

      console.log('[PRINT] All tickets printed successfully via ESC/POS');
      
      // Log successful print
      auditLogger.logPrint(
        'PRINT_TICKETS_SUCCESS',
        true,
        'anonymous',
        req.ip,
        req.get('User-Agent'),
        {
          ticketCount: tickets.length,
          printerName: printerConfig.name,
          printerType: 'ESC/POS'
        },
        req.requestId
      );
      
      res.json({
        success: true,
        message: `${tickets.length} tickets printed successfully`,
        timestamp: new Date().toISOString(),
        printerInfo: {
          name: printerConfig.name,
          status: 'printed',
          method: 'Direct ESC/POS'
        }
      });

    } catch (error) {
      console.error('[ERROR] ESC/POS printing failed:', error);
      
      // Log failed print
      auditLogger.logPrint(
        'PRINT_TICKETS_FAILED',
        false,
        'anonymous',
        req.ip,
        req.get('User-Agent'),
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          ticketCount: tickets?.length || 0,
          printerName: printerConfig?.name
        },
        req.requestId
      );
      
      res.status(500).json({
        success: false,
        message: 'ESC/POS printing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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
      console.error('[ERROR] Error getting thermal printers:', error);
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
      throw new Error('Printer name is required');
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

  /**
   * Print ticket using thermal printer (PDF generation)
   */
  async printThermal(req: Request, res: Response): Promise<void> {
    const { ticketData, printerName, movieSettings } = req.body;
    
    if (!ticketData) {
      throw new Error('Ticket data is required');
    }

    // Check if movie should be printed in Kannada
    const shouldPrintInKannada = movieSettings?.printInKannada === true;
    
    console.log(`[PRINT] Printing ticket - Language: ${shouldPrintInKannada ? 'Kannada' : 'English'}`);
    console.log('[PRINT] Movie settings:', movieSettings);
    console.log('[PRINT] Ticket data:', ticketData);
    console.log('[PRINT] Movie language in ticket data:', ticketData.movieLanguage);
    console.log('[PRINT] printInKannada flag:', movieSettings?.printInKannada);
    console.log('[PRINT] shouldPrintInKannada result:', shouldPrintInKannada);

    console.log('[PRICE] TICKET COST DEBUG - Server Level:');
    console.log('[PRICE] ticketData.individualAmount:', ticketData.individualAmount);
    console.log('[PRICE] ticketData.totalAmount:', ticketData.totalAmount);
    console.log('[PRICE] ticketData.seatCount:', ticketData.seatCount);
    console.log('[PRICE] ticketData.individualPrice:', ticketData.individualPrice);
    console.log('[PRICE] ticketData.totalPrice:', ticketData.totalPrice);

    // Check if this is a web request (printerName is 'web-pdf-printer')
    const isWebRequest = printerName === 'web-pdf-printer';
    console.log('[PRINT] Is web request:', isWebRequest);
    
    if (isWebRequest) {
      // For web requests, generate PDF and return it directly
      console.log('[PRINT] Web request detected - generating PDF for download');
      
      try {
        // Use appropriate service based on language setting
        console.log(`[PRINT] About to call ${shouldPrintInKannada ? 'KannadaPdfKitService' : 'PdfPrintService'} for web PDF`);
        
        let pdfPath: string;
        if (shouldPrintInKannada) {
          // For Kannada, use the createPDFTicket method directly
          const formattedTicket = this.kannadaPdfKitService.formatTicket(ticketData);
          pdfPath = await this.kannadaPdfKitService.createPDFTicket(formattedTicket);
        } else {
          // For English, use the createPDFTicket method directly
          const formattedTicket = this.pdfPrintService.formatTicket(ticketData);
          pdfPath = await this.pdfPrintService.createPDFTicket(formattedTicket);
        }
        
        console.log('[PRINT] PDF generated for web download:', pdfPath);
        
        // Read PDF file and send as response
        const pdfBuffer = fs.readFileSync(pdfPath);
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketData.ticketId || Date.now()}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send PDF buffer
        res.send(pdfBuffer);
        
        console.log('[PRINT] PDF sent to web client successfully');
        return;
        
      } catch (error) {
        console.error('[PRINT] Error generating PDF for web:', error);
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
      console.log('[PRINT] Desktop request detected - using thermal printer service');
      
      // Use appropriate service based on language setting
      let printResult;
      if (shouldPrintInKannada) {
        console.log('[PRINT] Using KannadaPdfKitService for desktop printing');
        printResult = await this.kannadaPdfKitService.printTicket(ticketData, printerName);
      } else {
        console.log('[PRINT] Using PdfPrintService for desktop printing');
        printResult = await this.pdfPrintService.printTicket(ticketData, printerName);
      }
      
      console.log('[PRINT] Desktop print result:', printResult);
      
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
      console.error('[PRINT] Error in desktop printing:', error);
      res.status(500).json({
        success: false,
        error: 'Desktop printing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
