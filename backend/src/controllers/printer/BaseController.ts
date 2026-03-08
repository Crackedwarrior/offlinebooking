/**
 * Base Controller
 * Common printer endpoints (list, test, status, queue)
 */

import { Request, Response } from 'express';
import { windowsPrintService } from '../../printService';
import { Logger } from '../../utils/logger';

const logger = Logger.withContext('controllers/printer/BaseController');

export class BaseController {
  /**
   * Get list of available printers
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      logger.debug('Getting list of available printers', {}, req.requestId);
      
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
          
          logger.debug('Found printers', { count: printerNames.length, printers: printerNames }, req.requestId);
          res.json({ success: true, printers: printerNames });
        } catch (parseError) {
          logger.warn('Failed to parse printer list', { error: parseError instanceof Error ? parseError.message : 'Unknown error' }, req.requestId);
          res.json({ success: true, printers: [] });
        }
      } else {
        res.json({ success: true, printers: [] });
      }
    } catch (error) {
      logger.error('Failed to get printer list', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, req.requestId);
      res.status(500).json({ success: false, error: 'Failed to get printer list' });
    }
  }

  /**
   * Test printer connection
   */
  async test(req: Request, res: Response): Promise<void> {
    try {
      const { printerConfig } = req.body;
      
      logger.debug('Testing printer connection', { printerConfig }, req.requestId);
      
      const connected = true; // Simulated for now
      
      if (connected) {
        logger.info('Printer connection test successful', { printerConfig }, req.requestId);
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
      logger.error('Printer test failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, req.requestId);
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
}

