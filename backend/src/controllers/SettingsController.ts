import { Request, Response } from 'express';
import { SettingsService } from '../services/settingsService';
import { ApiResponse } from '../types/api';

export class SettingsController {
  private settingsService: SettingsService;

  constructor(settingsService: SettingsService) {
    this.settingsService = settingsService;
  }

  /**
   * Get all settings (movies, pricing, show times)
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.settingsService.loadSettings();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('[ERROR] Failed to get settings:', error);
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: 'Failed to retrieve settings'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update settings (movies, pricing, show times)
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { movies, pricing, showTimes } = req.body;
      
      const result = await this.settingsService.saveSettings(movies, pricing, showTimes);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('[ERROR] Failed to update settings:', error);
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        message: 'Failed to update settings'
      };
      res.status(500).json(response);
    }
  }
}
