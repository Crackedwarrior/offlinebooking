"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ThermalPrintService {
    constructor() {
        this.tempDir = path_1.default.join(__dirname, '../temp');
        // Ensure temp directory exists
        if (!fs_1.default.existsSync(this.tempDir)) {
            fs_1.default.mkdirSync(this.tempDir, { recursive: true });
        }
    }
    // Get all available printers using PowerShell
    async getAllPrinters() {
        try {
            if (process.platform === 'win32') {
                const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, Port, PrinterStatus | ConvertTo-Json"', { windowsHide: true });
                try {
                    const printers = JSON.parse(stdout);
                    const printerList = Array.isArray(printers) ? printers : [printers];
                    console.log('🔍 Found printers:', printerList.map(p => p.Name));
                    return printerList.map(p => ({
                        name: p.Name,
                        port: p.Port || 'Unknown',
                        status: p.PrinterStatus || 'Unknown'
                    }));
                }
                catch (parseError) {
                    console.error('❌ Failed to parse printer list:', parseError);
                    return [];
                }
            }
            else {
                // For non-Windows systems, return empty array for now
                return [];
            }
        }
        catch (error) {
            console.error('❌ Error getting printers:', error);
            return [];
        }
    }
    // Get thermal printers specifically
    async getThermalPrinters() {
        const allPrinters = await this.getAllPrinters();
        const thermalKeywords = ['thermal', 'pos', 'receipt', 'epson', 'star', 'citizen'];
        return allPrinters.filter(printer => thermalKeywords.some(keyword => printer.name.toLowerCase().includes(keyword)));
    }
    // Test printer connection using Windows print command
    async testPrinter(printerName) {
        try {
            console.log(`🧪 Testing printer: ${printerName}`);
            // Create a simple test file
            const testContent = `
PRINTER TEST
============
If you can see this, your printer is working!
Test Time: ${new Date().toLocaleString()}
============
      `;
            const testFile = path_1.default.join(this.tempDir, `test_${Date.now()}.txt`);
            fs_1.default.writeFileSync(testFile, testContent);
            // Print using Windows print command
            const printCommand = `powershell -Command "Get-Content '${testFile}' | Out-Printer -Name '${printerName}'"`;
            await execAsync(printCommand, { windowsHide: true });
            // Clean up test file
            fs_1.default.unlinkSync(testFile);
            console.log(`✅ Printer test successful for: ${printerName}`);
            return { success: true, message: 'Printer test successful' };
        }
        catch (error) {
            console.error(`❌ Printer test failed for ${printerName}:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    // Print ticket using Windows print command
    async printTicket(ticketData, printerName = null) {
        try {
            // Auto-detect printer if not specified
            if (!printerName) {
                const thermalPrinters = await this.getThermalPrinters();
                if (thermalPrinters.length > 0) {
                    printerName = thermalPrinters[0].name;
                    console.log(`🖨️ Auto-selected printer: ${printerName}`);
                }
                else {
                    throw new Error('No thermal printers found');
                }
            }
            // Format ticket data
            const formattedTicket = this.formatTicket(ticketData);
            // Create ticket content
            const ticketContent = this.createTicketContent(formattedTicket);
            // Save to temporary file
            const ticketFile = path_1.default.join(this.tempDir, `ticket_${Date.now()}.txt`);
            fs_1.default.writeFileSync(ticketFile, ticketContent);
            // Print using Windows print command
            const printCommand = `powershell -Command "Get-Content '${ticketFile}' | Out-Printer -Name '${printerName}'"`;
            await execAsync(printCommand, { windowsHide: true });
            // Clean up ticket file
            fs_1.default.unlinkSync(ticketFile);
            console.log(`✅ Ticket printed successfully on ${printerName}`);
            return {
                success: true,
                printer: printerName,
                message: 'Ticket printed successfully'
            };
        }
        catch (error) {
            console.error('❌ Print error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                printer: printerName || undefined
            };
        }
    }
    // Create formatted ticket content
    createTicketContent(ticketData) {
        const PAPER_WIDTH = 48; // Standard thermal printer width (80mm paper)
        // Helper function to center text
        const centerText = (text) => {
            const padding = Math.max(0, Math.floor((PAPER_WIDTH - text.length) / 2));
            return ' '.repeat(padding) + text;
        };
        // Helper function to create full-width line
        const fullWidthLine = (char = '=') => char.repeat(PAPER_WIDTH);
        // Helper function to format left-aligned text with proper spacing
        const leftAlign = (text, indent = 0) => {
            const spaces = ' '.repeat(indent);
            return spaces + text;
        };
        // Helper function to format right-aligned text
        const rightAlign = (text) => {
            const padding = Math.max(0, PAPER_WIDTH - text.length);
            return ' '.repeat(padding) + text;
        };
        const lines = [
            '',
            centerText('SREELEKHA THEATER'),
            centerText('Chickmagalur'),
            centerText('GSTIN: 29AAVFS7423E120'),
            '',
            fullWidthLine('='),
            leftAlign(`Movie: ${ticketData.movieName}`),
            leftAlign(`Date: ${ticketData.date}`),
            leftAlign(`Time: ${ticketData.showTime}`),
            leftAlign(`Screen: ${ticketData.screen}`),
            '',
            leftAlign('Seats:'),
            ...(ticketData.seats || []).map(seat => leftAlign(`${seat.row}-${seat.number} (₹${seat.price})`, 2)),
            '',
            fullWidthLine('='),
            rightAlign(`Total: ₹${ticketData.totalAmount}`),
            '',
            centerText('Thank you for visiting!'),
            centerText('Enjoy your movie!'),
            '',
            fullWidthLine('='),
            ''
        ];
        return lines.join('\n');
    }
    // Format ticket data for printing
    formatTicket(ticketData) {
        return {
            theaterName: ticketData.theaterName || 'SREELEKHA THEATER',
            location: ticketData.location || 'Chickmagalur',
            gstin: ticketData.gstin || '29AAVFS7423E120',
            movieName: ticketData.movieName || 'Movie',
            date: ticketData.date || new Date().toLocaleDateString(),
            showTime: ticketData.showTime || 'Show Time',
            screen: ticketData.screen || 'Screen 1',
            seats: ticketData.seats || [],
            totalAmount: ticketData.totalAmount || 0
        };
    }
    // Get printer status
    async getPrinterStatus(printerName) {
        try {
            if (process.platform === 'win32') {
                const { stdout } = await execAsync(`powershell -Command "Get-Printer -Name '${printerName}' | Select-Object Name, Port, PrinterStatus | ConvertTo-Json"`, { windowsHide: true });
                try {
                    const printer = JSON.parse(stdout);
                    return {
                        status: printer.PrinterStatus || 'UNKNOWN',
                        port: printer.Port,
                        isDefault: false // We'll assume false for now
                    };
                }
                catch (parseError) {
                    return { status: 'NOT_FOUND', message: 'Printer not found' };
                }
            }
            else {
                return { status: 'UNSUPPORTED', message: 'Platform not supported' };
            }
        }
        catch (error) {
            console.error('❌ Error getting printer status:', error);
            return { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}
exports.default = ThermalPrintService;
