import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const copyFile = promisify(fs.copyFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

interface BackupConfig {
  sourcePath: string;
  backupDir: string;
  retentionDays: number;
  retentionWeeks: number;
  retentionMonths: number;
}

class BackupService {
  private config: BackupConfig;

  constructor(config: BackupConfig) {
    this.config = config;
  }

  /**
   * Create a backup of the database
   */
  async createBackup(): Promise<{ success: boolean; message: string; backupPath?: string }> {
    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory();

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const backupFileName = `auditoriumx_backup_${timestamp}.db`;
      const backupPath = path.join(this.config.backupDir, backupFileName);

      // Check if backup already exists for today
      if (fs.existsSync(backupPath)) {
        console.log('[BACKUP] Backup already exists for today, skipping...');
        return {
          success: true,
          message: 'Backup already exists for today',
          backupPath
        };
      }

      // Copy database file to backup location
      await copyFile(this.config.sourcePath, backupPath);
      
      console.log(`[BACKUP] Database backup created: ${backupPath}`);
      
      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        success: true,
        message: 'Backup created successfully',
        backupPath
      };

    } catch (error) {
      console.error('[ERROR] Backup failed:', error);
      return {
        success: false,
        message: `Backup failed: ${error}`
      };
    }
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await mkdir(this.config.backupDir, { recursive: true });
    } catch (error) {
      console.error('[ERROR] Failed to create backup directory:', error);
      throw error;
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await readdir(this.config.backupDir);
      const backupFiles = files.filter(file => file.startsWith('auditoriumx_backup_') && file.endsWith('.db'));
      
      const now = new Date();
      const filesToDelete: string[] = [];

      for (const file of backupFiles) {
        const filePath = path.join(this.config.backupDir, file);
        const stats = await stat(filePath);
        const fileDate = new Date(stats.mtime);
        const daysDiff = Math.floor((now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));

        // Keep daily backups for retentionDays
        if (daysDiff > this.config.retentionDays && daysDiff <= 7) {
          filesToDelete.push(filePath);
        }
        // Keep weekly backups for retentionWeeks (delete daily backups after 7 days, keep weekly)
        else if (daysDiff > 7 && daysDiff <= (this.config.retentionWeeks * 7)) {
          // Keep only one backup per week (keep the first backup of each week)
          const weekStart = new Date(fileDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
          const weekKey = weekStart.toISOString().split('T')[0];
          
          // If this is not the first backup of the week, mark for deletion
          const isFirstBackupOfWeek = !backupFiles.some(otherFile => {
            if (otherFile === file) return false;
            const otherFilePath = path.join(this.config.backupDir, otherFile);
            const otherStats = stat(otherFilePath);
            const otherDate = new Date((otherStats as any).mtime);
            const otherWeekStart = new Date(otherDate);
            otherWeekStart.setDate(otherWeekStart.getDate() - otherWeekStart.getDay());
            const otherWeekKey = otherWeekStart.toISOString().split('T')[0];
            return otherWeekKey === weekKey && otherDate < fileDate;
          });
          
          if (!isFirstBackupOfWeek) {
            filesToDelete.push(filePath);
          }
        }
        // Keep monthly backups for retentionMonths
        else if (daysDiff > (this.config.retentionWeeks * 7) && daysDiff <= (this.config.retentionMonths * 30)) {
          // Keep only one backup per month
          const monthKey = `${fileDate.getFullYear()}-${String(fileDate.getMonth() + 1).padStart(2, '0')}`;
          
          const isFirstBackupOfMonth = !backupFiles.some(otherFile => {
            if (otherFile === file) return false;
            const otherFilePath = path.join(this.config.backupDir, otherFile);
            const otherStats = stat(otherFilePath);
            const otherDate = new Date((otherStats as any).mtime);
            const otherMonthKey = `${otherDate.getFullYear()}-${String(otherDate.getMonth() + 1).padStart(2, '0')}`;
            return otherMonthKey === monthKey && otherDate < fileDate;
          });
          
          if (!isFirstBackupOfMonth) {
            filesToDelete.push(filePath);
          }
        }
        // Delete backups older than retentionMonths
        else if (daysDiff > (this.config.retentionMonths * 30)) {
          filesToDelete.push(filePath);
        }
      }

      // Delete old backup files
      for (const filePath of filesToDelete) {
        try {
          await unlink(filePath);
          console.log(`[BACKUP] Deleted old backup: ${path.basename(filePath)}`);
        } catch (error) {
          console.error(`[ERROR] Failed to delete backup ${filePath}:`, error);
        }
      }

      if (filesToDelete.length > 0) {
        console.log(`[BACKUP] Cleaned up ${filesToDelete.length} old backup files`);
      }

    } catch (error) {
      console.error('[ERROR] Backup cleanup failed:', error);
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup: string | null;
    newestBackup: string | null;
  }> {
    try {
      const files = await readdir(this.config.backupDir);
      const backupFiles = files.filter(file => file.startsWith('auditoriumx_backup_') && file.endsWith('.db'));
      
      let totalSize = 0;
      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;

      for (const file of backupFiles) {
        const filePath = path.join(this.config.backupDir, file);
        const stats = await stat(filePath);
        totalSize += stats.size;

        if (!oldestDate || stats.mtime < oldestDate) {
          oldestDate = stats.mtime;
        }
        if (!newestDate || stats.mtime > newestDate) {
          newestDate = stats.mtime;
        }
      }

      return {
        totalBackups: backupFiles.length,
        totalSize,
        oldestBackup: oldestDate ? oldestDate.toISOString() : null,
        newestBackup: newestDate ? newestDate.toISOString() : null
      };

    } catch (error) {
      console.error('[ERROR] Failed to get backup stats:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null
      };
    }
  }
}

export default BackupService;
