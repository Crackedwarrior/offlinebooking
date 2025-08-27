import fs from 'fs';
import path from 'path';

interface TicketIdConfig {
  currentId: number;
  prefix: string;
  padding: number;
}

class TicketIdService {
  private configPath: string;
  private config: TicketIdConfig;

  constructor() {
    this.configPath = path.join(process.cwd(), 'ticketId.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): TicketIdConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading ticket ID config:', error);
    }

    // Default configuration
    return {
      currentId: 0, // Will start from 1 on first use
      prefix: 'TKT',
      padding: 6
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving ticket ID config:', error);
    }
  }

  /**
   * Get the next ticket ID
   */
  public getNextTicketId(): string {
    this.config.currentId++;
    this.saveConfig();
    
    return `${this.config.prefix}${this.config.currentId.toString().padStart(this.config.padding, '0')}`;
  }

  /**
   * Get the current ticket ID without incrementing
   */
  public getCurrentTicketId(): string {
    return `${this.config.prefix}${this.config.currentId.toString().padStart(this.config.padding, '0')}`;
  }

  /**
   * Reset the ticket ID counter to a specific number
   */
  public resetTicketId(newId: number): void {
    if (newId < 0) {
      throw new Error('Ticket ID must be a positive number');
    }
    
    this.config.currentId = newId;
    this.saveConfig();
  }

  /**
   * Get the current configuration
   */
  public getConfig(): TicketIdConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  public updateConfig(config: Partial<TicketIdConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }
}

// Export singleton instance
export const ticketIdService = new TicketIdService();
export default ticketIdService;
