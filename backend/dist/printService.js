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
exports.windowsPrintService = void 0;
const node_windows_1 = require("node-windows");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class WindowsPrintService {
    constructor() {
        this.printQueue = [];
        this.isProcessing = false;
        this.service = null;
        this.isServiceRunning = false;
        this.serviceInstallAttempted = false; // Prevent multiple install attempts
        console.log('🖨️ Windows Print Service initialized');
        // Don't auto-initialize service to prevent infinite loops
        // this.initializeService();
    }
    initializeService() {
        // Prevent multiple initialization attempts
        if (this.serviceInstallAttempted) {
            console.log('ℹ️ Service initialization already attempted, skipping...');
            return;
        }
        this.serviceInstallAttempted = true;
        try {
            // Create a Windows service for background printing
            this.service = new node_windows_1.Service({
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
                var _a;
                console.log('✅ Print service installed successfully');
                (_a = this.service) === null || _a === void 0 ? void 0 : _a.start();
            });
            this.service.on('alreadyinstalled', () => {
                var _a;
                console.log('ℹ️ Print service already installed');
                (_a = this.service) === null || _a === void 0 ? void 0 : _a.start();
            });
            this.service.on('start', () => {
                console.log('🚀 Print service started');
                this.isServiceRunning = true;
            });
            this.service.on('stop', () => {
                console.log('⏹️ Print service stopped');
                this.isServiceRunning = false;
            });
            this.service.on('error', (err) => {
                console.error('❌ Print service error:', err);
                this.isServiceRunning = false;
            });
            // Install the service if not already installed
            this.service.install();
        }
        catch (error) {
            console.error('❌ Failed to initialize print service:', error);
            this.isServiceRunning = false;
        }
    }
    async addToPrintQueue(ticketData, printerName) {
        console.log('🖨️ Adding to print queue:', { ticketDataLength: ticketData === null || ticketData === void 0 ? void 0 : ticketData.length, printerName });
        if (!ticketData) {
            throw new Error('Ticket data is required');
        }
        const jobId = `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const printJob = {
            id: jobId,
            ticketData,
            printerName,
            timestamp: new Date(),
            status: 'pending'
        };
        this.printQueue.push(printJob);
        console.log('🖨️ Print job created:', jobId);
        // Always use direct method to avoid service issues
        console.log('🖨️ Using direct method (service disabled)');
        await this.processDirectly(printJob);
        return jobId;
    }
    async processViaService(printJob) {
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
        }
        catch (error) {
            console.error('❌ Service processing failed:', error);
            await this.processDirectly(printJob);
        }
    }
    async processDirectly(printJob) {
        try {
            printJob.status = 'processing';
            // Use the most aggressive silent printing method
            await this.printUsingWindowsAPI(printJob.ticketData, printJob.printerName);
            printJob.status = 'completed';
            console.log(`✅ Print job ${printJob.id} completed directly`);
        }
        catch (error) {
            printJob.status = 'failed';
            printJob.error = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Print job ${printJob.id} failed:`, error);
            throw error;
        }
    }
    async printUsingWindowsAPI(ticketData, printerName) {
        // Create temp file
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const filePath = path.join(tempDir, `ticket_${Date.now()}.txt`);
        // Check if this is ESC/POS commands or plain text
        if (ticketData.includes('\x1B')) {
            // This is ESC/POS commands - write as binary
            console.log('🖨️ Writing ESC/POS commands as binary data');
            fs.writeFileSync(filePath, ticketData, 'binary');
        }
        else {
            // This is plain text - write as UTF-8
            console.log('🖨️ Writing plain text as UTF-8');
            fs.writeFileSync(filePath, ticketData, 'utf8');
        }
        try {
            // Method 1: Direct copy to printer port (most reliable for ESC/POS)
            const copyCommand = `cmd /c copy "${filePath}" "\\\\.\\ESDPRT001" >nul 2>&1`;
            console.log('🖨️ Using direct copy to printer port...');
            const { stdout, stderr } = await execAsync(copyCommand, {
                maxBuffer: 10 * 1024 * 1024,
                timeout: 30000,
                windowsHide: true
            });
            console.log('✅ Direct copy to printer port completed');
        }
        catch (error) {
            console.log('⚠️ Direct copy failed, trying PowerShell...');
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
                console.log('✅ PowerShell Out-Printer completed');
            }
            catch (psError) {
                console.log('⚠️ PowerShell failed, creating manual print file...');
                // Method 3: Create manual print file
                const manualPrintFile = path.join(tempDir, `manual_print_${Date.now()}.txt`);
                fs.writeFileSync(manualPrintFile, ticketData, 'utf8');
                console.log(`⚠️ Manual print file created: ${manualPrintFile}`);
                console.log('⚠️ Please print this file manually or check printer connection');
                // Don't throw error for manual fallback
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
        console.log('🖨️ Manually starting print service...');
        this.initializeService();
    }
    // Method to stop the service
    async stopService() {
        if (this.service) {
            console.log('🛑 Stopping print service...');
            this.service.stop();
            this.isServiceRunning = false;
        }
    }
}
// Export singleton instance
exports.windowsPrintService = new WindowsPrintService();
