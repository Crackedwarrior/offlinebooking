import { Request, Response } from 'express';
import ticketIdService from '../ticketIdService';
import { ApiResponse } from '../types/api';
import { ValidationError } from '../utils/errors';

export class TicketIdController {
  /**
   * Get current ticket ID
   */
  async getCurrent(req: Request, res: Response): Promise<void> {
    try {
      const config = ticketIdService.getConfig();
      const currentTicketId = ticketIdService.getCurrentTicketId();
      
      const response: ApiResponse<{ currentId: number; currentTicketId: string; config: any }> = {
        success: true,
        data: {
          currentId: config.currentId,
          currentTicketId,
          config
        },
        message: 'Current ticket ID retrieved successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('[ERROR] Failed to get current ticket ID:', error);
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: 'Failed to retrieve current ticket ID'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Reset ticket ID to a new value
   */
  async reset(req: Request, res: Response): Promise<void> {
    try {
      const { newId } = req.body;
      
      if (typeof newId !== 'number' || newId < 0) {
        throw new ValidationError('newId must be a positive number');
      }
      
      ticketIdService.resetTicketId(newId);
      const currentTicketId = ticketIdService.getCurrentTicketId();
      
      const response: ApiResponse<{ currentId: number; currentTicketId: string }> = {
        success: true,
        data: {
          currentId: newId,
          currentTicketId
        },
        message: `Ticket ID reset to ${currentTicketId}`
      };
      
      res.json(response);
    } catch (error) {
      console.error('[ERROR] Failed to reset ticket ID:', error);
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: 'Failed to reset ticket ID'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get next ticket ID
   */
  async getNext(req: Request, res: Response): Promise<void> {
    try {
      const nextTicketId = ticketIdService.getNextTicketId();
      
      const response: ApiResponse<{ nextTicketId: string }> = {
        success: true,
        data: {
          nextTicketId
        },
        message: 'Next ticket ID generated successfully'
      };
      
      res.json(response);
    } catch (error) {
      console.error('[ERROR] Failed to get next ticket ID:', error);
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: 'Failed to generate next ticket ID'
      };
      res.status(500).json(response);
    }
  }
}
