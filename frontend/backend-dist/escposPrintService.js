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
exports.EscposPrintService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const theaterConfig_1 = require("./config/theaterConfig");
// Use require to avoid TypeScript issues
const escpos = require('escpos');
escpos.USB = require('escpos-usb');
class EscposPrintService {
    static async printSilently(ticketData, printerName) {
        try {
            console.log('🖨️ Using ESCPOS library for thermal printing...');
            // Format the ticket data into proper text
            const formattedTicket = this.createFormattedTicket(ticketData);
            // Method 1: Try USB connection first
            try {
                await this.printViaUSB(formattedTicket);
                return;
            }
            catch (error) {
                console.log('⚠️ USB method failed, trying PowerShell with formatted text...');
            }
            // Method 2: Fallback to PowerShell with formatted text
            await this.printViaPowerShellWithEscpos(formattedTicket, printerName);
        }
        catch (error) {
            console.error('❌ ESCPOS printing failed:', error);
            throw error;
        }
    }
    static async printViaUSB(ticketData) {
        console.log('🔍 Searching for USB printer...');
        return new Promise((resolve, reject) => {
            // Auto-detect USB printer without hardcoded IDs
            const device = new escpos.USB();
            device.open((error) => {
                if (error) {
                    console.log('❌ USB printer not found:', error.message);
                    reject(new Error(`USB printer not found: ${error.message}`));
                    return;
                }
                console.log('✅ USB printer found and connected');
                const printer = new escpos.Printer(device);
                // Format the ticket properly for thermal printer
                printer
                    .font('a')
                    .align('ct')
                    .style('b')
                    .size(1, 1)
                    .text((0, theaterConfig_1.getTheaterConfig)().name)
                    .text((0, theaterConfig_1.getTheaterConfig)().location)
                    .drawLine()
                    .align('lt')
                    .style('normal')
                    .size(0, 0)
                    .text(ticketData)
                    .drawLine()
                    .align('ct')
                    .style('b')
                    .text('THANK YOU')
                    .text((0, theaterConfig_1.getTheaterConfig)().name)
                    .cut()
                    .close()
                    .then(() => {
                    console.log('✅ USB printing completed successfully');
                    resolve();
                })
                    .catch((err) => {
                    console.error('❌ USB printing failed:', err);
                    reject(new Error(`USB printing failed: ${err.message}`));
                });
            });
        });
    }
    static async printViaNetwork(ticketData) {
        // Try network printer (if connected via network)
        const device = new escpos.Network('192.168.1.100'); // Default IP, adjust as needed
        console.log('🔍 Trying network printer...');
        return new Promise((resolve, reject) => {
            device.open((error) => {
                if (error) {
                    reject(new Error(`Network printer not found: ${error.message}`));
                    return;
                }
                console.log('✅ Network printer found and connected');
                const printer = new escpos.Printer(device);
                // Convert ESC/POS commands to printer operations
                this.convertEscposToPrinterCommands(printer, ticketData);
                printer
                    .close()
                    .then(() => {
                    console.log('✅ Network printing completed successfully');
                    resolve();
                })
                    .catch((err) => {
                    reject(new Error(`Network printing failed: ${err.message}`));
                });
            });
        });
    }
    static async printViaPowerShellWithEscpos(ticketData, printerName) {
        console.log('🖨️ Using direct file copy to printer port...');
        // Create simple formatted text (not ESC/POS binary)
        const formattedTicket = this.createSimpleFormattedTicket(ticketData);
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const filePath = path.join(tempDir, `ticket_simple_${Date.now()}.txt`);
        // Write simple text
        fs.writeFileSync(filePath, formattedTicket, 'utf8');
        console.log('📁 Created simple ticket file:', filePath);
        console.log('📄 Ticket length:', formattedTicket.length, 'characters');
        // Use direct copy command to printer (this should work for most thermal printers)
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        // Try direct copy to printer port first
        const command = `cmd /c copy "${filePath.replace(/\//g, '\\')}" "\\\\localhost\\${printerName.replace(/\s+/g, '')}"`;
        try {
            const { stdout, stderr } = await execAsync(command, {
                maxBuffer: 10 * 1024 * 1024,
                timeout: 30000,
                windowsHide: true
            });
            console.log('✅ Direct copy printing completed');
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
        catch (error) {
            console.warn('⚠️ Direct copy failed, trying PowerShell fallback...');
            // Fallback to PowerShell Out-Printer
            const fallbackCommand = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '${filePath.replace(/\\/g, '\\\\')}' -Encoding UTF8 | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`;
            try {
                await execAsync(fallbackCommand, {
                    maxBuffer: 10 * 1024 * 1024,
                    timeout: 30000,
                    windowsHide: true
                });
                console.log('✅ PowerShell fallback printing completed');
            }
            catch (fallbackError) {
                throw new Error(`Both direct copy and PowerShell printing failed: ${error}, ${fallbackError}`);
            }
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
    static createSimpleFormattedTicket(ticketData) {
        // Create simple, wide text format for thermal printers
        const maxWidth = 58; // Wider format to fill thermal printer width
        // Center text helper
        const centerText = (text) => {
            const padding = Math.max(0, Math.floor((maxWidth - text.length) / 2));
            return ' '.repeat(padding) + text + ' '.repeat(maxWidth - text.length - padding);
        };
        // Right align text helper
        const rightText = (label, value) => {
            const text = `${label}: Rs.${value}`;
            const padding = Math.max(0, maxWidth - text.length);
            return ' '.repeat(padding) + text;
        };
        // Left align with padding
        const leftText = (text) => {
            return text + ' '.repeat(Math.max(0, maxWidth - text.length));
        };
        let ticket = '';
        // Header - double lines
        ticket += '='.repeat(maxWidth) + '\n';
        ticket += centerText((0, theaterConfig_1.getTheaterConfig)().name) + '\n';
        ticket += centerText((0, theaterConfig_1.getTheaterConfig)().location) + '\n';
        ticket += '='.repeat(maxWidth) + '\n';
        // Ticket details
        ticket += leftText(`Date: ${ticketData.date || new Date().toLocaleDateString()}`) + '\n';
        ticket += leftText(`Time: ${ticketData.showTime || '2:00 PM'}`) + '\n';
        ticket += leftText(`Film: ${ticketData.movieName || 'MOVIE'}`) + '\n';
        ticket += leftText(`Class: ${ticketData.class || 'CLASS'}`) + '\n';
        ticket += leftText(`Seat: ${ticketData.seatId || 'A1'}`) + '\n';
        ticket += '-'.repeat(maxWidth) + '\n';
        // Pricing - right aligned
        ticket += rightText('Net', (ticketData.netAmount || 0).toString()) + '\n';
        ticket += rightText('CGST', (ticketData.cgst || 0).toString()) + '\n';
        ticket += rightText('SGST', (ticketData.sgst || 0).toString()) + '\n';
        ticket += rightText('MC', (ticketData.mc || 0).toString()) + '\n';
        ticket += '-'.repeat(maxWidth) + '\n';
        // Total
        ticket += centerText(`TOTAL: Rs.${ticketData.price || 0}`) + '\n';
        ticket += centerText(`ID: ${ticketData.transactionId || 'TXN' + Date.now()}`) + '\n';
        ticket += '-'.repeat(maxWidth) + '\n';
        // Footer
        ticket += centerText('THANK YOU FOR VISITING') + '\n';
        ticket += centerText((0, theaterConfig_1.getTheaterConfig)().name) + '\n';
        ticket += '='.repeat(maxWidth) + '\n';
        return ticket;
    }
    static createEscposCommands(ticketData) {
        // Create proper ESC/POS commands for thermal printer
        const commands = [];
        // Initialize printer
        commands.push(0x1B, 0x40); // ESC @
        // Set character code table
        commands.push(0x1B, 0x74, 0x00); // ESC t 0
        // Set character set
        commands.push(0x1B, 0x52, 0x00); // ESC R 0
        // Set line spacing
        commands.push(0x1B, 0x32); // ESC 2
        // Header - Center alignment, bold, double size
        commands.push(0x1B, 0x61, 0x01); // ESC a 1 (center)
        commands.push(0x1B, 0x45, 0x01); // ESC E 1 (bold)
        commands.push(0x1B, 0x21, 0x10); // ESC ! 16 (double height & width)
        // Add theater name
        const theaterName = ticketData.theaterName || (0, theaterConfig_1.getTheaterConfig)().name;
        commands.push(...Buffer.from(theaterName + '\n', 'ascii'));
        // Add location
        const location = ticketData.location || (0, theaterConfig_1.getTheaterConfig)().location;
        commands.push(...Buffer.from(location + '\n', 'ascii'));
        // Draw line
        commands.push(0x1B, 0x61, 0x00); // ESC a 0 (left align)
        commands.push(0x1B, 0x45, 0x00); // ESC E 0 (normal)
        commands.push(0x1B, 0x21, 0x00); // ESC ! 0 (normal size)
        // Draw separator line
        const separator = '='.repeat(42);
        commands.push(...Buffer.from(separator + '\n', 'ascii'));
        // Ticket details - left aligned, normal size
        const date = `Date: ${ticketData.date || new Date().toLocaleDateString()}\n`;
        commands.push(...Buffer.from(date, 'ascii'));
        const time = `Time: ${ticketData.showTime || '2:00 PM'}\n`;
        commands.push(...Buffer.from(time, 'ascii'));
        const film = `Film: ${ticketData.movieName || 'MOVIE'}\n`;
        commands.push(...Buffer.from(film, 'ascii'));
        const class_ = `Class: ${ticketData.class || 'CLASS'}\n`;
        commands.push(...Buffer.from(class_, 'ascii'));
        const seat = `Seat: ${ticketData.seatId || 'A1'}\n`;
        commands.push(...Buffer.from(seat, 'ascii'));
        // Draw separator line
        commands.push(...Buffer.from(separator + '\n', 'ascii'));
        // Pricing details - right aligned
        commands.push(0x1B, 0x61, 0x02); // ESC a 2 (right align)
        const net = `Net: Rs.${ticketData.netAmount || 0}\n`;
        commands.push(...Buffer.from(net, 'ascii'));
        const cgst = `CGST: Rs.${ticketData.cgst || 0}\n`;
        commands.push(...Buffer.from(cgst, 'ascii'));
        const sgst = `SGST: Rs.${ticketData.sgst || 0}\n`;
        commands.push(...Buffer.from(sgst, 'ascii'));
        const mc = `MC: Rs.${ticketData.mc || 0}\n`;
        commands.push(...Buffer.from(mc, 'ascii'));
        // Draw separator line
        commands.push(0x1B, 0x61, 0x00); // ESC a 0 (left align)
        commands.push(...Buffer.from(separator + '\n', 'ascii'));
        // Total - center aligned, bold
        commands.push(0x1B, 0x61, 0x01); // ESC a 1 (center)
        commands.push(0x1B, 0x45, 0x01); // ESC E 1 (bold)
        const total = `TOTAL: Rs.${ticketData.price || 0}\n`;
        commands.push(...Buffer.from(total, 'ascii'));
        const id = `ID: ${ticketData.transactionId || 'TXN' + Date.now()}\n`;
        commands.push(...Buffer.from(id, 'ascii'));
        // Draw separator line
        commands.push(0x1B, 0x45, 0x00); // ESC E 0 (normal)
        commands.push(...Buffer.from(separator + '\n', 'ascii'));
        // Footer - center aligned
        const footer = 'THANK YOU FOR VISITING\n';
        commands.push(...Buffer.from(footer, 'ascii'));
        const footer2 = `${ticketData.theaterName || (0, theaterConfig_1.getTheaterConfig)().name}\n`;
        commands.push(...Buffer.from(footer2, 'ascii'));
        // Cut paper
        commands.push(0x1D, 0x56, 0x00); // GS V 0 (full cut)
        return Buffer.from(commands);
    }
    static createFormattedTicket(ticketData) {
        // Create properly formatted ticket text for thermal printer
        // EPSON TM-T81 supports 42 chars at 12 CPI (characters per inch) for 58mm paper
        const maxWidth = 42; // Optimized for EPSON TM-T81 thermal printer
        // Center text helper function
        const centerText = (text) => {
            const padding = Math.max(0, Math.floor((maxWidth - text.length) / 2));
            return ' '.repeat(padding) + text;
        };
        // Right align text helper function
        const rightText = (label, value) => {
            const text = `${label}: Rs.${value}`;
            const padding = Math.max(0, maxWidth - text.length);
            return ' '.repeat(padding) + text;
        };
        // Create separator line
        const separator = '='.repeat(maxWidth);
        const doubleLine = '█'.repeat(maxWidth);
        // Build formatted ticket
        let formatted = '';
        // Header with full width - centered and emphasized
        formatted += doubleLine + '\n';
        formatted += centerText(ticketData.theaterName || (0, theaterConfig_1.getTheaterConfig)().name) + '\n';
        formatted += centerText(ticketData.location || (0, theaterConfig_1.getTheaterConfig)().location) + '\n';
        formatted += doubleLine + '\n';
        // Movie and show details with full width formatting
        formatted += `Date: ${(ticketData.date || new Date().toLocaleDateString()).padEnd(maxWidth - 6)}\n`;
        formatted += `Time: ${(ticketData.showTime || '2:00 PM').padEnd(maxWidth - 6)}\n`;
        formatted += `Film: ${(ticketData.movieName || 'MOVIE').padEnd(maxWidth - 6)}\n`;
        formatted += `Class: ${(ticketData.class || 'CLASS').padEnd(maxWidth - 7)}\n`;
        formatted += `Seat: ${(ticketData.seatId || 'A1').padEnd(maxWidth - 6)}\n`;
        formatted += separator + '\n';
        // Pricing details with right alignment for professional look
        formatted += rightText('Net', (ticketData.netAmount || 0).toString()) + '\n';
        formatted += rightText('CGST', (ticketData.cgst || 0).toString()) + '\n';
        formatted += rightText('SGST', (ticketData.sgst || 0).toString()) + '\n';
        formatted += rightText('MC', (ticketData.mc || 0).toString()) + '\n';
        formatted += separator + '\n';
        // Total with emphasis and full width
        const totalText = `TOTAL: Rs.${ticketData.price || 0}`;
        formatted += centerText(totalText) + '\n';
        formatted += centerText(`ID: ${ticketData.transactionId || 'TXN' + Date.now()}`) + '\n';
        formatted += separator + '\n';
        // Footer with full width
        formatted += centerText('THANK YOU FOR VISITING') + '\n';
        formatted += centerText(ticketData.theaterName || (0, theaterConfig_1.getTheaterConfig)().name) + '\n';
        formatted += doubleLine + '\n';
        // Debug: Log the formatted ticket to see what's actually being generated
        console.log('🔍 DEBUG - Formatted ticket preview:');
        console.log('='.repeat(50));
        console.log(formatted);
        console.log('='.repeat(50));
        console.log('🔍 DEBUG - Ticket data received:', ticketData);
        return formatted;
    }
    static async printViaDirectFile(ticketData, printerName) {
        // Fallback: Write to file and use minimal PowerShell command
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const filePath = path.join(tempDir, `ticket_${Date.now()}.txt`);
        // Write clean text as UTF-8 for reliable printing
        fs.writeFileSync(filePath, ticketData, 'utf8');
        console.log('📁 Created temp file for direct printing:', filePath);
        console.log('📄 Clean text data length:', ticketData.length, 'characters');
        // Use the most minimal PowerShell command possible
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        const command = `powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '${filePath.replace(/\\/g, '\\\\')}' -Encoding UTF8 | Out-Printer -Name '${printerName.replace(/'/g, "''")}'"`;
        try {
            const { stdout, stderr } = await execAsync(command, {
                maxBuffer: 10 * 1024 * 1024,
                timeout: 30000,
                windowsHide: true
            });
            console.log('✅ Direct file printing completed');
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
        catch (error) {
            throw new Error(`Direct file printing failed: ${error}`);
        }
    }
    static convertEscposToPlainText(escposData) {
        // Convert ESC/POS commands to plain text format
        let plainText = '';
        let isCentered = false;
        let isBold = false;
        let isDoubleSize = false;
        // Split by lines and process each line
        const lines = escposData.split('\n');
        for (const line of lines) {
            let processedLine = line;
            // Remove ESC/POS commands and replace with plain text formatting
            processedLine = processedLine
                .replace(/\x1B\x40/g, '') // Initialize printer
                .replace(/\x1B\x74\x00/g, '') // Set code page
                .replace(/\x1B\x52\x00/g, '') // Select character set
                .replace(/\x1B\x61\x01/g, '') // Center alignment
                .replace(/\x1B\x61\x00/g, '') // Left alignment
                .replace(/\x1B\x21\x10/g, '') // Double height and width
                .replace(/\x1B\x21\x00/g, '') // Normal size
                .replace(/\x1B\x2D\x01/g, '') // Underline on
                .replace(/\x1B\x2D\x00/g, '') // Underline off
                .replace(/\x1B\x45\x01/g, '') // Bold on
                .replace(/\x1B\x45\x00/g, '') // Bold off
                .replace(/\x1D\x21\x01/g, '') // Double height
                .replace(/\x1D\x21\x00/g, '') // Normal size
                .replace(/\x1D\x56\x00/g, '') // Cut paper
                .replace(/\x1B\x69/g, ''); // Cut paper
            // Handle centering for plain text
            if (line.includes('\x1B\x61\x01')) {
                isCentered = true;
            }
            else if (line.includes('\x1B\x61\x00')) {
                isCentered = false;
            }
            // Handle bold formatting
            if (line.includes('\x1B\x45\x01')) {
                isBold = true;
            }
            else if (line.includes('\x1B\x45\x00')) {
                isBold = false;
            }
            // Handle double size
            if (line.includes('\x1B\x21\x10') || line.includes('\x1D\x21\x01')) {
                isDoubleSize = true;
            }
            else if (line.includes('\x1B\x21\x00') || line.includes('\x1D\x21\x00')) {
                isDoubleSize = false;
            }
            // If line contains actual text (not just commands), add it
            if (processedLine.trim() && !processedLine.match(/^[\x00-\x1F\x7F-\x9F]*$/)) {
                // Center the text if needed
                if (isCentered && processedLine.trim()) {
                    const maxWidth = 42; // Standard thermal printer width
                    const padding = Math.max(0, Math.floor((maxWidth - processedLine.length) / 2));
                    processedLine = ' '.repeat(padding) + processedLine;
                }
                // Add formatting markers for plain text
                if (isBold) {
                    processedLine = `**${processedLine}**`;
                }
                if (isDoubleSize) {
                    processedLine = `#${processedLine}#`;
                }
                plainText += processedLine + '\n';
            }
        }
        return plainText;
    }
    static convertEscposToPrinterCommands(printer, escposData) {
        // Parse ESC/POS commands and convert to printer operations
        const commands = escposData.split('\n');
        for (const command of commands) {
            if (command.includes('\x1B\x40')) {
                // Initialize printer
                printer.initialize();
            }
            else if (command.includes('\x1B\x61\x01')) {
                // Center alignment
                printer.align('center');
            }
            else if (command.includes('\x1B\x61\x00')) {
                // Left alignment
                printer.align('left');
            }
            else if (command.includes('\x1B\x21\x10')) {
                // Double height and width
                printer.style('b');
                printer.size(2, 2);
            }
            else if (command.includes('\x1B\x21\x00')) {
                // Normal size
                printer.style('normal');
                printer.size(1, 1);
            }
            else if (command.includes('\x1B\x2D\x01')) {
                // Underline on
                printer.style('u');
            }
            else if (command.includes('\x1B\x2D\x00')) {
                // Underline off
                printer.style('normal');
            }
            else if (command.includes('\x1B\x69')) {
                // Cut paper
                printer.cut();
            }
            else if (command.trim() && !command.startsWith('\x1B')) {
                // Regular text (not ESC commands)
                printer.text(command);
            }
        }
    }
    static async listAvailablePrinters() {
        try {
            // List USB printers
            const usbDevice = new escpos.USB();
            const printers = [];
            // This is a simplified approach - in practice you'd need to enumerate devices
            console.log('🔍 Available printers will be listed here');
            return printers;
        }
        catch (error) {
            console.error('❌ Error listing printers:', error);
            return [];
        }
    }
}
exports.EscposPrintService = EscposPrintService;
