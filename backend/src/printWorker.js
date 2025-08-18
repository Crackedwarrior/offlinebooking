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
  }

  async start() {
    console.log('🖨️ Print Worker Service started');
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // Start polling for print jobs
    this.pollForJobs();
  }

  async pollForJobs() {
    while (this.isRunning) {
      try {
        // Look for job files
        const files = fs.readdirSync(this.tempDir);
        const jobFiles = files.filter(file => file.startsWith('job_') && file.endsWith('.json'));
        
        for (const jobFile of jobFiles) {
          await this.processJob(jobFile);
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        
      } catch (error) {
        console.error('❌ Error polling for jobs:', error);
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }
  }

  async processJob(jobFileName) {
    const jobFilePath = path.join(this.tempDir, jobFileName);
    
    try {
      console.log(`🖨️ Processing job: ${jobFileName}`);
      
      // Read job data
      const jobData = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
      const { id, ticketData, printerName } = jobData;
      
      // Print the ticket
      await this.printTicket(ticketData, printerName);
      
      // Mark job as completed
      fs.writeFileSync(jobFilePath + '.completed', JSON.stringify({ id, status: 'completed' }));
      
      console.log(`✅ Job ${id} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Job ${jobFileName} failed:`, error);
      
      // Mark job as failed
      const errorData = { id: jobFileName, error: error.message };
      fs.writeFileSync(jobFilePath + '.failed', JSON.stringify(errorData));
    }
  }

  async printTicket(ticketData, printerName) {
    // Create temp file for printing
    const filePath = path.join(this.tempDir, `ticket_${Date.now()}.txt`);
    fs.writeFileSync(filePath, ticketData, 'binary');
    
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
      
      console.log('✅ Windows API printing completed');
      
    } catch (error) {
      console.log('⚠️ Windows API failed, trying VBScript...');
      
      // Method 2: Use VBScript (completely silent)
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

      const vbsPath = path.join(this.tempDir, `print_${Date.now()}.vbs`);
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

  stop() {
    console.log('🛑 Print Worker Service stopping...');
    this.isRunning = false;
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, stopping service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, stopping service...');
  process.exit(0);
});

// Start the worker
const worker = new PrintWorker();
worker.start().catch(error => {
  console.error('❌ Print Worker failed to start:', error);
  process.exit(1);
});
