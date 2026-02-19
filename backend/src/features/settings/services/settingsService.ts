import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../../../types/api';

export class SettingsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get default settings structure
   */
  getDefaultSettings() {
    return {
      movies: [],
      pricing: {},
      showTimes: [
        { key: 'MORNING', label: 'Morning Show', startTime: '--:-- AM', endTime: '--:-- AM', enabled: true },
        { key: 'MATINEE', label: 'Matinee Show', startTime: '--:-- PM', endTime: '--:-- PM', enabled: true },
        { key: 'EVENING', label: 'Evening Show', startTime: '--:-- PM', endTime: '--:-- PM', enabled: true },
        { key: 'NIGHT', label: 'Night Show', startTime: '--:-- PM', endTime: '--:-- AM', enabled: true }
      ]
    };
  }

  /**
   * Load settings from database with fallback to defaults
   */
  async loadSettings(): Promise<ApiResponse<any>> {
    try {
      console.log('[SETTINGS] Loading settings from database...');
      
      // Try to load from database first
      try {
        const settings = await this.prisma.settings.findUnique({
          where: { key: 'theater-settings' }
        });
        
        if (settings) {
          console.log('[SETTINGS] Loaded from database');
          
          return {
            success: true,
            data: JSON.parse(settings.value), // Parse the JSON string
            message: 'Settings loaded from database'
          };
        }
      } catch (dbError) {
        console.error('[ERROR] Database load failed:', dbError);
        console.log('[WARN] Falling back to default settings');
      }
      
      // Fallback to default settings if database fails or no data
      console.log('[SETTINGS] Using default settings (no database data)');
      
      const defaultSettings = this.getDefaultSettings();

      return {
        success: true,
        data: defaultSettings,
        message: 'Settings loaded (default values)'
      };
    } catch (error) {
      console.error('[ERROR] Failed to get settings:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to retrieve settings'
      };
    }
  }

  /**
   * Save settings to database
   */
  async saveSettings(movies: any[], pricing: any, showTimes: any[]): Promise<ApiResponse<null>> {
    try {
      console.log('[SETTINGS] Received settings update:', { 
        moviesCount: movies?.length || 0, 
        pricingKeys: Object.keys(pricing || {}).length,
        showTimesCount: showTimes?.length || 0 
      });
      
      // Save to database using Prisma
      try {
        await this.prisma.settings.upsert({
          where: { key: 'theater-settings' },
          update: {
            value: JSON.stringify({ movies, pricing, showTimes }),
            updatedAt: new Date()
          },
          create: {
            key: 'theater-settings',
            value: JSON.stringify({ movies, pricing, showTimes })
          }
        });
        
        console.log('[SETTINGS] Successfully saved to database');
        
        return {
          success: true,
          data: null,
          message: 'Settings saved to database successfully'
        };
        
      } catch (dbError) {
        // Database error? Still return success (localStorage will work)
        console.error('[ERROR] Database save failed:', dbError);
        console.log('[WARN] Settings will use localStorage fallback');
        
        return {
          success: false,
          data: null,
          message: 'Failed to save to database, using localStorage fallback'
        };
      }
    } catch (error) {
      console.error('[ERROR] Failed to update settings:', error);
      return {
        success: false,
        data: null,
        message: 'Failed to update settings'
      };
    }
  }
}
