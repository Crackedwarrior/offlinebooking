import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { performanceMonitor } from '../utils/performanceMonitor';

/**
 * Database Connection Manager
 * Handles connection pooling, retry logic, and graceful shutdown
 */
export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private prisma: PrismaClient;
  private isConnected: boolean = false;
  private connectionRetries: number = 0;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 2000;

        private constructor() {
          this.prisma = new PrismaClient({
            datasources: {
              db: {
                url: config.database.url,
              },
            },
            log: config.server.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
          });

          // Database connection successful
          console.log('[DB] Prisma client initialized successfully');
        }

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<boolean> {
    try {
      console.log(`[DB] Testing database connection... (attempt ${this.connectionRetries + 1}/${this.maxRetries + 1})`);
      
      // Test basic connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      console.log('[DB] Database connection successful');
      
      // Check if database has tables
      const tableCount = await this.prisma.$queryRaw`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`;
      console.log('[DB] Database tables:', tableCount);
      
      // Test a simple query to ensure database is functional
      await this.prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' LIMIT 1`;
      
      this.isConnected = true;
      this.connectionRetries = 0;
      return true;
    } catch (error) {
      console.error(`[ERROR] Database connection failed (attempt ${this.connectionRetries + 1}):`, error);
      
      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        console.log(`[DB] Retrying database connection in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect();
      }
      
      console.error('[ERROR] Database connection failed after all retries');
      this.isConnected = false;
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('[DB] Database connection closed gracefully');
    } catch (error) {
      console.error('[ERROR] Error disconnecting database:', error);
      throw error;
    }
  }

  public isDatabaseConnected(): boolean {
    return this.isConnected;
  }

  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        details: 'Database connection is active and responsive'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: `Database connection failed: ${error}`
      };
    }
  }
}

// Export singleton instance
export const dbManager = DatabaseConnectionManager.getInstance();
