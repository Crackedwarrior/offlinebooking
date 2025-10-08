"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ticketIdService_1 = __importDefault(require("./ticketIdService"));
const theaterConfig_1 = require("./config/theaterConfig");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ThermalPrintService {
    constructor() {
        // Use production path handling
        const basePath = process.env.NODE_ENV === 'production' ? process.cwd() : path_1.default.join(__dirname, '../');
        this.tempDir = path_1.default.join(basePath, 'temp');
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
    // Print ticket using optimized printer settings
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
            console.log(`💾 Ticket file created: ${ticketFile}`);
            console.log(`📄 Content length: ${ticketContent.length} characters`);
            // Method 1: Use PowerShell Start-Process for automatic printing (most reliable method)
            try {
                console.log(`🖨️ Printing automatically with PowerShell: ${printerName}`);
                const psCommand = `powershell -Command "Start-Process -FilePath '${ticketFile}' -Verb Print"`;
                await execAsync(psCommand, { windowsHide: true });
                console.log(`✅ Automatic print executed successfully for ${printerName}`);
                // Clean up ticket file after a delay
                setTimeout(() => {
                    if (fs_1.default.existsSync(ticketFile)) {
                        fs_1.default.unlinkSync(ticketFile);
                        console.log('🧹 Ticket file cleaned up');
                    }
                }, 30000); // 30 second delay
                return {
                    success: true,
                    printer: printerName,
                    message: 'Ticket printed automatically with optimized settings'
                };
            }
            catch (psError) {
                console.log(`❌ Automatic print failed: ${psError instanceof Error ? psError.message : 'Unknown error'}`);
            }
            // Method 2: Fallback to manual printing
            try {
                console.log(`🖨️ Fallback: Opening file for manual print: ${printerName}`);
                const openCommand = `start "" "${ticketFile}"`;
                await execAsync(openCommand, { windowsHide: true });
                console.log('✅ File opened! User can now press Ctrl+P to print');
                // Keep the file for manual printing
                return {
                    success: true,
                    printer: printerName,
                    message: 'File opened for manual printing (fallback method)'
                };
            }
            catch (openError) {
                console.log(`❌ File open failed: ${openError instanceof Error ? openError.message : 'Unknown error'}`);
            }
            // Clean up ticket file if all methods failed
            if (fs_1.default.existsSync(ticketFile)) {
                fs_1.default.unlinkSync(ticketFile);
            }
            return {
                success: false,
                error: 'All printing methods failed',
                printer: printerName || undefined
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
    // Helper function to calculate end time (3 hours after start time)
    getEndTime(startTime) {
        const timeMap = {
            '02:45PM': '05:45PM',
            '06:00PM': '09:00PM',
            '09:30PM': '12:30AM'
        };
        return timeMap[startTime] || '09:00PM';
    }
    // Helper function to get show class from time
    getShowClass(showTime) {
        // Use the showTime directly from frontend - no hardcoded mapping needed
        if (!showTime) {
            return 'UNKNOWN SHOW\nSHOWTIME : UNKNOWN';
        }
        // Extract time from showTime and format it
        const timeMatch = showTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
            const [, hour, minute, period] = timeMatch;
            return `SHOW\nSHOWTIME : ${hour}:${minute}${period.toUpperCase()}`;
        }
        return `SHOW\nSHOWTIME : ${showTime}`;
    }
    // Create formatted ticket content - Exact format matching user specification
    createTicketContent(ticketData) {
        // Use tax values from frontend if available, otherwise use defaults
        const net = ticketData.net || (0, theaterConfig_1.getTheaterConfig)().defaultTaxValues.net;
        const cgst = ticketData.cgst || (0, theaterConfig_1.getTheaterConfig)().defaultTaxValues.cgst;
        const sgst = ticketData.sgst || (0, theaterConfig_1.getTheaterConfig)().defaultTaxValues.sgst;
        const mc = ticketData.mc || (0, theaterConfig_1.getTheaterConfig)().defaultTaxValues.mc;
        // Format date and time - use the ticket date, not current date
        const ticketDate = ticketData.date || new Date().toLocaleDateString('en-GB');
        const currentTime = new Date().toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
        });
        // Generate ticket ID using the service
        const ticketId = ticketIdService_1.default.getNextTicketId();
        // Helper function to pad text within box width (19 characters)
        const padInBox = (text, maxLength = 19) => {
            if (text.length > maxLength) {
                return text.substring(0, maxLength);
            }
            return text.padEnd(maxLength);
        };
        // Get seat and class information from the formatted data
        const seatRow = ticketData.row || 'A';
        const seatNumber = ticketData.seatRange || '1';
        const seatClass = ticketData.classLabel;
        console.log(`🎪 Using seat data: row=${seatRow}, number=${seatNumber}, class=${seatClass}`);
        // Format movie name to fit in box if needed
        const movieName = ticketData.movieName || 'Movie';
        const formattedMovieName = movieName.length > 19 ? movieName.substring(0, 19) : movieName;
        // Check if this is a grouped ticket (has seat count)
        const seatCount = ticketData.seatCount || 1;
        const individualPrice = ticketData.individualPrice || (parseFloat(String(ticketData.totalAmount || '0')) || 0) / seatCount;
        // Format ticket cost to fit in box (use individual price, not total)
        const ticketCost = `₹${individualPrice.toFixed(2)}`;
        // Final format matching the exact user specification with dynamic content
        const lines = [
            '╔═════════════════════╗',
            `║  ${(0, theaterConfig_1.getTheaterConfig)().name}  ║`,
            `║     ${(0, theaterConfig_1.getTheaterConfig)().location}     ║`,
            `║GSTIN:${(0, theaterConfig_1.getTheaterConfig)().gstin}║`,
            '╚═════════════════════╝',
            `DATE:${ticketDate}`,
            ...this.getShowClass(ticketData.showTime || '02:45PM').split('\n'),
            `FILM:${formattedMovieName}`,
            '┌─────────────────────┐',
            `│${`CLASS:${seatClass}`.padEnd(21)}│`,
            `│${`SEAT:${seatRow.replace('SC-', '').replace('CB-', '').replace('FC-', '').replace('BOX-', '')} ${seatNumber.replace(' - ', '-')} (${seatCount})`.padEnd(21)}│`,
            '└─────────────────────┘',
            ` [NET :${net}]`,
            ` [CGST:${cgst}]┌────────┐`,
            ` [SGST:${sgst}]│₹${individualPrice.toFixed(2).padEnd(7)}│`,
            ` [MC  :${mc}] └────────┘`,
            ` [TICKET COST: ${ticketCost}]`,
            '',
            ` ${ticketId}     ${currentTime.replace(' ', '')}`
        ];
        return lines.join('\n');
    }
    // Format ticket data for printing - Map frontend data to correct format
    formatTicket(ticketData) {
        console.log('🔧 Raw ticket data received:', JSON.stringify(ticketData, null, 2));
        console.log('🔧 Data type:', typeof ticketData);
        console.log('🔧 Keys:', Object.keys(ticketData || {}));
        // Handle different data structures from frontend
        let movieName = 'Movie';
        let showTime = 'Show Time';
        let date = new Date().toLocaleDateString();
        let totalAmount = 0;
        let seats = [];
        // Extract data from frontend format
        if (ticketData.movie) {
            movieName = ticketData.movie;
            console.log(`🎬 Found movie: ${movieName}`);
        }
        else if (ticketData.movieName) {
            movieName = ticketData.movieName;
            console.log(`🎬 Found movieName: ${movieName}`);
        }
        if (ticketData.showTime) {
            // Use the actual show time from frontend first
            showTime = ticketData.showTime;
            console.log(`🕐 Using showTime directly: ${showTime}`);
        }
        else if (ticketData.show) {
            // Use show enum as fallback
            showTime = ticketData.show;
            console.log(`🕐 Using show enum as fallback: ${showTime}`);
        }
        if (ticketData.date) {
            date = ticketData.date;
        }
        if (ticketData.price) {
            totalAmount = ticketData.price;
            console.log(`💰 Found price: ${totalAmount}`);
        }
        else if (ticketData.total) {
            totalAmount = ticketData.total;
            console.log(`💰 Found total: ${totalAmount}`);
        }
        else if (ticketData.totalAmount) {
            totalAmount = ticketData.totalAmount;
            console.log(`💰 Found totalAmount: ${totalAmount}`);
        }
        // Handle seats data - Frontend sends individual or grouped ticket data
        if (ticketData.seatRange) {
            // Frontend sends grouped ticket data
            console.log(`🎫 Processing grouped ticket: ${ticketData.classLabel} ${ticketData.seatRange} (${ticketData.seatCount} seats)`);
            // For grouped tickets, we'll create a single seat entry with the range
            seats = [{
                    row: ticketData.row || 'A',
                    number: ticketData.seatRange, // Use the range as number
                    classLabel: ticketData.classLabel
                }];
            // Use total price for grouped tickets
            if (ticketData.totalPrice) {
                totalAmount = ticketData.totalPrice;
                console.log(`💰 Found total price for group: ${totalAmount}`);
            }
        }
        else if (ticketData.seatId) {
            // Frontend sends individual ticket data with seatId
            const seatId = ticketData.seatId;
            const parts = seatId.split('-');
            seats = [{
                    row: parts[0] || 'A',
                    number: parts[1] || '1',
                    classLabel: ticketData.class
                }];
            console.log(`🎫 Extracted seat: ${seatId} -> row: ${parts[0]}, number: ${parts[1]}, class: ${ticketData.class}`);
        }
        else if (ticketData.tickets && Array.isArray(ticketData.tickets)) {
            seats = ticketData.tickets.map((ticket) => ({
                row: ticket.row || 'A',
                number: ticket.number || '1',
                classLabel: ticket.classLabel
            }));
        }
        else if (ticketData.seats && Array.isArray(ticketData.seats)) {
            seats = ticketData.seats;
        }
        else if (ticketData.seatIds && Array.isArray(ticketData.seatIds)) {
            // Convert seat IDs to seat objects
            seats = ticketData.seatIds.map((seatId) => {
                const parts = seatId.split('-');
                return {
                    row: parts[0] || 'A',
                    number: parts[1] || '1',
                    classLabel: 'UNKNOWN' // Default class
                };
            });
        }
        const formattedData = {
            theaterName: ticketData.theaterName || (0, theaterConfig_1.getTheaterConfig)().name,
            location: ticketData.location || (0, theaterConfig_1.getTheaterConfig)().location,
            gstin: ticketData.gstin || (0, theaterConfig_1.getTheaterConfig)().gstin,
            movieName: movieName,
            date: date,
            showTime: showTime,
            screen: ticketData.screen || 'Screen 1',
            seats: seats,
            totalAmount: totalAmount
        };
        console.log('✅ Formatted ticket data:', JSON.stringify(formattedData, null, 2));
        return formattedData;
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
