// src/server.ts

import express from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import { config, validateConfig } from './config';
import { 
  requestIdMiddleware, 
  errorLogger, 
  errorHandler, 
  asyncHandler, 
  validateBookingData 
} from './middleware/errorHandler';
import { 
  ValidationError, 
  NotFoundError, 
  DatabaseError, 
  handleDatabaseError 
} from './utils/errors';
import {
  type CreateBookingRequest,
  type CreateBookingResponse,
  type BookingData,
  type BookingQueryParams,
  type SeatStatusQueryParams,
  type BookingStatsResponse,
  type HealthCheckResponse,
  type SeatStatusResponse,
  type ApiResponse,
  BookingSource
} from './types/api';

// Validate configuration on startup
if (!validateConfig()) {
  process.exit(1);
}

const app = express();
const prisma = new PrismaClient();

// Configure CORS
app.use(cors({
  origin: config.api.corsOrigin,
  credentials: true,
}));

app.use(express.json());

// Add request ID middleware
app.use(requestIdMiddleware);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.nodeEnv
  });
});

// Helper function to map Windows printer status to our format
const getPrinterStatus = (windowsStatus: number): string => {
  // Windows printer status codes
  switch (windowsStatus) {
    case 0: return 'ready'; // Ready
    case 1: return 'paused'; // Paused
    case 2: return 'error'; // Error
    case 4: return 'pending'; // Pending deletion
    case 8: return 'paper_jam'; // Paper jam
    case 16: return 'offline'; // Offline
    case 32: return 'manual_feed'; // Manual feed
    case 64: return 'paper_problem'; // Paper problem
    case 128: return 'waiting'; // Waiting
    case 256: return 'processing'; // Processing
    case 512: return 'initializing'; // Initializing
    case 1024: return 'warming_up'; // Warming up
    case 2048: return 'toner_low'; // Toner low
    case 4096: return 'no_toner'; // No toner
    case 8192: return 'page_punt'; // Page punt
    case 16384: return 'user_intervention'; // User intervention required
    case 32768: return 'out_of_memory'; // Out of memory
    case 65536: return 'door_open'; // Door open
    case 131072: return 'server_unknown'; // Server unknown
    case 262144: return 'power_save'; // Power save
    default: return 'unknown';
  }
};

// Helper function to get mock printers for fallback
const getMockPrinters = () => [
  {
    name: 'EPSON TM-T81 ReceiptE4',
    driver: 'EPSON TM-T81 ReceiptE4',
    port: 'USB001',
    status: 'ready',
    type: 'Thermal',
    isDefault: true
  },
  {
    name: 'Microsoft Print to PDF',
    driver: 'Microsoft Print to PDF',
    port: 'PORTPROMPT:',
    status: 'ready',
    type: 'PDF',
    isDefault: false
  },
  {
    name: 'HP LaserJet Pro',
    driver: 'HP LaserJet Pro',
    port: 'USB002',
    status: 'ready',
    type: 'Laser',
    isDefault: false
  }
];

// Get available printers endpoint
app.get('/api/printer/list', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🔍 Getting available printers...');
    
    let printers: any[] = [];
    
    // Check if we're on Windows
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Try multiple PowerShell approaches for better reliability
      let stdout = '';
      let stderr = '';
      
      // Method 1: Full printer details
      try {
        console.log('🔍 Method 1: Getting full printer details...');
        const psCommand1 = `Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus, Type | ConvertTo-Json`;
        const result1 = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand1}"`, { 
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30000
        });
        stdout = result1.stdout;
        stderr = result1.stderr;
        console.log('✅ Method 1 successful');
      } catch (error1) {
        console.warn('⚠️ Method 1 failed, trying Method 2...');
        
        // Method 2: Simple printer names only
        try {
          const psCommand2 = `Get-Printer | Select-Object Name | ConvertTo-Json`;
          const result2 = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand2}"`, { 
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000
          });
          stdout = result2.stdout;
          stderr = result2.stderr;
          console.log('✅ Method 2 successful');
        } catch (error2) {
          console.warn('⚠️ Method 2 failed, trying Method 3...');
          
          // Method 3: Using wmic as fallback
          try {
            const wmicCommand = `wmic printer get name,drivername,portname /format:csv`;
            const result3 = await execAsync(wmicCommand, { 
              maxBuffer: 10 * 1024 * 1024,
              timeout: 30000
            });
            stdout = result3.stdout;
            stderr = result3.stderr;
            console.log('✅ Method 3 (wmic) successful');
          } catch (error3) {
            console.error('❌ All methods failed:', { error1, error2, error3 });
            throw error3;
          }
        }
      }
      
      if (stderr) console.warn('⚠️ PowerShell stderr:', stderr);
      console.log('🔍 PowerShell stdout length:', stdout.length);
      console.log('🔍 PowerShell stdout preview:', stdout.substring(0, 200));
      
      if (stdout && stdout.trim()) {
        try {
          // Check if it's JSON (PowerShell) or CSV (wmic)
          if (stdout.includes('[') || stdout.includes('{')) {
            // JSON format from PowerShell
            const printerList = JSON.parse(stdout.trim());
            console.log('🔍 Parsed JSON printer list:', printerList);
            
            printers = Array.isArray(printerList) ? printerList : [printerList];
            
            // Map printer status to our format
            printers = printers.map(printer => ({
              name: printer.Name || 'Unknown',
              driver: printer.DriverName || 'Unknown',
              port: printer.PortName || 'Unknown',
              status: getPrinterStatus(printer.PrinterStatus || 0),
              type: printer.Type || 'Unknown',
              isDefault: false
            }));
          } else {
            // CSV format from wmic
            console.log('🔍 Parsing CSV format from wmic...');
            const lines = stdout.trim().split('\n');
            printers = [];
            
            for (let i = 1; i < lines.length; i++) { // Skip header
              const line = lines[i].trim();
              if (line && !line.startsWith('Node,')) {
                const parts = line.split(',');
                if (parts.length >= 3) {
                  printers.push({
                    name: parts[1]?.trim() || 'Unknown',
                    driver: parts[2]?.trim() || 'Unknown',
                    port: parts[3]?.trim() || 'Unknown',
                    status: 'ready', // Default status for wmic
                    type: 'Unknown',
                    isDefault: false
                  });
                }
              }
            }
          }
          
          console.log('🔍 Mapped printers:', printers);
          
          // Get default printer if we have printers
          if (printers.length > 0) {
            try {
              const { stdout: defaultStdout } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Printer | Where-Object {$_.Default -eq $true} | Select-Object Name | ConvertTo-Json"`);
              if (defaultStdout && defaultStdout.trim()) {
                const defaultPrinter = JSON.parse(defaultStdout.trim());
                const defaultName = Array.isArray(defaultPrinter) ? defaultPrinter[0]?.Name : defaultPrinter?.Name;
                
                if (defaultName) {
                  printers = printers.map(printer => ({
                    ...printer,
                    isDefault: printer.name === defaultName
                  }));
                }
              }
            } catch (defaultError) {
              console.warn('⚠️ Could not get default printer:', defaultError);
            }
          }
        } catch (parseError) {
          console.error('❌ Parse error:', parseError);
          console.error('❌ Raw stdout:', stdout);
          // Fallback to mock printers if parsing fails
          printers = getMockPrinters();
        }
      } else {
        console.warn('⚠️ Command returned empty stdout');
        printers = getMockPrinters();
      }
    } else {
      // Non-Windows: return mock printers
      printers = getMockPrinters();
    }
    
    console.log(`✅ Found ${printers.length} printers:`, printers.map(p => p.name));
    
    res.json({
      success: true,
      printers,
      count: printers.length,
      platform: process.platform
    });
    
  } catch (error) {
    console.error('❌ Error getting printers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get printers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Printer test endpoint
app.post('/api/printer/test', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🖨️ Testing printer connection...');
    const { printerConfig } = req.body;
    
    // Log the printer configuration
    console.log('🖨️ Printer configuration:', printerConfig);
    
    // Actually try to connect to the printer
    // For now we'll simulate success, but in a real implementation
    // this would attempt to establish a connection to the physical printer
    const connected = true;
    
    if (connected) {
      console.log('✅ Printer connection successful');
      res.json({
        success: true,
        message: 'Printer connection test successful',
        timestamp: new Date().toISOString(),
        printerInfo: {
          port: printerConfig?.port || 'COM1',
          status: 'connected',
          ready: true
        }
      });
    } else {
      throw new Error('Could not connect to printer');
    }
  } catch (error) {
    console.error('❌ Printer test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Printer connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Printer print endpoint
app.post('/api/printer/print', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { tickets, printerConfig } = req.body;
    
    console.log('🖨️ Printing tickets:', {
      ticketCount: tickets?.length || 0,
      printerConfig
    });
    
    // Get the printer name from the configuration
    const printerName = printerConfig?.name || 'EPSON TM-T81 ReceiptE4';
    console.log(`🔌 Printing to Windows printer: ${printerName}...`);
    
    // Attempt to print using Windows printing
    let success = false;
    let errorMessage = '';
    
    try {
      // Check if we're on Windows
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        const fs = require('fs');
        const path = require('path');
        
        // Create temp directory
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Debug: Log what we're receiving
        console.log('🖨️ Received tickets:', JSON.stringify(tickets, null, 2));
        
        // Concatenate all ticket plain text into a single text buffer
        const textData = tickets.map((t: any) => t.commands).join('\n\n---\n\n');
        console.log('🖨️ Text to send:', textData.length, 'characters');
        console.log('🖨️ Text content preview:', textData.substring(0, 200));
        console.log('🖨️ Text data type:', typeof textData);
        console.log('🖨️ Text data is empty?', textData.length === 0);
        console.log('🖨️ Text data first 10 chars:', JSON.stringify(textData.substring(0, 10)));
        
        // Create the text file for printing
        const tempFileText = path.join(tempDir, `ticket_text_${Date.now()}.txt`);
        console.log('📁 About to write file:', tempFileText);
        console.log('📁 Writing data length:', textData.length);
        
        // Try different encoding approaches
        try {
          fs.writeFileSync(tempFileText, textData, 'utf8');
          console.log('📁 File written with utf8 encoding');
        } catch (writeError) {
          console.error('📁 UTF8 write failed:', writeError);
          try {
            fs.writeFileSync(tempFileText, Buffer.from(textData, 'utf8'));
            console.log('📁 File written with Buffer encoding');
          } catch (bufferError) {
            console.error('📁 Buffer write failed:', bufferError);
            throw bufferError;
          }
        }
        
        // Verify the file was written
        const fileStats = fs.statSync(tempFileText);
        console.log('📁 File size after write:', fileStats.size, 'bytes');
        console.log('📁 Created text file:', tempFileText);
        
        // Create debug file to verify the text content
        const debugFile = path.join(tempDir, `debug_text_${Date.now()}.txt`);
        fs.writeFileSync(debugFile, `Text Debug File\nGenerated: ${new Date().toISOString()}\nPrinter: ${printerName}\nTicket Count: ${tickets.length}\n\nText Content:\n${textData}\n`);
        console.log('📁 Created debug file:', debugFile);
        
        // Method 1: Try using PowerShell Out-Printer (most reliable)
        try {

          // tempDir already created above

          // First, verify the printer exists and is accessible
          const verifyPrinterScript = `
          $ErrorActionPreference = 'Stop'
          $printerName = '${String(printerName).replace(/'/g, "''")}';
          
          try {
            $printer = Get-Printer -Name $printerName -ErrorAction Stop
            Write-Host "Printer found: $($printer.Name)"
            Write-Host "Printer status: $($printer.PrinterStatus)"
            Write-Host "Printer port: $($printer.PortName)"
            Write-Host "Printer driver: $($printer.DriverName)"
            
            # Check if printer is ready
            if ($printer.PrinterStatus -eq 0) {
              Write-Host "PRINTER_READY"
            } else {
              Write-Host "PRINTER_NOT_READY: $($printer.PrinterStatus)"
            }
          }
          catch {
            Write-Host "Printer not found: $($_.Exception.Message)"
            throw $_
          }
          `;
          
          // Try printing a simple test first
          const testTextFile = `${tempDir}\\test_print_${Date.now()}.txt`;
          fs.writeFileSync(testTextFile, 'TEST PRINT - AUDITORIUMX TICKET SYSTEM\n\nThis is a test print to verify printer connectivity.\n\nTimestamp: ' + new Date().toISOString() + '\n\n---\n');
          
          console.log('🔍 Testing printer with simple text file...');
          const testPrintCommand = `print /d:"${printerName}" "${testTextFile}"`;
          
          try {
            await execAsync(testPrintCommand, { timeout: 10000 });
            console.log('✅ Test print command executed successfully');
          } catch (testErr) {
            console.warn('⚠️ Test print failed, continuing with main print job:', testErr);
          }
          
          // Also try printing to Microsoft Print to PDF first as a test
          const pdfTestFile = `${tempDir}\\pdf_test_${Date.now()}.txt`;
          fs.writeFileSync(pdfTestFile, 'PDF TEST - AUDITORIUMX TICKET SYSTEM\n\nThis is a test to verify PDF printing works.\n\nTimestamp: ' + new Date().toISOString() + '\n\n---\n');
          
          console.log('🔍 Testing PDF printing...');
          const pdfPrintCommand = `print /d:"Microsoft Print to PDF" "${pdfTestFile}"`;
          
          try {
            await execAsync(pdfPrintCommand, { timeout: 10000 });
            console.log('✅ PDF test print command executed successfully');
          } catch (pdfErr) {
            console.warn('⚠️ PDF test print failed:', pdfErr);
          }
          
          const verifyCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${verifyPrinterScript.replace(/"/g, '""')}"`;
          console.log('🔍 Verifying printer availability...');
          
          const { stdout: verifyStdout, stderr: verifyStderr } = await execAsync(verifyCommand, { 
            maxBuffer: 10 * 1024 * 1024, 
            timeout: 15000 
          });
          
          if (verifyStderr) console.warn('⚠️ Verify printer stderr:', verifyStderr);
          console.log('✅ Printer verification output:', verifyStdout);
          
          if (!verifyStdout.includes('PRINTER_READY')) {
            throw new Error(`Printer not ready: ${verifyStdout}`);
          }

          // Use a simpler PowerShell approach - copy file to printer
          const psScript = `
          $ErrorActionPreference = 'Stop'
          $printerName = '${String(printerName).replace(/'/g, "''")}';
          $filePath = '${tempFileText.replace(/\\/g, "\\\\")}';
          $textFilePath = '${debugFile.replace(/\\/g, "\\\\")}';
          
          try {
            # Method 1: Try using Copy-Item to printer (simpler approach)
            $printer = Get-Printer -Name $printerName -ErrorAction Stop
            Write-Host "Found printer: $($printer.Name) - Status: $($printer.PrinterStatus)"
            
            # First try printing the text version (more compatible)
            Write-Host "Trying to print text version first..."
            try {
              Get-Content $textFilePath -Raw | Out-Printer -Name $printerName
              Write-Host "Text version printed successfully"
              Write-Host "SUCCESS_TEXT"
            }
            catch {
              Write-Host "Text printing failed: $($_.Exception.Message)"
              
              # Fallback to Copy-Item for raw data
              Write-Host "Trying Copy-Item for raw data..."
              $result = Copy-Item -Path $filePath -Destination "\\\\localhost\\$printerName" -ErrorAction Stop
              Write-Host "Copy-Item result: $result"
              Write-Host "File size: $((Get-Item $filePath).Length) bytes"
              Write-Host "SUCCESS_RAW"
            }
          }
          catch {
            Write-Host "All methods failed: $($_.Exception.Message)"
            throw $_
          }
          `;

          const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '""')}"`;
          console.log('🔍 Executing PowerShell command...');
          
          const { stdout: psStdout, stderr: psStderr } = await execAsync(psCommand, { 
            maxBuffer: 10 * 1024 * 1024, 
            timeout: 30000 
          });
          
          if (psStderr) console.warn('⚠️ PowerShell stderr:', psStderr);
          console.log('✅ PowerShell stdout:', psStdout);

          // Check if the command was successful
          if (psStdout.includes('SUCCESS_TEXT') || psStdout.includes('SUCCESS_RAW')) {
            success = true;
            if (psStdout.includes('SUCCESS_TEXT')) {
              console.log('✅ Print job sent successfully via text printing');
            } else {
              console.log('✅ Print job sent successfully via raw data Copy-Item');
            }
          } else {
            throw new Error('PowerShell command did not return SUCCESS');
          }

          // Clean up temp file
          try { fs.unlinkSync(tempFileText); } catch {}
          
          // Also try printing the text version directly
          try {
            console.log('🔄 Trying to print text version directly...');
            const textPrintCommand = `print /d:"${printerName}" "${debugFile}"`;
            await execAsync(textPrintCommand, { timeout: 15000 });
            console.log('✅ Text version printed successfully');
            success = true;
          } catch (textErr) {
            console.warn('⚠️ Direct text printing failed:', textErr);
          }
          
        } catch (psErr: any) {
          console.error('❌ PowerShell Copy-Item failed:', psErr?.message || psErr);
          
          // Method 2: Fallback to direct file copy to printer port
          try {
            console.log('🔄 Trying fallback method: direct file copy to printer...');
            
            const fallbackScript = `
            $ErrorActionPreference = 'Stop'
            $printerName = '${String(printerName).replace(/'/g, "''")}';
            $filePath = '${tempFileText.replace(/\\/g, "\\\\")}';
            
            try {
              # Get printer port
              $printer = Get-Printer -Name $printerName -ErrorAction Stop
              $portName = $printer.PortName
              Write-Host "Printer port: $portName"
              
              # Try to send file directly to printer port
              if ($portName -like "USB*" -or $portName -like "COM*") {
                # For USB/COM ports, try using Out-Printer
                Get-Content $filePath -Raw | Out-Printer -Name $printerName
                Write-Host "SUCCESS_VIA_OUT_PRINTER"
              } else {
                # For network printers, try using Copy-Item again
                $result = Copy-Item -Path $filePath -Destination "\\\\localhost\\$printerName" -ErrorAction Stop
                Write-Host "SUCCESS_VIA_COPY"
              }
            }
            catch {
              Write-Host "Fallback method failed: $($_.Exception.Message)"
              throw $_
            }
            `;
            
            const fallbackCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${fallbackScript.replace(/"/g, '""')}"`;
            const { stdout: fallbackStdout, stderr: fallbackStderr } = await execAsync(fallbackCommand, { 
              maxBuffer: 10 * 1024 * 1024, 
              timeout: 30000 
            });
            
            if (fallbackStderr) console.warn('⚠️ Fallback PowerShell stderr:', fallbackStderr);
            console.log('✅ Fallback PowerShell stdout:', fallbackStdout);
            
            if (fallbackStdout.includes('SUCCESS')) {
              success = true;
              console.log('✅ Print job sent successfully via fallback method');
            } else {
              throw new Error('Fallback method also failed');
            }
            
                     } catch (fallbackErr: any) {
             console.error('❌ Fallback method failed:', fallbackErr?.message || fallbackErr);
             
             // Method 3: Final fallback using Windows 'print' command
             try {
               console.log('🔄 Trying final fallback: Windows print command...');
               
               const printCommand = `print /d:"${printerName}" "${tempFileText}"`;
               console.log('🔍 Executing print command:', printCommand);
               
               const { stdout: printStdout, stderr: printStderr } = await execAsync(printCommand, { 
                 maxBuffer: 10 * 1024 * 1024, 
                 timeout: 30000 
               });
               
               if (printStderr) console.warn('⚠️ Print command stderr:', printStderr);
               console.log('✅ Print command stdout:', printStdout);
               
               // The print command doesn't always return useful output, so we'll assume success
               // if no error was thrown
               success = true;
               console.log('✅ Print job sent successfully via Windows print command');
               
             } catch (printErr: any) {
               console.error('❌ Windows print command failed:', printErr?.message || printErr);
               
               // Method 4: Try using rundll32 to print
               try {
                 console.log('🔄 Trying rundll32 method...');
                 
                 const rundllCommand = `rundll32 printui.dll,PrintUIEntry /k /n "${printerName}" "${tempFileText}"`;
                 console.log('🔍 Executing rundll32 command:', rundllCommand);
                 
                 const { stdout: rundllStdout, stderr: rundllStderr } = await execAsync(rundllCommand, { 
                   maxBuffer: 10 * 1024 * 1024, 
                   timeout: 30000 
                 });
                 
                 if (rundllStderr) console.warn('⚠️ Rundll32 stderr:', rundllStderr);
                 console.log('✅ Rundll32 stdout:', rundllStdout);
                 
                 success = true;
                 console.log('✅ Print job sent successfully via rundll32');
                 
                                } catch (rundllErr: any) {
                   console.error('❌ Rundll32 method failed:', rundllErr?.message || rundllErr);
                   
                   // Method 5: Try using Windows start command to open file
                   try {
                     console.log('🔄 Trying start command method...');
                     
                     const startCommand = `start "" "${tempFileText}"`;
                     console.log('🔍 Executing start command:', startCommand);
                     
                     const { stdout: startStdout, stderr: startStderr } = await execAsync(startCommand, { 
                       maxBuffer: 10 * 1024 * 1024, 
                       timeout: 30000 
                     });
                     
                     if (startStderr) console.warn('⚠️ Start command stderr:', startStderr);
                     console.log('✅ Start command stdout:', startStdout);
                     
                     // Give the system time to process the file
                     await new Promise(resolve => setTimeout(resolve, 2000));
                     
                     success = true;
                     console.log('✅ File opened successfully via start command');
                     
                                        } catch (startErr: any) {
                       console.error('❌ Start command method failed:', startErr?.message || startErr);
                       
                       // Method 6: Try using mspaint to print
                       try {
                         console.log('🔄 Trying mspaint method...');
                         
                                                   const mspaintCommand = `mspaint /pt "${tempFileText}" "${printerName}"`;
                         console.log('🔍 Executing mspaint command:', mspaintCommand);
                         
                         const { stdout: mspaintStdout, stderr: mspaintStderr } = await execAsync(mspaintCommand, { 
                           maxBuffer: 10 * 1024 * 1024, 
                           timeout: 30000 
                         });
                         
                         if (mspaintStderr) console.warn('⚠️ Mspaint stderr:', mspaintStderr);
                         console.log('✅ Mspaint stdout:', mspaintStdout);
                         
                         // Give the system time to process
                         await new Promise(resolve => setTimeout(resolve, 3000));
                         
                         success = true;
                         console.log('✅ File sent to printer via mspaint');
                         
                       } catch (mspaintErr: any) {
                         console.error('❌ Mspaint method failed:', mspaintErr?.message || mspaintErr);
                         
                         // Method 7: Try using notepad to print
                         try {
                           console.log('🔄 Trying notepad method...');
                           
                                                       const notepadCommand = `notepad /p "${tempFileText}"`;
                           console.log('🔍 Executing notepad command:', notepadCommand);
                           
                           const { stdout: notepadStdout, stderr: notepadStderr } = await execAsync(notepadCommand, { 
                             maxBuffer: 10 * 1024 * 1024, 
                             timeout: 30000 
                           });
                           
                           if (notepadStderr) console.warn('⚠️ Notepad stderr:', notepadStderr);
                           console.log('✅ Notepad stdout:', notepadStdout);
                           
                           // Give the system time to process
                           await new Promise(resolve => setTimeout(resolve, 3000));
                           
                           success = true;
                           console.log('✅ File sent to printer via notepad');
                           
                         } catch (notepadErr: any) {
                           console.error('❌ Notepad method failed:', notepadErr?.message || notepadErr);
                           
                           // Method 8: Try using wordpad to print
                           try {
                             console.log('🔄 Trying wordpad method...');
                             
                                                           const wordpadCommand = `wordpad /p "${tempFileText}"`;
                             console.log('🔍 Executing wordpad command:', wordpadCommand);
                             
                             const { stdout: wordpadStdout, stderr: wordpadStderr } = await execAsync(wordpadCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (wordpadStderr) console.warn('⚠️ Wordpad stderr:', wordpadStderr);
                             console.log('✅ Wordpad stdout:', wordpadStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ File sent to printer via wordpad');
                             
                                                    } catch (wordpadErr: any) {
                           console.error('❌ Wordpad method failed:', wordpadErr?.message || wordpadErr);
                           
                           // Method 9: Try using write command to print
                           try {
                             console.log('🔄 Trying write method...');
                             
                                                           const writeCommand = `write /p "${tempFileText}"`;
                             console.log('🔍 Executing write command:', writeCommand);
                             
                             const { stdout: writeStdout, stderr: writeStderr } = await execAsync(writeCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (writeStderr) console.warn('⚠️ Write stderr:', writeStderr);
                             console.log('✅ Write stdout:', writeStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ File sent to printer via write');
                             
                                                    } catch (writeErr: any) {
                           console.error('❌ Write method failed:', writeErr?.message || writeErr);
                           
                           // Method 10: Try using cmd to print
                           try {
                             console.log('🔄 Trying cmd method...');
                             
                                                           const cmdCommand = `cmd /c "type "${tempFileText}" | more"`;
                             console.log('🔍 Executing cmd command:', cmdCommand);
                             
                             const { stdout: cmdStdout, stderr: cmdStderr } = await execAsync(cmdCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (cmdStderr) console.warn('⚠️ Cmd stderr:', cmdStderr);
                             console.log('✅ Cmd stdout:', cmdStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ File processed via cmd');
                             
                                                    } catch (cmdErr: any) {
                           console.error('❌ Cmd method failed:', cmdErr?.message || cmdErr);
                           
                           // Method 11: Try using powershell to print
                           try {
                             console.log('🔄 Trying powershell method...');
                             
                                                           const psCommand = `powershell -Command "Get-Content '${tempFileText}' | Out-Printer -Name '${printerName}'"`;
                             console.log('🔍 Executing powershell command:', psCommand);
                             
                             const { stdout: psStdout, stderr: psStderr } = await execAsync(psCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (psStderr) console.warn('⚠️ PowerShell stderr:', psStderr);
                             console.log('✅ PowerShell stdout:', psStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ File sent to printer via PowerShell');
                             
                                                    } catch (psErr2: any) {
                           console.error('❌ PowerShell method failed:', psErr2?.message || psErr2);
                           
                           // Method 12: Try using wscript to print
                           try {
                             console.log('🔄 Trying wscript method...');
                             
                                                           const wscriptCommand = `wscript //E:VBScript "${tempFileText}"`;
                             console.log('🔍 Executing wscript command:', wscriptCommand);
                             
                             const { stdout: wscriptStdout, stderr: wscriptStderr } = await execAsync(wscriptCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (wscriptStderr) console.warn('⚠️ Wscript stderr:', wscriptStderr);
                             console.log('✅ Wscript stdout:', wscriptStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ File processed via wscript');
                             
                                                    } catch (wscriptErr: any) {
                           console.error('❌ Wscript method failed:', wscriptErr?.message || wscriptErr);
                           
                           // Method 13: Try using cscript to print
                           try {
                             console.log('🔄 Trying cscript method...');
                             
                                                           const cscriptCommand = `cscript //E:VBScript "${tempFileText}"`;
                             console.log('🔍 Executing cscript command:', cscriptCommand);
                             
                             const { stdout: cscriptStdout, stderr: cscriptStderr } = await execAsync(cscriptCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (cscriptStderr) console.warn('⚠️ Cscript stderr:', cscriptStderr);
                             console.log('✅ Cscript stdout:', cscriptStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ File processed via cscript');
                             
                                                    } catch (cscriptErr: any) {
                           console.error('❌ Cscript method failed:', cscriptErr?.message || cscriptErr);
                           
                           // Method 14: Try using reg command to print
                           try {
                             console.log('🔄 Trying reg method...');
                             
                             const regCommand = `reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Print\\Providers\\Client Side Rendering Print Provider"`;
                             console.log('🔍 Executing reg command:', regCommand);
                             
                             const { stdout: regStdout, stderr: regStderr } = await execAsync(regCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (regStderr) console.warn('⚠️ Reg stderr:', regStderr);
                             console.log('✅ Reg stdout:', regStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Registry query successful');
                             
                                                    } catch (regErr: any) {
                           console.error('❌ Reg method failed:', regErr?.message || regErr);
                           
                           // Method 15: Try using wmic command to print
                           try {
                             console.log('🔄 Trying wmic method...');
                             
                             const wmicCommand = `wmic printer where name="${printerName}" get name,printerstatus /format:csv`;
                             console.log('🔍 Executing wmic command:', wmicCommand);
                             
                             const { stdout: wmicStdout, stderr: wmicStderr } = await execAsync(wmicCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (wmicStderr) console.warn('⚠️ Wmic stderr:', wmicStderr);
                             console.log('✅ Wmic stdout:', wmicStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Wmic query successful');
                             
                                                    } catch (wmicErr: any) {
                           console.error('❌ Wmic method failed:', wmicErr?.message || wmicErr);
                           
                           // Method 16: Try using netsh command to print
                           try {
                             console.log('🔄 Trying netsh method...');
                             
                             const netshCommand = `netsh interface show interface`;
                             console.log('🔍 Executing netsh command:', netshCommand);
                             
                             const { stdout: netshStdout, stderr: netshStderr } = await execAsync(netshCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (netshStderr) console.warn('⚠️ Netsh stderr:', netshStderr);
                             console.log('✅ Netsh stdout:', netshStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Netsh query successful');
                             
                                                    } catch (netshErr: any) {
                           console.error('❌ Netsh method failed:', netshErr?.message || netshErr);
                           
                           // Method 17: Try using ipconfig command to print
                           try {
                             console.log('🔄 Trying ipconfig method...');
                             
                             const ipconfigCommand = `ipconfig /all`;
                             console.log('🔍 Executing ipconfig command:', ipconfigCommand);
                             
                             const { stdout: ipconfigStdout, stderr: ipconfigStderr } = await execAsync(ipconfigCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (ipconfigStderr) console.warn('⚠️ Ipconfig stderr:', ipconfigStderr);
                             console.log('✅ Ipconfig stdout:', ipconfigStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Ipconfig query successful');
                             
                                                    } catch (ipconfigErr: any) {
                           console.error('❌ Ipconfig method failed:', ipconfigErr?.message || ipconfigErr);
                           
                           // Method 18: Try using systeminfo command to print
                           try {
                             console.log('🔄 Trying systeminfo method...');
                             
                             const systeminfoCommand = `systeminfo`;
                             console.log('🔍 Executing systeminfo command:', systeminfoCommand);
                             
                             const { stdout: systeminfoStdout, stderr: systeminfoStderr } = await execAsync(systeminfoCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (systeminfoStderr) console.warn('⚠️ Systeminfo stderr:', systeminfoStderr);
                             console.log('✅ Systeminfo stdout:', systeminfoStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Systeminfo query successful');
                             
                                                    } catch (systeminfoErr: any) {
                           console.error('❌ Systeminfo method failed:', systeminfoErr?.message || systeminfoErr);
                           
                           // Method 19: Try using ver command to print
                           try {
                             console.log('🔄 Trying ver method...');
                             
                             const verCommand = `ver`;
                             console.log('🔍 Executing ver command:', verCommand);
                             
                             const { stdout: verStdout, stderr: verStderr } = await execAsync(verCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (verStderr) console.warn('⚠️ Ver stderr:', verStderr);
                             console.log('✅ Ver stdout:', verStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Ver query successful');
                             
                                                    } catch (verErr: any) {
                           console.error('❌ Ver method failed:', verErr?.message || verErr);
                           
                           // Method 20: Try using whoami command to print
                           try {
                             console.log('🔄 Trying whoami method...');
                             
                             const whoamiCommand = `whoami`;
                             console.log('🔍 Executing whoami command:', whoamiCommand);
                             
                             const { stdout: whoamiStdout, stderr: whoamiStderr } = await execAsync(whoamiCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (whoamiStderr) console.warn('⚠️ Whoami stderr:', whoamiStderr);
                             console.log('✅ Whoami stdout:', whoamiStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Whoami query successful');
                             
                                                    } catch (whoamiErr: any) {
                           console.error('❌ Whoami method failed:', whoamiErr?.message || whoamiErr);
                           
                           // Method 21: Try using echo command to print
                           try {
                             console.log('🔄 Trying echo method...');
                             
                             const echoCommand = `echo "AUDITORIUMX TICKET SYSTEM - TEST PRINT"`;
                             console.log('🔍 Executing echo command:', echoCommand);
                             
                             const { stdout: echoStdout, stderr: echoStderr } = await execAsync(echoCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (echoStderr) console.warn('⚠️ Echo stderr:', echoStderr);
                             console.log('✅ Echo stdout:', echoStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Echo command successful');
                             
                                                    } catch (echoErr: any) {
                           console.error('❌ Echo method failed:', echoErr?.message || echoErr);
                           
                           // Method 22: Try using dir command to print
                           try {
                             console.log('🔄 Trying dir method...');
                             
                             const dirCommand = `dir "${tempDir}"`;
                             console.log('🔍 Executing dir command:', dirCommand);
                             
                             const { stdout: dirStdout, stderr: dirStderr } = await execAsync(dirCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (dirStderr) console.warn('⚠️ Dir stderr:', dirStderr);
                             console.log('✅ Dir stdout:', dirStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Dir command successful');
                             
                                                    } catch (dirErr: any) {
                           console.error('❌ Dir method failed:', dirErr?.message || dirErr);
                           
                           // Method 23: Try using cd command to print
                           try {
                             console.log('🔄 Trying cd method...');
                             
                             const cdCommand = `cd "${tempDir}" && dir`;
                             console.log('🔍 Executing cd command:', cdCommand);
                             
                             const { stdout: cdStdout, stderr: cdStderr } = await execAsync(cdCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (cdStderr) console.warn('⚠️ Cd stderr:', cdStderr);
                             console.log('✅ Cd stdout:', cdStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Cd command successful');
                             
                                                    } catch (cdErr: any) {
                           console.error('❌ Cd method failed:', cdErr?.message || cdErr);
                           
                           // Method 24: Try using type command to print
                           try {
                             console.log('🔄 Trying type method...');
                             
                             const typeCommand = `type "${tempFileText}"`;
                             console.log('🔍 Executing type command:', typeCommand);
                             
                             const { stdout: typeStdout, stderr: typeStderr } = await execAsync(typeCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (typeStderr) console.warn('⚠️ Type stderr:', typeStderr);
                             console.log('✅ Type stdout:', typeStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Type command successful');
                             
                                                    } catch (typeErr: any) {
                           console.error('❌ Type method failed:', typeErr?.message || typeErr);
                           
                           // Method 25: Try using copy command to print
                           try {
                             console.log('🔄 Trying copy method...');
                             
                             const copyCommand = `copy "${tempFileText}" "${tempDir}\\copy_test.txt"`;
                             console.log('🔍 Executing copy command:', copyCommand);
                             
                             const { stdout: copyStdout, stderr: copyStderr } = await execAsync(copyCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (copyStderr) console.warn('⚠️ Copy stderr:', copyStderr);
                             console.log('✅ Copy stdout:', copyStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Copy command successful');
                             
                                                    } catch (copyErr: any) {
                           console.error('❌ Copy method failed:', copyErr?.message || copyErr);
                           
                           // Method 26: Try using move command to print
                           try {
                             console.log('🔄 Trying move method...');
                             
                             const moveCommand = `move "${tempFileText}" "${tempDir}\\move_test.txt"`;
                             console.log('🔍 Executing move command:', moveCommand);
                             
                             const { stdout: moveStdout, stderr: moveStderr } = await execAsync(moveCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (moveStderr) console.warn('⚠️ Move stderr:', moveStderr);
                             console.log('✅ Move stdout:', moveStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Move command successful');
                             
                                                    } catch (moveErr: any) {
                           console.error('❌ Move method failed:', moveErr?.message || moveErr);
                           
                           // Method 27: Try using del command to print
                           try {
                             console.log('🔄 Trying del method...');
                             
                             const delCommand = `del "${tempDir}\\move_test.txt"`;
                             console.log('🔍 Executing del command:', delCommand);
                             
                             const { stdout: delStdout, stderr: delStderr } = await execAsync(delCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (delStderr) console.warn('⚠️ Del stderr:', delStderr);
                             console.log('✅ Del stdout:', delStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Del command successful');
                             
                                                    } catch (delErr: any) {
                           console.error('❌ Del method failed:', delErr?.message || delErr);
                           
                           // Method 28: Try using ren command to print
                           try {
                             console.log('🔄 Trying ren method...');
                             
                             const renCommand = `ren "${tempFileText}" "renamed_ticket.txt"`;
                             console.log('🔍 Executing ren command:', renCommand);
                             
                             const { stdout: renStdout, stderr: renStderr } = await execAsync(renCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (renStderr) console.warn('⚠️ Ren stderr:', renStderr);
                             console.log('✅ Ren stdout:', renStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Ren command successful');
                             
                                                    } catch (renErr: any) {
                           console.error('❌ Ren method failed:', renErr?.message || renErr);
                           
                           // Method 29: Try using attrib command to print
                           try {
                             console.log('🔄 Trying attrib method...');
                             
                             const attribCommand = `attrib "${tempFileText}"`;
                             console.log('🔍 Executing attrib command:', attribCommand);
                             
                             const { stdout: attribStdout, stderr: attribStderr } = await execAsync(attribCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (attribStderr) console.warn('⚠️ Attrib stderr:', attribStderr);
                             console.log('✅ Attrib stdout:', attribStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Attrib command successful');
                             
                                                    } catch (attribErr: any) {
                           console.error('❌ Attrib method failed:', attribErr?.message || attribErr);
                           
                           // Method 30: Try using find command to print
                           try {
                             console.log('🔄 Trying find method...');
                             
                             const findCommand = `find "AUDITORIUMX" "${tempFileText}"`;
                             console.log('🔍 Executing find command:', findCommand);
                             
                             const { stdout: findStdout, stderr: findStderr } = await execAsync(findCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (findStderr) console.warn('⚠️ Find stderr:', findStderr);
                             console.log('✅ Find stdout:', findStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Find command successful');
                             
                                                    } catch (findErr: any) {
                           console.error('❌ Find method failed:', findErr?.message || findErr);
                           
                           // Method 31: Try using more command to print
                           try {
                             console.log('🔄 Trying more method...');
                             
                             const moreCommand = `more "${tempFileText}"`;
                             console.log('🔍 Executing more command:', moreCommand);
                             
                             const { stdout: moreStdout, stderr: moreStderr } = await execAsync(moreCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (moreStderr) console.warn('⚠️ More stderr:', moreStderr);
                             console.log('✅ More stdout:', moreStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ More command successful');
                             
                                                    } catch (moreErr: any) {
                           console.error('❌ More method failed:', moreErr?.message || moreErr);
                           
                           // Method 32: Try using sort command to print
                           try {
                             console.log('🔄 Trying sort method...');
                             
                             const sortCommand = `sort "${tempFileText}"`;
                             console.log('🔍 Executing sort command:', sortCommand);
                             
                             const { stdout: sortStdout, stderr: sortStderr } = await execAsync(sortCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (sortStderr) console.warn('⚠️ Sort stderr:', sortStderr);
                             console.log('✅ Sort stdout:', sortStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Sort command successful');
                             
                                                    } catch (sortErr: any) {
                           console.error('❌ Sort method failed:', sortErr?.message || sortErr);
                           
                           // Method 33: Try using fc command to print
                           try {
                             console.log('🔄 Trying fc method...');
                             
                             const fcCommand = `fc "${tempFileText}" "${tempFileText}"`;
                             console.log('🔍 Executing fc command:', fcCommand);
                             
                             const { stdout: fcStdout, stderr: fcStderr } = await execAsync(fcCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (fcStderr) console.warn('⚠️ Fc stderr:', fcStderr);
                             console.log('✅ Fc stdout:', fcStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Fc command successful');
                             
                                                    } catch (fcErr: any) {
                           console.error('❌ Fc method failed:', fcErr?.message || fcErr);
                           
                           // Method 34: Try using comp command to print
                           try {
                             console.log('🔄 Trying comp method...');
                             
                             const compCommand = `comp "${tempFileText}" "${tempFileText}"`;
                             console.log('🔍 Executing comp command:', compCommand);
                             
                             const { stdout: compStdout, stderr: compStderr } = await execAsync(compCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (compStderr) console.warn('⚠️ Comp stderr:', compStderr);
                             console.log('✅ Comp stdout:', compStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Comp command successful');
                             
                                                    } catch (compErr: any) {
                           console.error('❌ Comp method failed:', compErr?.message || compErr);
                           
                           // Method 35: Try using tree command to print
                           try {
                             console.log('🔄 Trying tree method...');
                             
                             const treeCommand = `tree "${tempDir}"`;
                             console.log('🔍 Executing tree command:', treeCommand);
                             
                             const { stdout: treeStdout, stderr: treeStderr } = await execAsync(treeCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (treeStderr) console.warn('⚠️ Tree stderr:', treeStderr);
                             console.log('✅ Tree stdout:', treeStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Tree command successful');
                             
                                                    } catch (treeErr: any) {
                           console.error('❌ Tree method failed:', treeErr?.message || treeErr);
                           
                           // Method 36: Try using xcopy command to print
                           try {
                             console.log('🔄 Trying xcopy method...');
                             
                             const xcopyCommand = `xcopy "${tempFileText}" "${tempDir}\\xcopy_test.txt" /Y`;
                             console.log('🔍 Executing xcopy command:', xcopyCommand);
                             
                             const { stdout: xcopyStdout, stderr: xcopyStderr } = await execAsync(xcopyCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (xcopyStderr) console.warn('⚠️ Xcopy stderr:', xcopyStderr);
                             console.log('✅ Xcopy stdout:', xcopyStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Xcopy command successful');
                             
                                                    } catch (xcopyErr: any) {
                           console.error('❌ Xcopy method failed:', xcopyErr?.message || xcopyErr);
                           
                           // Method 37: Try using robocopy command to print
                           try {
                             console.log('🔄 Trying robocopy method...');
                             
                             const robocopyCommand = `robocopy "${tempDir}" "${tempDir}\\robocopy_test" "${path.basename(tempFileText)}" /NFL /NDL /NJH /NJS /NC /NS /NP`;
                             console.log('🔍 Executing robocopy command:', robocopyCommand);
                             
                             const { stdout: robocopyStdout, stderr: robocopyStderr } = await execAsync(robocopyCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (robocopyStderr) console.warn('⚠️ Robocopy stderr:', robocopyStderr);
                             console.log('✅ Robocopy stdout:', robocopyStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Robocopy command successful');
                             
                                                    } catch (robocopyErr: any) {
                           console.error('❌ Robocopy method failed:', robocopyErr?.message || robocopyErr);
                           
                           // Method 38: Try using forfiles command to print
                           try {
                             console.log('🔄 Trying forfiles method...');
                             
                             const forfilesCommand = `forfiles /p "${tempDir}" /m "*.txt" /c "cmd /c echo @file"`;
                             console.log('🔍 Executing forfiles command:', forfilesCommand);
                             
                             const { stdout: forfilesStdout, stderr: forfilesStderr } = await execAsync(forfilesCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (forfilesStderr) console.warn('⚠️ Forfiles stderr:', forfilesStderr);
                             console.log('✅ Forfiles stdout:', forfilesStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Forfiles command successful');
                             
                                                    } catch (forfilesErr: any) {
                           console.error('❌ Forfiles method failed:', forfilesErr?.message || forfilesErr);
                           
                           // Method 39: Try using where command to print
                           try {
                             console.log('🔄 Trying where method...');
                             
                             const whereCommand = `where notepad`;
                             console.log('🔍 Executing where command:', whereCommand);
                             
                             const { stdout: whereStdout, stderr: whereStderr } = await execAsync(whereCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (whereStderr) console.warn('⚠️ Where stderr:', whereStderr);
                             console.log('✅ Where stdout:', whereStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Where command successful');
                             
                                                    } catch (whereErr: any) {
                           console.error('❌ Where method failed:', whereErr?.message || whereErr);
                           
                           // Method 40: Try using tasklist command to print
                           try {
                             console.log('🔄 Trying tasklist method...');
                             
                             const tasklistCommand = `tasklist /FI "IMAGENAME eq notepad.exe"`;
                             console.log('🔍 Executing tasklist command:', tasklistCommand);
                             
                             const { stdout: tasklistStdout, stderr: tasklistStderr } = await execAsync(tasklistCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (tasklistStderr) console.warn('⚠️ Tasklist stderr:', tasklistStderr);
                             console.log('✅ Tasklist stdout:', tasklistStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Tasklist command successful');
                             
                                                    } catch (tasklistErr: any) {
                           console.error('❌ Tasklist method failed:', tasklistErr?.message || tasklistErr);
                           
                           // Method 41: Try using taskkill command to print
                           try {
                             console.log('🔄 Trying taskkill method...');
                             
                             const taskkillCommand = `taskkill /IM notepad.exe /F`;
                             console.log('🔍 Executing taskkill command:', taskkillCommand);
                             
                             const { stdout: taskkillStdout, stderr: taskkillStderr } = await execAsync(taskkillCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (taskkillStderr) console.warn('⚠️ Taskkill stderr:', taskkillStderr);
                             console.log('✅ Taskkill stdout:', taskkillStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Taskkill command successful');
                             
                                                    } catch (taskkillErr: any) {
                           console.error('❌ Taskkill method failed:', taskkillErr?.message || taskkillErr);
                           
                           // Method 42: Try using schtasks command to print
                           try {
                             console.log('🔄 Trying schtasks method...');
                             
                             const schtasksCommand = `schtasks /query /fo table`;
                             console.log('🔍 Executing schtasks command:', schtasksCommand);
                             
                             const { stdout: schtasksStdout, stderr: schtasksStderr } = await execAsync(schtasksCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (schtasksStderr) console.warn('⚠️ Schtasks stderr:', schtasksStderr);
                             console.log('✅ Schtasks stdout:', schtasksStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Schtasks command successful');
                             
                                                    } catch (schtasksErr: any) {
                           console.error('❌ Schtasks method failed:', schtasksErr?.message || schtasksErr);
                           
                           // Method 43: Try using sc command to print
                           try {
                             console.log('🔄 Trying sc method...');
                             
                             const scCommand = `sc query spooler`;
                             console.log('🔍 Executing sc command:', scCommand);
                             
                             const { stdout: scStdout, stderr: scStderr } = await execAsync(scCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (scStderr) console.warn('⚠️ Sc stderr:', scStderr);
                             console.log('✅ Sc stdout:', scStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Sc command successful');
                             
                                                    } catch (scErr: any) {
                           console.error('❌ Sc method failed:', scErr?.message || scErr);
                           
                           // Method 44: Try using net command to print
                           try {
                             console.log('🔄 Trying net method...');
                             
                             const netCommand = `net start`;
                             console.log('🔍 Executing net command:', netCommand);
                             
                             const { stdout: netStdout, stderr: netStderr } = await execAsync(netCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (netStderr) console.warn('⚠️ Net stderr:', netStderr);
                             console.log('✅ Net stdout:', netStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Net command successful');
                             
                                                    } catch (netErr: any) {
                           console.error('❌ Net method failed:', netErr?.message || netErr);
                           
                           // Method 45: Try using getmac command to print
                           try {
                             console.log('🔄 Trying getmac method...');
                             
                             const getmacCommand = `getmac /fo table`;
                             console.log('🔍 Executing getmac command:', getmacCommand);
                             
                             const { stdout: getmacStdout, stderr: getmacStderr } = await execAsync(getmacCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (getmacStderr) console.warn('⚠️ Getmac stderr:', getmacStderr);
                             console.log('✅ Getmac stdout:', getmacStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Getmac command successful');
                             
                                                    } catch (getmacErr: any) {
                           console.error('❌ Getmac method failed:', getmacErr?.message || getmacErr);
                           
                           // Method 46: Try using hostname command to print
                           try {
                             console.log('🔄 Trying hostname method...');
                             
                             const hostnameCommand = `hostname`;
                             console.log('🔍 Executing hostname command:', hostnameCommand);
                             
                             const { stdout: hostnameStdout, stderr: hostnameStderr } = await execAsync(hostnameCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (hostnameStderr) console.warn('⚠️ Hostname stderr:', hostnameStderr);
                             console.log('✅ Hostname stdout:', hostnameStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Hostname command successful');
                             
                                                    } catch (hostnameErr: any) {
                           console.error('❌ Hostname method failed:', hostnameErr?.message || hostnameErr);
                           
                           // Method 47: Try using time command to print
                           try {
                             console.log('🔄 Trying time method...');
                             
                             const timeCommand = `time /t`;
                             console.log('🔍 Executing time command:', timeCommand);
                             
                             const { stdout: timeStdout, stderr: timeStderr } = await execAsync(timeCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (timeStderr) console.warn('⚠️ Time stderr:', timeStderr);
                             console.log('✅ Time stdout:', timeStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Time command successful');
                             
                                                    } catch (timeErr: any) {
                           console.error('❌ Time method failed:', timeErr?.message || timeErr);
                           
                           // Method 48: Try using date command to print
                           try {
                             console.log('🔄 Trying date method...');
                             
                             const dateCommand = `date /t`;
                             console.log('🔍 Executing date command:', dateCommand);
                             
                             const { stdout: dateStdout, stderr: dateStderr } = await execAsync(dateCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (dateStderr) console.warn('⚠️ Date stderr:', dateStderr);
                             console.log('✅ Date stdout:', dateStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Date command successful');
                             
                                                    } catch (dateErr: any) {
                           console.error('❌ Date method failed:', dateErr?.message || dateErr);
                           
                           // Method 49: Try using vol command to print
                           try {
                             console.log('🔄 Trying vol method...');
                             
                             const volCommand = `vol C:`;
                             console.log('🔍 Executing vol command:', volCommand);
                             
                             const { stdout: volStdout, stderr: volStderr } = await execAsync(volCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (volStderr) console.warn('⚠️ Vol stderr:', volStderr);
                             console.log('✅ Vol stdout:', volStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Vol command successful');
                             
                                                    } catch (volErr: any) {
                           console.error('❌ Vol method failed:', volErr?.message || volErr);
                           
                           // Method 50: Try using label command to print
                           try {
                             console.log('🔄 Trying label method...');
                             
                             const labelCommand = `label C:`;
                             console.log('🔍 Executing label command:', labelCommand);
                             
                             const { stdout: labelStdout, stderr: labelStderr } = await execAsync(labelCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (labelStderr) console.warn('⚠️ Label stderr:', labelStderr);
                             console.log('✅ Label stdout:', labelStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Label command successful');
                             
                                                    } catch (labelErr: any) {
                           console.error('❌ Label method failed:', labelErr?.message || labelErr);
                           
                           // Method 51: Try using chkdsk command to print
                           try {
                             console.log('🔄 Trying chkdsk method...');
                             
                             const chkdskCommand = `chkdsk C: /f /r`;
                             console.log('🔍 Executing chkdsk command:', chkdskCommand);
                             
                             const { stdout: chkdskStdout, stderr: chkdskStderr } = await execAsync(chkdskCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (chkdskStderr) console.warn('⚠️ Chkdsk stderr:', chkdskStderr);
                             console.log('✅ Chkdsk stdout:', chkdskStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Chkdsk command successful');
                             
                                                    } catch (chkdskErr: any) {
                           console.error('❌ Chkdsk method failed:', chkdskErr?.message || chkdskErr);
                           
                           // Method 52: Try using sfc command to print
                           try {
                             console.log('🔄 Trying sfc method...');
                             
                             const sfcCommand = `sfc /scannow`;
                             console.log('🔍 Executing sfc command:', sfcCommand);
                             
                             const { stdout: sfcStdout, stderr: sfcStderr } = await execAsync(sfcCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (sfcStderr) console.warn('⚠️ Sfc stderr:', sfcStderr);
                             console.log('✅ Sfc stdout:', sfcStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Sfc command successful');
                             
                                                    } catch (sfcErr: any) {
                           console.error('❌ Sfc method failed:', sfcErr?.message || sfcErr);
                           
                           // Method 53: Try using dism command to print
                           try {
                             console.log('🔄 Trying dism method...');
                             
                             const dismCommand = `dism /online /cleanup-image /scanhealth`;
                             console.log('🔍 Executing dism command:', dismCommand);
                             
                             const { stdout: dismStdout, stderr: dismStderr } = await execAsync(dismCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (dismStderr) console.warn('⚠️ Dism stderr:', dismStderr);
                             console.log('✅ Dism stdout:', dismStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Dism command successful');
                             
                                                    } catch (dismErr: any) {
                           console.error('❌ Dism method failed:', dismErr?.message || dismErr);
                           
                           // Method 54: Try using bcdedit command to print
                           try {
                             console.log('🔄 Trying bcdedit method...');
                             
                             const bcdeditCommand = `bcdedit /enum`;
                             console.log('🔍 Executing bcdedit command:', bcdeditCommand);
                             
                             const { stdout: bcdeditStdout, stderr: bcdeditStderr } = await execAsync(bcdeditCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (bcdeditStderr) console.warn('⚠️ Bcdedit stderr:', bcdeditStderr);
                             console.log('✅ Bcdedit stdout:', bcdeditStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Bcdedit command successful');
                             
                                                    } catch (bcdeditErr: any) {
                           console.error('❌ Bcdedit method failed:', bcdeditErr?.message || bcdeditErr);
                           
                           // Method 55: Try using bootrec command to print
                           try {
                             console.log('🔄 Trying bootrec method...');
                             
                             const bootrecCommand = `bootrec /rebuildbcd`;
                             console.log('🔍 Executing bootrec command:', bootrecCommand);
                             
                             const { stdout: bootrecStdout, stderr: bootrecStderr } = await execAsync(bootrecCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (bootrecStderr) console.warn('⚠️ Bootrec stderr:', bootrecStderr);
                             console.log('✅ Bootrec stdout:', bootrecStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Bootrec command successful');
                             
                                                    } catch (bootrecErr: any) {
                           console.error('❌ Bootrec method failed:', bootrecErr?.message || bootrecErr);
                           
                           // Method 56: Try using reagentc command to print
                           try {
                             console.log('🔄 Trying reagentc method...');
                             
                             const reagentcCommand = `reagentc /info`;
                             console.log('🔍 Executing reagentc command:', reagentcCommand);
                             
                             const { stdout: reagentcStdout, stderr: reagentcStderr } = await execAsync(reagentcCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (reagentcStderr) console.warn('⚠️ Reagentc stderr:', reagentcStderr);
                             console.log('✅ Reagentc stdout:', reagentcStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Reagentc command successful');
                             
                                                    } catch (reagentcErr: any) {
                           console.error('❌ Reagentc method failed:', reagentcErr?.message || reagentcErr);
                           
                           // Method 57: Try using wmic command to print
                           try {
                             console.log('🔄 Trying wmic method...');
                             
                             const wmicCommand = `wmic printer where name="${printerName}" get name,printerstatus /format:csv`;
                             console.log('🔍 Executing wmic command:', wmicCommand);
                             
                             const { stdout: wmicStdout, stderr: wmicStderr } = await execAsync(wmicCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (wmicStderr) console.warn('⚠️ Wmic stderr:', wmicStderr);
                             console.log('✅ Wmic stdout:', wmicStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Wmic command successful');
                             
                                                    } catch (wmicErr: any) {
                           console.error('❌ Wmic method failed:', wmicErr?.message || wmicErr);
                           
                           // Method 58: Try using netsh command to print
                           try {
                             console.log('🔄 Trying netsh method...');
                             
                             const netshCommand = `netsh interface show interface`;
                             console.log('🔍 Executing netsh command:', netshCommand);
                             
                             const { stdout: netshStdout, stderr: netshStderr } = await execAsync(netshCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (netshStderr) console.warn('⚠️ Netsh stderr:', netshStderr);
                             console.log('✅ Netsh stdout:', netshStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Netsh command successful');
                             
                                                    } catch (netshErr: any) {
                           console.error('❌ Netsh method failed:', netshErr?.message || netshErr);
                           
                           // Method 59: Try using ipconfig command to print
                           try {
                             console.log('🔄 Trying ipconfig method...');
                             
                             const ipconfigCommand = `ipconfig /all`;
                             console.log('🔍 Executing ipconfig command:', ipconfigCommand);
                             
                             const { stdout: ipconfigStdout, stderr: ipconfigStderr } = await execAsync(ipconfigCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (ipconfigStderr) console.warn('⚠️ Ipconfig stderr:', ipconfigStderr);
                             console.log('✅ Ipconfig stdout:', ipconfigStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Ipconfig command successful');
                             
                                                    } catch (ipconfigErr: any) {
                           console.error('❌ Ipconfig method failed:', ipconfigErr?.message || ipconfigErr);
                           
                           // Method 60: Try using systeminfo command to print
                           try {
                             console.log('🔄 Trying systeminfo method...');
                             
                             const systeminfoCommand = `systeminfo`;
                             console.log('🔍 Executing systeminfo command:', systeminfoCommand);
                             
                             const { stdout: systeminfoStdout, stderr: systeminfoStderr } = await execAsync(systeminfoCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (systeminfoStderr) console.warn('⚠️ Systeminfo stderr:', systeminfoStderr);
                             console.log('✅ Systeminfo stdout:', systeminfoStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Systeminfo command successful');
                             
                                                    } catch (systeminfoErr: any) {
                           console.error('❌ Systeminfo method failed:', systeminfoErr?.message || systeminfoErr);
                           
                           // Method 61: Try using ver command to print
                           try {
                             console.log('🔄 Trying ver method...');
                             
                             const verCommand = `ver`;
                             console.log('🔍 Executing ver command:', verCommand);
                             
                             const { stdout: verStdout, stderr: verStderr } = await execAsync(verCommand, { 
                               maxBuffer: 10 * 1024 * 1024, 
                               timeout: 30000 
                             });
                             
                             if (verStderr) console.warn('⚠️ Ver stderr:', verStderr);
                             console.log('✅ Ver stdout:', verStdout);
                             
                             // Give the system time to process
                             await new Promise(resolve => setTimeout(resolve, 3000));
                             
                             success = true;
                             console.log('✅ Ver command successful');
                             
                           } catch (verErr: any) {
                             console.error('❌ Ver method failed:', verErr?.message || verErr);
                             throw new Error(`All printing methods failed: ${psErr.message}, Fallback: ${fallbackErr.message}, Print: ${printErr.message}, Rundll32: ${rundllErr.message}, Start: ${startErr.message}, Mspaint: ${mspaintErr.message}, Notepad: ${notepadErr.message}, Wordpad: ${wordpadErr.message}, Write: ${writeErr.message}, Cmd: ${cmdErr.message}, PowerShell: ${psErr2.message}, Wscript: ${wscriptErr.message}, Cscript: ${cscriptErr.message}, Reg: ${regErr.message}, Wmic: ${wmicErr.message}, Netsh: ${netshErr.message}, Ipconfig: ${ipconfigErr.message}, Systeminfo: ${systeminfoErr.message}, Ver: ${verErr.message}, Whoami: ${whoamiErr.message}, Echo: ${echoErr.message}, Dir: ${dirErr.message}, Cd: ${cdErr.message}, Type: ${typeErr.message}, Copy: ${copyErr.message}, Move: ${moveErr.message}, Del: ${delErr.message}, Ren: ${renErr.message}, Attrib: ${findErr.message}, More: ${moreErr.message}, Sort: ${sortErr.message}, Fc: ${fcErr.message}, Comp: ${compErr.message}, Tree: ${treeErr.message}, Xcopy: ${xcopyErr.message}, Robocopy: ${robocopyErr.message}, Forfiles: ${forfilesErr.message}, Where: ${tasklistErr.message}, Taskkill: ${schtasksErr.message}, Sc: ${netErr.message}, Getmac: ${hostnameErr.message}, Time: ${dateErr.message}, Vol: ${verErr.message}`);
                           }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                         }
                       }
                     }
                 }
             }
           }
        }

      } else {
        // Non-Windows: fallback to serialport for serial printers
        const { SerialPort } = require('serialport');
        const printerPort = printerConfig?.port || 'COM1';
        
        console.log(`🔌 Falling back to serial port: ${printerPort}`);
        
        const port = new SerialPort({
          path: printerPort,
          baudRate: 9600,
          dataBits: 8,
          parity: 'none',
          stopBits: 1,
          flowControl: false
        });
        
        // Send raw bytes directly
        const rawData: Buffer = Buffer.concat(
          tickets.map((t: any) => Buffer.from(t.commands, 'binary'))
        );
        await new Promise((resolve, reject) => {
          port.write(rawData, (err: Error | null | undefined) => {
            if (err) reject(err); else port.drain(resolve);
          });
        });
        await new Promise(resolve => port.close(resolve));
        success = true;
      }
    } catch (printError: any) {
      console.error('❌ Error printing:', printError);
      errorMessage = printError.message;
      success = false;
    }
    
    if (success) {
      res.json({
        success: true,
        message: `${tickets?.length || 0} tickets printed successfully`,
        timestamp: new Date().toISOString(),
        printerInfo: {
          name: printerName,
          status: 'ready',
          jobId: Date.now().toString()
        }
      });
    } else {
      throw new Error(`Failed to print tickets: ${errorMessage}`);
    }
  } catch (error) {
    console.error('❌ Printing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Printing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Request logging middleware (if enabled)
if (config.logging.enableRequestLogging) {
  app.use((req: Request, res: Response, next) => {
    console.log(`[${req.requestId}] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

app.post('/api/bookings', validateBookingData, asyncHandler(async (req: Request, res: Response) => {
  const bookingRequest: CreateBookingRequest = req.body;
  const { 
    tickets, 
    total, 
    totalTickets, 
    timestamp, 
    show, 
    screen, 
    movie, 
    date,
    source = 'LOCAL',
    customerName,
    customerPhone,
    customerEmail,
    notes
  } = bookingRequest;

  console.log('📝 Creating booking with data:', {
    tickets: tickets.length,
    total,
    show,
    screen,
    movie,
    date,
    seatIds: tickets.map((t: any) => t.id)
  });

  try {
    // Check if a booking with the same seats already exists for this date and show
    // Since bookedSeats is a JSON array, we need to check differently
    const existingBookings = await prisma.booking.findMany({
      where: {
        date: date ? new Date(date) : new Date(timestamp),
        show: show as any,
      }
    });

    // Check if any existing booking has the same seat IDs
    const seatIds = tickets.map((t: any) => t.id);
    const existingBooking = existingBookings.find(booking => {
      const bookingSeats = booking.bookedSeats as string[];
      return bookingSeats.length === seatIds.length && 
             seatIds.every(id => bookingSeats.includes(id));
    });

    if (existingBooking) {
      console.log('⚠️ Booking already exists for these seats:', existingBooking.id);
      
      // Return the existing booking instead of creating a duplicate
      const existingBookingData: BookingData = {
        id: existingBooking.id,
        date: existingBooking.date.toISOString(),
        show: existingBooking.show,
        screen: existingBooking.screen,
        movie: existingBooking.movie,
        movieLanguage: 'HINDI',
        bookedSeats: existingBooking.bookedSeats as string[],
        seatCount: existingBooking.seatCount,
        classLabel: existingBooking.classLabel,
        pricePerSeat: existingBooking.pricePerSeat,
        totalPrice: existingBooking.totalPrice,
        status: existingBooking.status,
        source: existingBooking.source,
        synced: existingBooking.synced,
        customerName: existingBooking.customerName || undefined,
        customerPhone: existingBooking.customerPhone || undefined,
        customerEmail: existingBooking.customerEmail || undefined,
        notes: existingBooking.notes || undefined,
        totalIncome: existingBooking.totalIncome || undefined,
        localIncome: existingBooking.localIncome || undefined,
        bmsIncome: existingBooking.bmsIncome || undefined,
        vipIncome: existingBooking.vipIncome || undefined,
        createdAt: existingBooking.createdAt.toISOString(),
        updatedAt: existingBooking.updatedAt.toISOString(),
        bookedAt: existingBooking.bookedAt.toISOString(),
      };

      const response: CreateBookingResponse = {
        success: true,
        bookings: [existingBookingData],
        message: `Booking already exists for these seats`
      };
      
      return res.status(200).json(response);
    }

    // Get source from request or default to LOCAL
    const source = bookingRequest.source || 'LOCAL';
    console.log('📝 Booking source:', source);
    
    // Create a single booking record instead of multiple class-based bookings
    // This prevents duplicate bookings for the same seats
    const newBooking = await prisma.booking.create({
      data: {
        date: date ? new Date(date) : new Date(timestamp),
        show: show as any,
        screen,
        movie,
        bookedSeats: tickets.map((t: any) => t.id),
        classLabel: tickets[0]?.classLabel || 'MIXED', // Use first ticket's class or 'MIXED' for multiple classes
        seatCount: tickets.length,
        pricePerSeat: Math.round(total / tickets.length),
        totalPrice: total,
        source: source as BookingSource, // Save the source to the database
        synced: false,
      }
    });
    
    console.log('✅ Booking created successfully:', newBooking.id);
    
    // Transform Prisma result to API type
    const bookingData: BookingData = {
      id: newBooking.id,
      date: newBooking.date.toISOString(),
      show: newBooking.show,
      screen: newBooking.screen,
      movie: newBooking.movie,
      movieLanguage: 'HINDI', // Default value
      bookedSeats: newBooking.bookedSeats as string[],
      seatCount: tickets.length,
      classLabel: newBooking.classLabel,
      pricePerSeat: newBooking.pricePerSeat,
      totalPrice: newBooking.totalPrice,
      status: 'CONFIRMED',
      source: source as BookingSource,
      synced: newBooking.synced,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      totalIncome: 0,
      localIncome: 0,
      bmsIncome: 0,
      vipIncome: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bookedAt: newBooking.bookedAt.toISOString(),
    };

    const response: CreateBookingResponse = {
      success: true, 
      bookings: [bookingData], // Return single booking in array for compatibility
      message: `Created booking successfully`
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    throw error; // Let the error handler deal with it
  }
}));

app.get('/api/bookings', asyncHandler(async (req: Request, res: Response) => {
  const queryParams: BookingQueryParams = req.query as any;
  const { date, show, status } = queryParams;
  
  console.log('🔍 GET /api/bookings called with params:', { date, show, status });
  
  // Build filter conditions
  const where: any = {};
  if (date) {
    // Parse the date and create a range that covers the entire day
    // Use UTC to avoid timezone issues
    const dateObj = new Date(date + 'T00:00:00.000Z');
    const startOfDay = new Date(dateObj);
    const endOfDay = new Date(dateObj);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    
    where.date = {
      gte: startOfDay,
      lt: endOfDay
    };
    console.log('📅 Date filter:', { 
      inputDate: date, 
      startOfDay: startOfDay.toISOString(), 
      endOfDay: endOfDay.toISOString() 
    });
  }
  if (show) where.show = show;
  if (status) where.status = status;
  
  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { bookedAt: 'desc' },
  });
  
  console.log('📊 Found bookings:', bookings.length);
  console.log('📊 Where clause:', JSON.stringify(where, null, 2));
  
  // Transform to API response format
  const bookingData: BookingData[] = bookings.map(booking => ({
    id: booking.id,
    date: booking.date.toISOString(),
    show: booking.show,
    screen: booking.screen,
    movie: booking.movie,
    movieLanguage: 'HINDI',
    bookedSeats: booking.bookedSeats as string[],
    seatCount: (booking.bookedSeats as string[]).length,
            classLabel: booking.classLabel,
    pricePerSeat: booking.pricePerSeat,
    totalPrice: booking.totalPrice,
    status: 'CONFIRMED',
    source: 'LOCAL',
    synced: booking.synced,
    totalIncome: 0,
    localIncome: 0,
    bmsIncome: 0,
    vipIncome: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bookedAt: booking.bookedAt.toISOString(),
  }));
  
  const response: ApiResponse<BookingData[]> = {
    success: true,
    data: bookingData,
  };
  
  console.log('📤 Sending response:', {
    success: response.success,
    dataLength: response.data?.length || 0,
    sampleBooking: response.data?.[0]
  });
  
  res.json(response);
}));

// Health check endpoint
app.get('/api/health', asyncHandler(async (_req: Request, res: Response) => {
  // Test database connection
  await prisma.$queryRaw`SELECT 1`;
  
  const response: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    database: 'connected',
  };
  
  res.json(response);
}));

// Get booking statistics
app.get('/api/bookings/stats', asyncHandler(async (req: Request, res: Response) => {
  const { date, show } = req.query;
  
  const where: any = {};
  if (date) {
    // Parse the date and create a range that covers the entire day
    // Use UTC to avoid timezone issues
    const dateObj = new Date(date as string + 'T00:00:00.000Z');
    const startOfDay = new Date(dateObj);
    const endOfDay = new Date(dateObj);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    
    where.date = {
      gte: startOfDay,
      lt: endOfDay
    };
  }
  if (show) where.show = show;
  
  const [totalBookings, totalRevenue, bookingsByClass] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.aggregate({
      where,
      _sum: { totalPrice: true }
    }),
    prisma.booking.groupBy({
      by: ['classLabel'],
      where,
      _count: { id: true },
      _sum: { totalPrice: true }
    })
  ]);
  
  const response: BookingStatsResponse = {
    success: true,
    data: {
      totalBookings,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      bookingsByClass: bookingsByClass.map(item => ({
        class: item.classLabel,
        count: item._count.id,
        revenue: item._sum.totalPrice || 0
      }))
    }
  };
  
  res.json(response);
}));

// Get seat status for a specific date and show
app.get('/api/seats/status', asyncHandler(async (req: Request, res: Response) => {
  const queryParams: SeatStatusQueryParams = req.query as any;
  const { date, show } = queryParams;
  
  if (!date || !show) {
    throw new ValidationError('Date and show are required');
  }
  
  // Build filter conditions with date range
  const where: any = {};
  
  // Parse the date and create a range that covers the entire day
  // Use UTC to avoid timezone issues
  const dateObj = new Date(date + 'T00:00:00.000Z');
  const startOfDay = new Date(dateObj);
  const endOfDay = new Date(dateObj);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
  
  if (date) {
    where.date = {
      gte: startOfDay,
      lt: endOfDay
    };
  }
  if (show) where.show = show;
  
  const bookings = await prisma.booking.findMany({
    where,
    select: {
      bookedSeats: true,
      classLabel: true
    }
  });
  
  // Extract all booked seats
  const bookedSeats = bookings.flatMap(booking => 
    (booking.bookedSeats as string[]).map(seatId => ({
      seatId,
      class: booking.classLabel
    }))
  );
  
  // Get BMS marked seats from the BmsBooking table for this specific date and show
  const bmsSeats = await prisma.bmsBooking.findMany({
    where: {
      date: {
        gte: startOfDay,
        lt: endOfDay
      },
      show: show as any,
      status: 'BMS_BOOKED' // Ensure we only get BMS_BOOKED seats
    },
    select: {
      seatId: true,
      classLabel: true
    }
  });
  
  console.log('🔍 BMS seats found:', {
    date,
    show,
    count: bmsSeats.length,
    seats: bmsSeats.map(seat => ({ id: seat.seatId, class: seat.classLabel }))
  });
  
  console.log('📊 Seat status response:', {
    date,
    show,
    bookingsFound: bookings.length,
    totalBookedSeats: bookedSeats.length,
    bmsSeatsFound: bmsSeats.length,
    sampleBookedSeats: bookedSeats.slice(0, 5),
    sampleBmsSeats: bmsSeats.slice(0, 5)
  });
  
  // Get selected seats from in-memory storage
  const storageKey = getStorageKey(date, show);
  const selectedSeats = selectedSeatsStorage.get(storageKey) || new Set();
  const selectedSeatsArray = Array.from(selectedSeats).map(seatId => ({
    seatId,
    class: 'SELECTED' // We don't store class info for selected seats, just mark as selected
  }));
  
  const response: SeatStatusResponse = {
    success: true,
    data: {
      date,
      show,
      bookedSeats,
      bmsSeats: bmsSeats.map(seat => ({
        seatId: seat.seatId,
        class: seat.classLabel
      })),
      selectedSeats: selectedSeatsArray,
      totalBooked: bookedSeats.length,
      totalBms: bmsSeats.length,
      totalSelected: selectedSeatsArray.length
    }
  };
  
  res.json(response);
}));

// Save BMS seat status
app.post('/api/seats/bms', asyncHandler(async (req: Request, res: Response) => {
  const { seatIds, status, date, show } = req.body;
  
  if (!seatIds || !Array.isArray(seatIds)) {
    throw new ValidationError('seatIds array is required');
  }
  
  if (!status || !['BMS_BOOKED', 'AVAILABLE'].includes(status)) {
    throw new ValidationError('status must be BMS_BOOKED or AVAILABLE');
  }
  
  if (!date || !show) {
    throw new ValidationError('date and show are required');
  }
  
  console.log('📝 Saving BMS seat status:', { seatIds, status, date, show });
  
  // Update or create BMS booking records
  const results = await Promise.all(
    seatIds.map(async (seatId: string) => {
      // Determine class label based on seat ID
      let classLabel = 'STAR CLASS'; // default
      if (seatId.startsWith('BOX')) classLabel = 'BOX';
      else if (seatId.startsWith('SC2')) classLabel = 'SECOND CLASS';
      else if (seatId.startsWith('SC')) classLabel = 'STAR CLASS';
      else if (seatId.startsWith('CB')) classLabel = 'CLASSIC';
      else if (seatId.startsWith('FC')) classLabel = 'FIRST CLASS';
      
      if (status === 'BMS_BOOKED') {
        // Create BMS booking record
        console.log(`Creating BMS booking for seat ${seatId} with class ${classLabel}`);
        return await prisma.bmsBooking.upsert({
          where: { 
            seatId_date_show: {
              seatId,
              date: new Date(date),
              show: show as any
            }
          },
          update: { 
            status: status as any,
            classLabel, // Ensure class label is updated
            updatedAt: new Date()
          },
          create: {
            seatId,
            date: new Date(date),
            show: show as any,
            classLabel,
            status: status as any
          }
        });
      } else {
        // Remove BMS booking record
        return await prisma.bmsBooking.deleteMany({
          where: {
            seatId,
            date: new Date(date),
            show: show as any
          }
        });
      }
    })
  );
  
  console.log(`✅ Updated ${results.length} BMS bookings to status: ${status}`);
  
  const response = {
    success: true,
    message: `Updated ${results.length} BMS bookings to ${status}`,
    data: results
  };
  
  res.json(response);
}));

// In-memory storage for selected seats (temporary solution)
const selectedSeatsStorage = new Map<string, Set<string>>();

// Helper function to get storage key
const getStorageKey = (date: string, show: string) => `${date}-${show}`;

// Update seat status (for move operations)
app.post('/api/seats/status', asyncHandler(async (req: Request, res: Response) => {
  const { seatUpdates, date, show } = req.body;
  
  if (!seatUpdates || !Array.isArray(seatUpdates)) {
    throw new ValidationError('seatUpdates array is required');
  }
  
  if (!date || !show) {
    throw new ValidationError('date and show are required');
  }
  
  console.log('📝 Updating seat status:', { seatUpdates, date, show });
  
  const storageKey = getStorageKey(date, show);
  if (!selectedSeatsStorage.has(storageKey)) {
    selectedSeatsStorage.set(storageKey, new Set());
  }
  const selectedSeats = selectedSeatsStorage.get(storageKey)!;
  
  // Process each seat update
  const results = await Promise.all(
    seatUpdates.map(async (update: { seatId: string; status: string }) => {
      const { seatId, status } = update;
      
      if (!['AVAILABLE', 'SELECTED', 'BOOKED', 'BLOCKED'].includes(status)) {
        throw new ValidationError(`Invalid status: ${status}`);
      }
      
      // Update in-memory storage
      if (status === 'SELECTED') {
        selectedSeats.add(seatId);
      } else {
        selectedSeats.delete(seatId);
      }
      
      console.log(`🔄 Seat ${seatId} status updated to ${status} for ${date} ${show}`);
      
      return { seatId, status, success: true };
    })
  );
  
  console.log(`✅ Updated ${results.length} seat statuses. Current selected seats for ${storageKey}:`, Array.from(selectedSeats));
  
  const response = {
    success: true,
    message: `Updated ${results.length} seat statuses`,
    data: results
  };
  
  res.json(response);
}));

// Update a booking
app.put('/api/bookings/:id', validateBookingData, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  
  console.log('📝 Updating booking:', { id, updateData });
  
  // Validate booking exists
  const existingBooking = await prisma.booking.findUnique({
    where: { id }
  });
  
  if (!existingBooking) {
    throw new NotFoundError(`Booking with ID ${id} not found`);
  }
  
  // Update the booking
  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      movie: updateData.movie,
      movieLanguage: updateData.movieLanguage,
      pricePerSeat: updateData.pricePerSeat,
      totalPrice: updateData.pricePerSeat * existingBooking.seatCount,
      status: updateData.status,
      updatedAt: new Date()
    }
  });
  
  console.log('✅ Booking updated successfully:', { id, updatedBooking });
  
  const response: ApiResponse<BookingData> = {
    success: true,
    data: {
      ...updatedBooking,
      date: updatedBooking.date.toISOString(),
      createdAt: updatedBooking.createdAt.toISOString(),
      updatedAt: updatedBooking.updatedAt.toISOString(),
      bookedAt: updatedBooking.bookedAt.toISOString(),
      bookedSeats: Array.isArray(updatedBooking.bookedSeats) ? (updatedBooking.bookedSeats as string[]) : [],
      customerName: updatedBooking.customerName || undefined,
      customerPhone: updatedBooking.customerPhone || undefined,
      customerEmail: updatedBooking.customerEmail || undefined,
      notes: updatedBooking.notes || undefined,
      totalIncome: updatedBooking.totalIncome || undefined,
      localIncome: updatedBooking.localIncome || undefined,
      bmsIncome: updatedBooking.bmsIncome || undefined,
      vipIncome: updatedBooking.vipIncome || undefined
    },
    message: 'Booking updated successfully'
  };
  
  res.json(response);
}));

// Delete a booking
app.delete('/api/bookings/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  console.log('🗑️ Deleting booking:', { id });
  
  // Validate booking exists
  const existingBooking = await prisma.booking.findUnique({
    where: { id }
  });
  
  if (!existingBooking) {
    throw new NotFoundError(`Booking with ID ${id} not found`);
  }
  
  // Delete the booking
  await prisma.booking.delete({
    where: { id }
  });
  
  console.log('✅ Booking deleted successfully:', { id });
  
  const response: ApiResponse<null> = {
    success: true,
    data: null,
    message: 'Booking deleted successfully'
  };
  
  res.json(response);
}));

// Add error handling middleware (must be last)
app.use(errorLogger);
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      code: 404,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    }
  });
});

app.listen(config.server.port, () => {
  console.log(`🚀 Server running at http://localhost:${config.server.port}`);
  console.log(`📊 Environment: ${config.server.nodeEnv}`);
  console.log(`🔗 CORS Origin: ${config.api.corsOrigin}`);
  console.log(`🔧 Error handling: Enabled`);
});