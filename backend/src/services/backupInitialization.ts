/**
 * Backup Service Initialization
 * Handles backup service setup and startup backup execution
 */

import path from 'path';
import BackupService from './backupService';
import { runDatabaseMigration } from '../db/initialization';

/**
 * Initialize backup service with configuration
 * Returns configured BackupService instance
 */
export function initializeBackupService(): BackupService {
  const databasePath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
  const backupDir = path.join(require('os').homedir(), 'Documents', 'AuditoriumX_Backups');
  
  return new BackupService({
    sourcePath: databasePath,
    backupDir,
    retentionDays: 7,    // Keep daily backups for 7 days
    retentionWeeks: 4,   // Keep weekly backups for 4 weeks
    retentionMonths: 12  // Keep monthly backups for 12 months
  });
}

/**
 * Auto-backup on server startup (runs once when server starts)
 * Non-blocking backup creation after database migration
 */
export async function runStartupBackup(backupService: BackupService): Promise<void> {
  try {
    console.log('[BACKUP] Running startup backup...');
    const result = await backupService.createBackup();
    if (result.success) {
      console.log('[BACKUP] Startup backup completed successfully');
    } else {
      console.log('[BACKUP] Startup backup failed:', result.message);
    }
  } catch (error) {
    console.error('[ERROR] Startup backup error:', error);
  }
}

/**
 * Schedule database migration and startup backup
 * Runs after a delay to allow server to start
 */
export function scheduleStartupTasks(backupService: BackupService): void {
  // Run migration first, then backup on server start (non-blocking)
  setTimeout(async () => {
    await runDatabaseMigration();
    await runStartupBackup(backupService);
  }, 2000); // Wait 2 seconds after server start
}

