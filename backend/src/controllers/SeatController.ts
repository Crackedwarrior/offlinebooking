import { Request, Response } from 'express';
import { SeatService } from '../services/seatService';
import { SeatStatusQueryParams } from '../types/api';

export class SeatController {
  private seatService: SeatService;

  constructor(seatService: SeatService) {
    this.seatService = seatService;
  }

  /**
   * Get seat status for a specific date and show
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: SeatStatusQueryParams = req.query as any;
      const result = await this.seatService.getSeatStatus(queryParams);
      res.json(result);
    } catch (error) {
      console.error('[ERROR] Failed to get seat status:', error);
      const response = {
        success: false,
        data: null,
        message: 'Failed to retrieve seat status'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Save BMS seat status
   */
  async saveBmsSeats(req: Request, res: Response): Promise<void> {
    try {
      const { seatIds, status, date, show } = req.body;
      const result = await this.seatService.saveBmsSeats(seatIds, status, date, show);
      res.json(result);
    } catch (error) {
      console.error('[ERROR] Failed to save BMS seats:', error);
      const response = {
        success: false,
        data: null,
        message: 'Failed to save BMS seat status'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update seat status (for move operations)
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { seatUpdates, date, show } = req.body;
      const result = await this.seatService.updateSeatStatus(seatUpdates, date, show);
      res.json(result);
    } catch (error) {
      console.error('[ERROR] Failed to update seat status:', error);
      const response = {
        success: false,
        data: null,
        message: 'Failed to update seat status'
      };
      res.status(500).json(response);
    }
  }
}
