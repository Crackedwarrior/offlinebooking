import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class NativePrintService {
  static async printSilently(ticketData: string, printerName: string): Promise<void> {
    // Create temp file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = path.join(tempDir, `ticket_${Date.now()}.txt`);
    fs.writeFileSync(filePath, ticketData, 'binary');
    
    try {
      // Method 1: Use Windows Print Spooler API directly via CMD with hidden window
      await this.printUsingSpoolerAPI(filePath, printerName);
    } catch (error) {
      console.log('⚠️ Spooler API failed, trying alternative...');
      
      try {
        // Method 2: Use Windows Print Spooler via VBScript (completely silent)
        await this.printUsingVBScript(filePath, printerName);
      } catch (error2) {
        console.log('⚠️ VBScript failed, trying PowerShell hidden...');
        
        try {
          // Method 3: Use PowerShell with extreme hiding
          await this.printUsingPowerShellHidden(filePath, printerName);
        } catch (error3) {
          console.log('⚠️ PowerShell hidden failed, trying direct command...');
          
          // Method 4: Direct command with hidden window
          await this.printUsingDirectCommand(filePath, printerName);
        }
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

  private static async printUsingSpoolerAPI(filePath: string, printerName: string): Promise<void> {
    // Use Windows Print Spooler API directly via CMD with hidden window
    const command = `cmd /c start /min powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Printing; $printServer = New-Object System.Printing.PrintServer; $printQueue = $printServer.GetPrintQueue('${printerName}'); $printJob = $printQueue.AddJob('Ticket_${Date.now()}'); $printJob.AddFile('${filePath}'); $printJob.Commit(); $printJob.Dispose(); $printQueue.Dispose(); $printServer.Dispose();"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 10 * 1024 * 1024, 
      timeout: 30000,
      windowsHide: true
    });
    
    if (stderr) {
      throw new Error(`Spooler API error: ${stderr}`);
    }
  }

  private static async printUsingVBScript(filePath: string, printerName: string): Promise<void> {
    // Create a VBScript that prints silently
    const vbsContent = `
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objFile = objFSO.OpenTextFile("${filePath.replace(/\\/g, '\\\\')}", 1)
strContent = objFile.ReadAll
objFile.Close

Set objWord = CreateObject("Word.Application")
objWord.Visible = False
Set objDoc = objWord.Documents.Add
objDoc.Content.Text = strContent

objDoc.PrintOut False, , , , "EPSON TM-T81 ReceiptE4"
objWord.Quit
Set objWord = Nothing
Set objFSO = Nothing
    `.trim();

    const vbsPath = path.join(process.cwd(), 'temp', `print_${Date.now()}.vbs`);
    fs.writeFileSync(vbsPath, vbsContent, 'utf8');
    
    try {
      const command = `cscript //nologo "${vbsPath}"`;
      const { stdout, stderr } = await execAsync(command, { 
        maxBuffer: 10 * 1024 * 1024, 
        timeout: 30000,
        windowsHide: true
      });
      
      if (stderr) {
        throw new Error(`VBScript error: ${stderr}`);
      }
    } finally {
      // Clean up VBS file
      try {
        if (fs.existsSync(vbsPath)) {
          fs.unlinkSync(vbsPath);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up VBS file:', cleanupError);
      }
    }
  }

  private static async printUsingPowerShellHidden(filePath: string, printerName: string): Promise<void> {
    // Use PowerShell with extreme hiding - no console, no window, no output
    const command = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '${filePath.replace(/\\/g, '\\\\')}' | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 10 * 1024 * 1024, 
      timeout: 30000,
      windowsHide: true
    });
    
    if (stderr && !stderr.includes('Exception')) {
      throw new Error(`PowerShell error: ${stderr}`);
    }
  }

  private static async printUsingDirectCommand(filePath: string, printerName: string): Promise<void> {
    // Direct print command with hidden window as last resort
    const command = `cmd /c start /min print /d:"${printerName}" "${filePath}"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      maxBuffer: 10 * 1024 * 1024, 
      timeout: 30000,
      windowsHide: true
    });
    
    if (stderr) {
      throw new Error(`Direct print error: ${stderr}`);
    }
  }
}
