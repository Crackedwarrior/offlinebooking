const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Windows service worker for silent printing
class PrintWorker {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.isRunning = true;
    this.pollInterval = 1000; // 1 second
    this.maxRetries = 3; // Maximum retry attempts per job
    this.processedJobs = new Set(); // Track processed jobs to prevent duplicates
  }

  async start() {
    console.log('[PRINT] Print Worker Service started');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // Clean up any existing failed jobs on startup
    await this.cleanupFailedJobs();
    
    // Start polling for print jobs
    this.pollForJobs();
  }

  async cleanupFailedJobs() {
    try {
      console.log('[PRINT] Cleaning up failed jobs on startup...');
      const files = fs.readdirSync(this.tempDir);
      
      // Remove failed job files
      const failedJobFiles = files.filter(file => 
        file.endsWith('.failed') || 
        file.endsWith('.vbs') ||
        (file.startsWith('job_') && file.endsWith('.json'))
      );
      
      for (const file of failedJobFiles) {
        const filePath = path.join(this.tempDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`[PRINT] Cleaned up: ${file}`);
        } catch (error) {
          console.warn('[WARN] Could not clean up', file, ':', error.message);
        }
      }
      
      console.log(`[PRINT] Cleaned up ${failedJobFiles.length} failed job files`);
    } catch (error) {
      console.error('[ERROR] Error during cleanup:', error);
    }
  }

  async pollForJobs() {
    while (this.isRunning) {
      try {
        // Look for job files
        const files = fs.readdirSync(this.tempDir);
        const jobFiles = files.filter(file => file.startsWith('job_') && file.endsWith('.json'));
        
        for (const jobFile of jobFiles) {
          // Skip if already processed
          if (this.processedJobs.has(jobFile)) {
            continue;
          }
          
          await this.processJob(jobFile);
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        
      } catch (error) {
        console.error('[ERROR] Error polling for jobs:', error);
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }
  }

  async processJob(jobFileName) {
    const jobFilePath = path.join(this.tempDir, jobFileName);
    
    try {
      console.log('[PRINT] Processing job:', jobFileName);
      
      // Mark as processed to prevent duplicate processing
      this.processedJobs.add(jobFileName);
      
      // Read job data
      const jobData = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
      const { id, ticketData, printerName } = jobData;
      
      // Print the ticket
      await this.printTicket(ticketData, printerName);
      
      // Mark job as completed and clean up
      fs.writeFileSync(jobFilePath + '.completed', JSON.stringify({ id, status: 'completed' }));
      fs.unlinkSync(jobFilePath); // Remove original job file
      
      console.log(`[PRINT] Job ${id} completed successfully`);
      
    } catch (error) {
      console.error('[ERROR] Job', jobFileName, 'failed:', error);
      
      // Mark job as failed and clean up
      const errorData = { id: jobFileName, error: error.message };
      fs.writeFileSync(jobFilePath + '.failed', JSON.stringify(errorData));
      fs.unlinkSync(jobFilePath); // Remove original job file
      
      // Remove from processed set so it can be retried if needed
      this.processedJobs.delete(jobFileName);
    }
  }

  async printTicket(ticketData, printerName) {
    // Create temp file for printing
    const filePath = path.join(this.tempDir, `ticket_${Date.now()}.txt`);
    fs.writeFileSync(filePath, ticketData, 'utf8'); // Use UTF-8 instead of binary
    
    try {
      // Method 1: Use Windows Print Spooler API directly (completely silent)
      const spoolerCommand = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Printing; $printServer = New-Object System.Printing.PrintServer; $printQueue = $printServer.GetPrintQueue('${printerName}'); $printJob = $printQueue.AddJob('Ticket_${Date.now()}'); $printJob.AddFile('${filePath}'); $printJob.Commit(); $printJob.Dispose(); $printQueue.Dispose(); $printServer.Dispose();"`;
      
      const { stdout, stderr } = await execAsync(spoolerCommand, { 
        maxBuffer: 10 * 1024 * 1024, 
        timeout: 30000,
        windowsHide: true
      });
      
      if (stderr) {
        throw new Error(`Spooler API error: ${stderr}`);
      }
      
      console.log('[PRINT] Windows API printing completed');
      
    } catch (error) {
      console.log('[WARN] Windows API failed, trying PowerShell...');
      
      // Method 2: Use PowerShell directly (simpler and more reliable)
      const psCommand = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '${filePath.replace(/\\/g, '\\\\')}' | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`;
      
      try {
        const { stdout, stderr } = await execAsync(psCommand, { 
          maxBuffer: 10 * 1024 * 1024, 
          timeout: 30000,
          windowsHide: true
        });
        
        if (stderr && !stderr.includes('Exception')) {
          throw new Error(`PowerShell error: ${stderr}`);
        }
        
        console.log('[PRINT] PowerShell printing completed');
        
      } catch (psError) {
        console.log('[WARN] PowerShell failed, trying minimal approach...');
        
        // Method 3: Minimal approach - just write to file and let user print manually
        const manualPrintFile = path.join(this.tempDir, `manual_print_${Date.now()}.txt`);
        fs.writeFileSync(manualPrintFile, ticketData, 'utf8');
        
        console.log('[WARN] Manual print file created:', manualPrintFile);
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

  stop() {
    console.log('[PRINT] Print Worker Service stopping...');
    this.isRunning = false;
    
    // Clean up any remaining job files
    this.cleanupFailedJobs().catch(error => {
      console.error('[ERROR] Error during final cleanup:', error);
    });
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('[PRINT] Received SIGINT, stopping service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[PRINT] Received SIGTERM, stopping service...');
  process.exit(0);
});

// Start the worker
const worker = new PrintWorker();
worker.start().catch(error => {
  console.error('[ERROR] Print Worker failed to start:', error);
  process.exit(1);
});
