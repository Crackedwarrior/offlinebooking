import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface PrintJob {
  id: string;
  printerName: string;
  filePath: string;
  timestamp: Date;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  error?: string;
}

class SilentPrintService {
  private printQueue: PrintJob[] = [];
  private isProcessing = false;

  constructor() {
    console.log('🖨️ Silent Print Service initialized');
  }

  async addToPrintQueue(ticketData: string, printerName: string): Promise<string> {
    const jobId = `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create temp file for printing
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = path.join(tempDir, `ticket_${jobId}.txt`);
    
    // Write ticket data to file
    fs.writeFileSync(filePath, ticketData, 'binary');
    
    const printJob: PrintJob = {
      id: jobId,
      printerName,
      filePath,
      timestamp: new Date(),
      status: 'pending'
    };
    
    this.printQueue.push(printJob);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return jobId;
  }

  private async processQueue() {
    if (this.isProcessing || this.printQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.printQueue.length > 0) {
      const job = this.printQueue.shift();
      if (!job) continue;
      
      try {
        job.status = 'printing';
        await this.printSilently(job);
        job.status = 'completed';
        console.log(`✅ Print job ${job.id} completed successfully`);
      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Print job ${job.id} failed:`, error);
      } finally {
        // Clean up temp file
        try {
          if (fs.existsSync(job.filePath)) {
            fs.unlinkSync(job.filePath);
          }
        } catch (cleanupError) {
          console.warn('⚠️ Could not clean up temp file:', cleanupError);
        }
      }
    }
    
    this.isProcessing = false;
  }

  private async printSilently(job: PrintJob): Promise<void> {
    // Method 1: Try using Windows Print Spooler API directly with hidden window
    try {
      await this.printUsingSpoolerHidden(job);
      return;
    } catch (error) {
      console.log('⚠️ Spooler hidden method failed, trying alternative...');
    }

    // Method 2: Try using Windows Print Spooler API with minimized window
    try {
      await this.printUsingSpoolerMinimized(job);
      return;
    } catch (error) {
      console.log('⚠️ Spooler minimized method failed, trying alternative...');
    }

    // Method 3: Try using PowerShell with completely hidden window and no console
    try {
      await this.printUsingPowerShellHidden(job);
      return;
    } catch (error) {
      console.log('⚠️ PowerShell hidden method failed, trying direct command...');
    }

    // Method 4: Fallback to direct command with hidden window
    await this.printUsingDirectCommandHidden(job);
  }

  private async printUsingSpoolerHidden(job: PrintJob): Promise<void> {
    // Use Windows Print Spooler API directly with hidden window
    const command = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Printing; $printServer = New-Object System.Printing.PrintServer; $printQueue = $printServer.GetPrintQueue('${job.printerName}'); $printJob = $printQueue.AddJob('Ticket_${job.id}'); $printJob.AddFile('${job.filePath}'); $printJob.Commit(); $printJob.Dispose(); $printQueue.Dispose(); $printServer.Dispose();"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 10 * 1024 * 1024, 
      timeout: 30000,
      windowsHide: true
    });
    
    if (stderr) {
      throw new Error(`Spooler error: ${stderr}`);
    }
  }

  private async printUsingSpoolerMinimized(job: PrintJob): Promise<void> {
    // Use Windows Print Spooler API with minimized window
    const command = `powershell -WindowStyle Minimized -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Printing; $printServer = New-Object System.Printing.PrintServer; $printQueue = $printServer.GetPrintQueue('${job.printerName}'); $printJob = $printQueue.AddJob('Ticket_${job.id}'); $printJob.AddFile('${job.filePath}'); $printJob.Commit(); $printJob.Dispose(); $printQueue.Dispose(); $printServer.Dispose();"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 10 * 1024 * 1024, 
      timeout: 30000,
      windowsHide: true
    });
    
    if (stderr) {
      throw new Error(`Spooler error: ${stderr}`);
    }
  }

  private async printUsingPowerShellHidden(job: PrintJob): Promise<void> {
    // Use PowerShell with completely hidden window and no console output
    const command = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '${job.filePath.replace(/\\/g, '\\\\')}' | Out-Printer -Name '${job.printerName.replace(/'/g, "''")}'"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 10 * 1024 * 1024, 
      timeout: 30000,
      windowsHide: true
    });
    
    if (stderr && !stderr.includes('Exception')) {
      throw new Error(`PowerShell error: ${stderr}`);
    }
  }

  private async printUsingDirectCommandHidden(job: PrintJob): Promise<void> {
    // Direct print command with hidden window as last resort
    const command = `cmd /c start /min print /d:"${job.printerName}" "${job.filePath}"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 10 * 1024 * 1024, 
      timeout: 30000,
      windowsHide: true
    });
    
    if (stderr) {
      throw new Error(`Direct print error: ${stderr}`);
    }
  }

  getPrintJobStatus(jobId: string): PrintJob | null {
    return this.printQueue.find(job => job.id === jobId) || null;
  }

  getQueueStatus() {
    return {
      totalJobs: this.printQueue.length,
      isProcessing: this.isProcessing,
      jobs: this.printQueue.map(job => ({
        id: job.id,
        status: job.status,
        timestamp: job.timestamp,
        error: job.error
      }))
    };
  }
}

export const silentPrintService = new SilentPrintService();
