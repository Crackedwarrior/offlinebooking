/**
 * Database Initialization and Migration
 * Handles database setup, migration, and connection initialization
 */

import path from 'path';
import fs from 'fs';
import { dbManager } from './connectionManager';
import { config } from '../config';

/**
 * Production path handling function
 * Returns correct app data path for production vs development
 */
export function getAppDataPath(): string {
  if (process.env.NODE_ENV === 'production') {
    // In production, we're running from the current working directory
    // which will be resources/backend/ when spawned by Electron
    return process.cwd();
  }
  // In development, we're running from backend/dist/ or backend/src/
  return path.join(__dirname, '../');
}

/**
 * Runtime database migration - Add missing columns automatically
 * Non-blocking migration that adds missing columns and tables
 */
export async function runDatabaseMigration(): Promise<void> {
  try {
    console.log('[DB] Checking database schema...');
    const prisma = dbManager.getClient();
    
    // Check if printedAt column exists
    try {
      await prisma.$queryRaw`SELECT printedAt FROM Booking LIMIT 1`;
      console.log('[DB] printedAt column exists');
    } catch (error: any) {
      if (error instanceof Error && error.message && error.message.includes('printedAt')) {
        console.log('[DB] Running migration: Adding printedAt column...');
        await prisma.$executeRaw`ALTER TABLE Booking ADD COLUMN printedAt DATETIME`;
        console.log('[DB] Migration completed: printedAt column added');
      } else {
        throw error;
      }
    }
    
    // Check if Settings table exists (non-blocking)
    try {
      await prisma.$queryRaw`SELECT * FROM Settings LIMIT 1`;
      console.log('[DB] Settings table exists');
    } catch (error: any) {
      if (error instanceof Error && error.message && error.message.includes('Settings')) {
        console.log('[DB] Running migration: Creating Settings table...');
        try {
          await prisma.$executeRaw`
            CREATE TABLE Settings (
              id TEXT PRIMARY KEY,
              key TEXT UNIQUE NOT NULL,
              value TEXT NOT NULL,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `;
          console.log('[DB] Settings table created successfully');
        } catch (settingsError) {
          // Don't crash the app if Settings table creation fails
          console.error('[ERROR] Failed to create Settings table:', settingsError);
          console.log('[WARN] Settings will use localStorage fallback');
          // App continues! Bookings still work!
        }
      }
    }
    
    console.log('[DB] Database schema check completed');
  } catch (error) {
    console.error('[ERROR] Database migration error:', error);
    throw error; // Only throw if critical tables fail
  }
}

/**
 * Database initialization using connection manager
 * Handles database directory creation, migration from old locations, and connection
 */
export async function initializeDatabase(): Promise<boolean> {
  // Ensure user data directory exists for database persistence
  if (config.server.nodeEnv === 'production') {
    try {
      // Extract database directory from DATABASE_URL
      const dbUrl = config.database.url;
      const dbPath = dbUrl.replace('file:', '');
      const dbDir = path.dirname(dbPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`[DB] Created user data directory: ${dbDir}`);
      } else {
        console.log(`[DB] Using existing user data directory: ${dbDir}`);
      }
      
      // Check if we need to migrate existing database
      if (!fs.existsSync(dbPath)) {
        // Check multiple possible old database locations
        const possibleOldPaths = [
          // App bundle locations (will be deleted on uninstall)
          path.join(__dirname, 'dev.db'),
          path.join(__dirname, '..', 'dev.db'),
          path.join(__dirname, '..', 'prisma', 'dev.db'),
          path.join(process.cwd(), 'dev.db'),
          path.join(process.cwd(), 'prisma', 'dev.db'),
          
          // Installer-specific paths (Electron resourcesPath)
          path.join((process as any).resourcesPath || '', 'app.asar.unpacked', 'dist', 'backend', 'dev.db'),
          path.join((process as any).resourcesPath || '', 'app.asar.unpacked', 'backend-dist', 'dev.db'),
          path.join((process as any).resourcesPath || '', 'app.asar.unpacked', 'dev.db'),
          
          // Legacy app data paths
          path.join(process.env.APPDATA || '', 'AuditoriumX', 'dev.db'),
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'AuditoriumX', 'dev.db'),
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'AuditoriumX', 'resources', 'app.asar.unpacked', 'dev.db')
        ];
        
        let migrated = false;
        console.log(`[DB] Checking for existing database to migrate to: ${dbPath}`);
        
        for (const oldDbPath of possibleOldPaths) {
          if (fs.existsSync(oldDbPath)) {
            console.log(`[DB] Found existing database: ${oldDbPath}`);
            try {
              fs.copyFileSync(oldDbPath, dbPath);
              console.log(`[DB] SUCCESS: Migrated database from ${oldDbPath} to ${dbPath}`);
              migrated = true;
              break;
            } catch (error) {
              console.error(`[ERROR] Failed to migrate database from ${oldDbPath}:`, error);
            }
          }
        }
        
        if (!migrated) {
          console.log(`[DB] No existing database found to migrate. Creating new database at ${dbPath}`);
        }
      } else {
        console.log(`[DB] Database already exists at: ${dbPath}`);
      }
    } catch (error) {
      console.error('[ERROR] Failed to setup database directory:', error);
      // Continue anyway - database might still work
    }
  }
  
  return await dbManager.connect();
}

