"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativePrintService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class NativePrintService {
    static async printSilently(ticketData, printerName) {
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
        }
        catch (error) {
            console.log('⚠️ Spooler API failed, trying alternative...');
            try {
                // Method 2: Use Windows Print Spooler via VBScript (completely silent)
                await this.printUsingVBScript(filePath, printerName);
            }
            catch (error2) {
                console.log('⚠️ VBScript failed, trying PowerShell hidden...');
                try {
                    // Method 3: Use PowerShell with extreme hiding
                    await this.printUsingPowerShellHidden(filePath, printerName);
                }
                catch (error3) {
                    console.log('⚠️ PowerShell hidden failed, trying direct command...');
                    // Method 4: Direct command with hidden window
                    await this.printUsingDirectCommand(filePath, printerName);
                }
            }
        }
        finally {
            // Clean up temp file
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            catch (cleanupError) {
                console.warn('⚠️ Could not clean up temp file:', cleanupError);
            }
        }
    }
    static async printUsingSpoolerAPI(filePath, printerName) {
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
    static async printUsingVBScript(filePath, printerName) {
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
        }
        finally {
            // Clean up VBS file
            try {
                if (fs.existsSync(vbsPath)) {
                    fs.unlinkSync(vbsPath);
                }
            }
            catch (cleanupError) {
                console.warn('⚠️ Could not clean up VBS file:', cleanupError);
            }
        }
    }
    static async printUsingPowerShellHidden(filePath, printerName) {
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
    static async printUsingDirectCommand(filePath, printerName) {
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
exports.NativePrintService = NativePrintService;
