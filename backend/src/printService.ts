import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Platform detection
const isWindows = process.platform === 'win32';

// Conditional import for Windows-only modules
let Service: any = null;
if (isWindows) {
  try {
    const nodeWindows = require('node-windows');
    Service = nodeWindows.Service;
  } catch (error) {
    console.warn('[PRINT] node-windows not available on this platform');
  }
}

interface PrintJob {
  id: string;
  ticketData: string;
  printerName: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

class WindowsPrintService {
  private printQueue: PrintJob[] = [];
  private isProcessing = false;
  private service: any = null;  // Using 'any' since Service is conditionally imported
  private isServiceRunning = false;
  private serviceInstallAttempted = false; // Prevent multiple install attempts

  constructor() {
    if (isWindows) {
      console.log('[PRINT] Windows Print Service initialized');
    } else {
      console.log('[PRINT] Print Service initialized (non-Windows platform)');
    }
    // Don't auto-initialize service to prevent infinite loops
    // this.initializeService();
  }

  private initializeService() {
    // Only initialize service on Windows
    if (!isWindows || !Service) {
      console.log('[PRINT] Service initialization skipped (non-Windows platform)');
      return;
    }
    
    // Prevent multiple initialization attempts
    if (this.serviceInstallAttempted) {
      console.log('[PRINT] Service initialization already attempted, skipping...');
      return;
    }
    
    this.serviceInstallAttempted = true;
    
    try {
      // Create a Windows service for background printing
      this.service = new Service({
        name: 'OfflineBookingPrintService',
        description: 'Background printing service for offline booking system',
        script: path.join(__dirname, 'printWorker.js'),
        nodeOptions: [
          '--harmony',
          '--max_old_space_size=4096'
        ]
      });

      // Handle service events
      this.service.on('install', () => {
        console.log('[PRINT] Print service installed successfully');
        this.service?.start();
      });

      this.service.on('alreadyinstalled', () => {
        console.log('[PRINT] Print service already installed');
        this.service?.start();
      });

      this.service.on('start', () => {
        console.log('[PRINT] Print service started');
        this.isServiceRunning = true;
      });

      this.service.on('stop', () => {
        console.log('[PRINT] Print service stopped');
        this.isServiceRunning = false;
      });

      this.service.on('error', (err: any) => {
        console.error('[ERROR] Print service error:', err);
        this.isServiceRunning = false;
      });

      // Install the service if not already installed
      this.service.install();
    } catch (error) {
      console.error('[ERROR] Failed to initialize print service:', error);
      this.isServiceRunning = false;
    }
  }

  async addToPrintQueue(ticketData: string, printerName: string): Promise<string> {
    console.log('[PRINT] Adding to print queue:', { ticketDataLength: ticketData?.length, printerName });
    
    if (!ticketData) {
      throw new Error('Ticket data is required');
    }
    
    const jobId = `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const printJob: PrintJob = {
      id: jobId,
      ticketData,
      printerName,
      timestamp: new Date(),
      status: 'pending'
    };
    
    this.printQueue.push(printJob);
    
    console.log('[PRINT] Print job created:', jobId);
    
    // Always use direct method to avoid service issues
    console.log('[PRINT] Using direct method (service disabled)');
    await this.processDirectly(printJob);
    
    return jobId;
  }

  private async processViaService(printJob: PrintJob): Promise<void> {
    try {
      printJob.status = 'processing';
      
      // Write job to a file that the service can read
      const jobFile = path.join(process.cwd(), 'temp', `job_${printJob.id}.json`);
      const jobData = {
        id: printJob.id,
        ticketData: printJob.ticketData,
        printerName: printJob.printerName,
        timestamp: printJob.timestamp.toISOString()
      };
      
      fs.writeFileSync(jobFile, JSON.stringify(jobData, null, 2));
      
      // Wait for service to process (with timeout)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if job was completed
        if (fs.existsSync(jobFile + '.completed')) {
          printJob.status = 'completed';
          fs.unlinkSync(jobFile + '.completed');
          fs.unlinkSync(jobFile);
          console.log(`[PRINT] Print job ${printJob.id} completed via service`);
          return;
        }
        
        // Check if job failed
        if (fs.existsSync(jobFile + '.failed')) {
          const errorData = JSON.parse(fs.readFileSync(jobFile + '.failed', 'utf8'));
          printJob.status = 'failed';
          printJob.error = errorData.error;
          fs.unlinkSync(jobFile + '.failed');
          fs.unlinkSync(jobFile);
          throw new Error(`Print job failed: ${errorData.error}`);
        }
        
        attempts++;
      }
      
      // Timeout - fallback to direct method
      console.log('[WARN] Service timeout, falling back to direct method');
      await this.processDirectly(printJob);
      
    } catch (error) {
      console.error('[ERROR] Service processing failed:', error);
      await this.processDirectly(printJob);
    }
  }

  private async processDirectly(printJob: PrintJob): Promise<void> {
    try {
      printJob.status = 'processing';
      
      // Use the most aggressive silent printing method
      await this.printUsingWindowsAPI(printJob.ticketData, printJob.printerName);
      
      printJob.status = 'completed';
      console.log(`[PRINT] Print job ${printJob.id} completed directly`);
      
    } catch (error) {
      printJob.status = 'failed';
      printJob.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ERROR] Print job ${printJob.id} failed:`, error);
      throw error;
    }
  }

  private async printUsingWindowsAPI(ticketData: string, printerName: string): Promise<void> {
    // Only use Windows-specific printing on Windows
    if (!isWindows) {
      console.log('[PRINT] Windows printing not available on this platform, creating manual print file...');
      await this.createManualPrintFile(ticketData);
      return;
    }
    // Create temp file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = path.join(tempDir, `ticket_${Date.now()}.txt`);
    
    // Check if this is ESC/POS commands or plain text
    if (ticketData.includes('\x1B')) {
      // This is ESC/POS commands - write as binary
      console.log('[PRINT] Writing ESC/POS commands as binary data');
      fs.writeFileSync(filePath, ticketData, 'binary');
    } else {
      // This is plain text - write as UTF-8
      console.log('[PRINT] Writing plain text as UTF-8');
      fs.writeFileSync(filePath, ticketData, 'utf8');
    }
    
    try {
      // Method 1: Direct copy to printer port (most reliable for ESC/POS)
      const copyCommand = `cmd /c copy "${filePath}" "\\\\.\\ESDPRT001" >nul 2>&1`;
      
      console.log('[PRINT] Using direct copy to printer port...');
      const { stdout, stderr } = await execAsync(copyCommand, { 
        maxBuffer: 10 * 1024 * 1024, 
        timeout: 30000,
        windowsHide: true
      });
      
      console.log('[PRINT] Direct copy to printer port completed');
      
    } catch (error) {
      console.log('[WARN] Direct copy failed, trying PowerShell...');
      
      // Method 2: PowerShell Out-Printer (fallback)
      const psCommand = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '${filePath.replace(/\\/g, '\\\\')}' -Raw | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`;
      
      try {
        const { stdout, stderr } = await execAsync(psCommand, { 
          maxBuffer: 10 * 1024 * 1024, 
          timeout: 30000,
          windowsHide: true
        });
        
        if (stderr && !stderr.includes('Exception')) {
          throw new Error(`PowerShell error: ${stderr}`);
        }
        
        console.log('[PRINT] PowerShell Out-Printer completed');
        
      } catch (psError) {
        console.log('[WARN] PowerShell failed, creating manual print file...');
        
        // Method 3: Create manual print file
        const manualPrintFile = path.join(tempDir, `manual_print_${Date.now()}.txt`);
        fs.writeFileSync(manualPrintFile, ticketData, 'utf8');
        
        console.log(`[WARN] Manual print file created: ${manualPrintFile}`);
        console.log('[WARN] Please print this file manually or check printer connection');
        
        // Don't throw error for manual fallback
      }
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn('[WARN] Could not clean up temp file:', cleanupError);
      }
    }
  }

  private async createManualPrintFile(ticketData: string): Promise<void> {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const manualPrintFile = path.join(tempDir, `manual_print_${Date.now()}.txt`);
    fs.writeFileSync(manualPrintFile, ticketData, 'utf8');
    
    console.log(`[PRINT] Manual print file created: ${manualPrintFile}`);
    console.log('[PRINT] Please print this file manually or check printer connection');
  }

  getQueueStatus() {
    return {
      queueLength: this.printQueue.length,
      isProcessing: this.isProcessing,
      isServiceRunning: this.isServiceRunning,
      jobs: this.printQueue.map(job => ({
        id: job.id,
        status: job.status,
        timestamp: job.timestamp,
        error: job.error
      }))
    };
  }

  // Method to manually start the service (disabled by default)
  async startService() {
    if (!isWindows || !Service) {
      console.log('[PRINT] Service start skipped (non-Windows platform)');
      return;
    }
    console.log('[PRINT] Manually starting print service...');
    this.initializeService();
  }

  // Method to stop the service
  async stopService() {
    if (!isWindows || !this.service) {
      console.log('[PRINT] Service stop skipped (non-Windows platform)');
      return;
    }
    console.log('[PRINT] Stopping print service...');
    this.service.stop();
    this.isServiceRunning = false;
  }
}

// Export singleton instance
export const windowsPrintService = new WindowsPrintService();
