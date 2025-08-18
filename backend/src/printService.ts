import { Service } from 'node-windows';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  private service: Service | null = null;
  private isServiceRunning = false;

  constructor() {
    console.log('🖨️ Windows Print Service initialized');
    this.initializeService();
  }

  private initializeService() {
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
        console.log('✅ Print service installed successfully');
        this.service?.start();
      });

      this.service.on('alreadyinstalled', () => {
        console.log('ℹ️ Print service already installed');
        this.service?.start();
      });

      this.service.on('start', () => {
        console.log('🚀 Print service started');
        this.isServiceRunning = true;
      });

      this.service.on('stop', () => {
        console.log('⏹️ Print service stopped');
        this.isServiceRunning = false;
      });

      this.service.on('error', (err: any) => {
        console.error('❌ Print service error:', err);
        this.isServiceRunning = false;
      });

      // Install the service if not already installed
      this.service.install();
    } catch (error) {
      console.error('❌ Failed to initialize print service:', error);
      this.isServiceRunning = false;
    }
  }

  async addToPrintQueue(ticketData: string, printerName: string): Promise<string> {
    const jobId = `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const printJob: PrintJob = {
      id: jobId,
      ticketData,
      printerName,
      timestamp: new Date(),
      status: 'pending'
    };
    
    this.printQueue.push(printJob);
    
    // If service is running, use it; otherwise use direct method
    if (this.isServiceRunning) {
      await this.processViaService(printJob);
    } else {
      await this.processDirectly(printJob);
    }
    
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
          console.log(`✅ Print job ${printJob.id} completed via service`);
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
      console.log('⚠️ Service timeout, falling back to direct method');
      await this.processDirectly(printJob);
      
    } catch (error) {
      console.error('❌ Service processing failed:', error);
      await this.processDirectly(printJob);
    }
  }

  private async processDirectly(printJob: PrintJob): Promise<void> {
    try {
      printJob.status = 'processing';
      
      // Use the most aggressive silent printing method
      await this.printUsingWindowsAPI(printJob.ticketData, printJob.printerName);
      
      printJob.status = 'completed';
      console.log(`✅ Print job ${printJob.id} completed directly`);
      
    } catch (error) {
      printJob.status = 'failed';
      printJob.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Print job ${printJob.id} failed:`, error);
      throw error;
    }
  }

  private async printUsingWindowsAPI(ticketData: string, printerName: string): Promise<void> {
    // Create temp file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = path.join(tempDir, `ticket_${Date.now()}.txt`);
    fs.writeFileSync(filePath, ticketData, 'binary');
    
    try {
      // Method 1: Use Windows Print Spooler API directly
      const spoolerCommand = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Printing; $printServer = New-Object System.Printing.PrintServer; $printQueue = $printServer.GetPrintQueue('${printerName}'); $printJob = $printQueue.AddJob('Ticket_${Date.now()}'); $printJob.AddFile('${filePath}'); $printJob.Commit(); $printJob.Dispose(); $printQueue.Dispose(); $printServer.Dispose();"`;
      
      const { stdout, stderr } = await execAsync(spoolerCommand, { 
        maxBuffer: 10 * 1024 * 1024, 
        timeout: 30000,
        windowsHide: true
      });
      
      if (stderr) {
        throw new Error(`Spooler API error: ${stderr}`);
      }
      
      console.log('✅ Windows API printing completed');
      
    } catch (error) {
      console.log('⚠️ Windows API failed, trying alternative...');
      
      // Method 2: Use Windows Print Spooler via VBScript (completely silent)
      const vbsContent = `
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objFile = objFSO.OpenTextFile("${filePath.replace(/\\/g, '\\\\')}", 1)
strContent = objFile.ReadAll
objFile.Close

Set objWord = CreateObject("Word.Application")
objWord.Visible = False
Set objDoc = objWord.Documents.Add
objDoc.Content.Text = strContent

objDoc.PrintOut False, , , , "${printerName}"
objWord.Quit
Set objWord = Nothing
Set objFSO = Nothing
      `.trim();

      const vbsPath = path.join(tempDir, `print_${Date.now()}.vbs`);
      fs.writeFileSync(vbsPath, vbsContent, 'utf8');
      
      try {
        const vbsCommand = `cscript //nologo "${vbsPath}"`;
        const { stdout, stderr } = await execAsync(vbsCommand, { 
          maxBuffer: 10 * 1024 * 1024, 
          timeout: 30000,
          windowsHide: true
        });
        
        if (stderr) {
          throw new Error(`VBScript error: ${stderr}`);
        }
        
        console.log('✅ VBScript printing completed');
        
        // Clean up VBS file
        if (fs.existsSync(vbsPath)) {
          fs.unlinkSync(vbsPath);
        }
        
      } catch (vbsError) {
        console.log('⚠️ VBScript failed, using minimal PowerShell...');
        
        // Method 3: Minimal PowerShell with extreme hiding
        const psCommand = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '${filePath.replace(/\\/g, '\\\\')}' | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`;
        
        const { stdout, stderr } = await execAsync(psCommand, { 
          maxBuffer: 10 * 1024 * 1024, 
          timeout: 30000,
          windowsHide: true
        });
        
        if (stderr && !stderr.includes('Exception')) {
          throw new Error(`PowerShell error: ${stderr}`);
        }
        
        console.log('✅ Minimal PowerShell printing completed');
      }
      
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up temp file:', cleanupError);
      }
    }
  }

  getPrintJobStatus(jobId: string): PrintJob | null {
    return this.printQueue.find(job => job.id === jobId) || null;
  }

  getQueueStatus() {
    return {
      totalJobs: this.printQueue.length,
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

  stopService() {
    if (this.service) {
      this.service.stop();
      this.service.uninstall();
    }
  }
}

export const windowsPrintService = new WindowsPrintService();
