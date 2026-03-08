/**
 * ESC/POS Controller
 * Handles ESC/POS thermal printing endpoints
 */

import { Request, Response } from 'express';
import { auditLogger } from '../../utils/auditLogger';
import { EscposPrintService } from '../../services/escpos/escposPrintService';
import { getTheaterConfig } from '../../config/theaterConfig';
import { Logger } from '../../utils/logger';

const logger = Logger.withContext('controllers/printer/EscposController');

export class EscposController {
  /**
   * Print tickets using ESC/POS
   */
  async print(req: Request, res: Response): Promise<void> {
    const { tickets, printerConfig } = req.body;
    
    logger.debug('Printing tickets via ESC/POS', {
      ticketCount: tickets?.length || 0,
      printerName: printerConfig?.name
    }, req.requestId);

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
      res.status(400).json({
        success: false,
        error: 'No tickets provided or invalid tickets format'
      });
      return;
    }

    try {
      logger.debug('Using ESC/POS service for thermal printing', {}, req.requestId);
      
      // Process each ticket
      for (const ticket of tickets) {
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
        
        logger.debug('Printing ticket', { seatId: ticketData.seatId, movieName: ticketData.movieName }, req.requestId);
        await EscposPrintService.printSilently(ticketData, printerConfig.name);
      }

      logger.info('All tickets printed successfully via ESC/POS', { ticketCount: tickets.length }, req.requestId);
      
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
      logger.error('ESC/POS printing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ticketCount: tickets?.length || 0
      }, req.requestId);
      
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
}

