"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const ticketIdService_1 = __importDefault(require("./ticketIdService"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class PdfPrintService {
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
            const testFile = path_1.default.join(this.tempDir, `test_${Date.now()}.txt`);
            const testContent = `Test print from ${printerName}\nDate: ${new Date().toLocaleString()}\n\n`;
            fs_1.default.writeFileSync(testFile, testContent);
            // Try to print using PowerShell
            const psCommand = `powershell -Command "Start-Process -FilePath '${testFile}' -Verb Print"`;
            await execAsync(psCommand, { windowsHide: true });
            // Clean up test file
            setTimeout(() => {
                if (fs_1.default.existsSync(testFile)) {
                    fs_1.default.unlinkSync(testFile);
                }
            }, 10000);
            return {
                success: true,
                message: `Test print sent to ${printerName}`
            };
        }
        catch (error) {
            console.error(`❌ Test print failed for ${printerName}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    // Create PDF ticket using the working English version
    async createPDFTicket(ticketData) {
        // Create a new PDF document - thermal printer dimensions (80mm width)
        const doc = new pdfkit_1.default({
            size: [226, 500], // Width: 80mm (~226 points), Height: taller for tear-off stub
            margins: {
                top: 5,
                bottom: 5,
                left: 55, // Even more left margin to move content further right
                right: 5 // Minimal right margin
            },
            layout: 'portrait' // Force portrait orientation for vertical printing
        });
        // Pipe the PDF to a file
        const outputPath = path_1.default.join(this.tempDir, `ticket_${Date.now()}.pdf`);
        const stream = fs_1.default.createWriteStream(outputPath);
        doc.pipe(stream);
        // Set font sizes - increased for prominence
        const titleFontSize = 12;
        const normalFontSize = 10;
        const smallFontSize = 8;
        let currentY = 10;
        // Header box with theater info
        doc.rect(55, 5, 170, 65).stroke(); // Moved right and reduced width to ensure right line is visible
        // Bold AND italic theater name (flowing, calligraphy-like)
        doc.fontSize(16).font('Times-BoldItalic'); // Bold + Italic for prominence and elegance
        doc.text(ticketData.theaterName || 'SREELEKHA THEATER', 55, 12, {
            width: 176,
            align: 'center',
            characterSpacing: 1 // Back to original character spacing
        });
        doc.fontSize(normalFontSize).font('Helvetica');
        doc.text(ticketData.location || 'Chikmagalur', 55, 46, { width: 176, align: 'center' }); // Wider text area, aligned with box
        doc.text(`GSTIN: ${ticketData.gstin || '29AAVFS7423E120'}`, 55, 58, { width: 176, align: 'center' }); // Wider text area, aligned with box
        currentY = 75;
        // Date and Show info - adjusted spacing for larger fonts
        doc.fontSize(normalFontSize).font('Times-Bold'); // Same font family as theater name, no italic
        doc.text(`DATE: ${ticketData.date || new Date().toLocaleDateString()}`, 60, currentY);
        doc.fontSize(7).font('Helvetica'); // Slightly reduced font size for S.No
        // Format time to exclude seconds
        const formattedTime = (ticketData.currentTime || new Date().toLocaleTimeString()).split(':').slice(0, 2).join(':');
        doc.text(`S.No:${ticketData.ticketId || 'TKT1000000'}/${formattedTime}`, 145, currentY + 1); // Moved right for better positioning
        currentY += 15;
        // Movie name - with word wrapping for longer names
        doc.fontSize(normalFontSize).font('Times-Bold'); // Same font family as theater name, no italic
        doc.text(`FILM: ${ticketData.movieName || 'Movie Name'}`, 60, currentY, {
            width: 160, // Set width to enable word wrapping
            align: 'left'
        });
        currentY += 25; // More space to accommodate potential wrapping
        doc.fontSize(normalFontSize).font('Helvetica');
        doc.text(`${ticketData.showClass || 'MATINEE SHOW'} (${ticketData.showTime || '02:45PM'})`, 60, currentY);
        currentY += 18;
        // HIGHLIGHT: Seat info box - prominent display like reference ticket
        doc.rect(55, currentY, 170, 55).stroke(); // Moved right and reduced width to ensure right line is visible
        doc.fontSize(titleFontSize).font('Times-Bold'); // Keep original font size
        doc.text(`CLASS : ${ticketData.seatClass || 'STAR'}`, 60, currentY + 10, {
            width: 176,
            characterSpacing: -0.5 // Tighter character spacing for longer text
        }); // Moved right
        doc.fontSize(titleFontSize).font('Times-Bold'); // Same font family as theater name, no italic
        doc.text(`SEAT  : ${ticketData.seatInfo || 'A 1'}`, 60, currentY + 32); // Aligned semicolon with CLASS
        currentY += 60; // Adjusted for taller box
        // Price breakdown - compact horizontal layout (2x2 format) with better alignment
        doc.fontSize(smallFontSize).font('Helvetica');
        const priceStartY = currentY;
        // Align colons by using consistent spacing
        doc.text(`[NET  : ${(ticketData.net || '125.12').padStart(6)}]  [CGST : ${(ticketData.cgst || '11.44').padStart(7)}]`, 60, currentY);
        currentY += 12;
        doc.text(`[SGST : ${(ticketData.sgst || '11.44').padStart(6)}]  [MC   : ${(ticketData.mc || '2.00').padStart(7)}]`, 60, currentY);
        currentY += 12;
        doc.text(`[TICKET COST: Rs.${(ticketData.totalAmount || '150.00').padStart(6)}]`, 60, currentY); // Using Rs. instead of ₹
        currentY += 18; // More spacing before total box
        // Total price box - full width, prominent display
        doc.rect(55, priceStartY + 36, 170, 40).stroke(); // Moved right and reduced width to ensure right line is visible
        doc.fontSize(titleFontSize).font('Times-Bold'); // Same font family as theater name, no italic
        doc.text(`TOTAL: Rs.${ticketData.totalAmount || '150.00'}`, 55, priceStartY + 51, { width: 176, align: 'center' }); // Centered, prominent text
        currentY = priceStartY + 86; // Move tear-off line closer to total box
        // Tear-off line (dotted/dashed line) - shorter to fit on one line
        doc.fontSize(smallFontSize).font('Helvetica');
        doc.text('- - - - - - - - - - - - - - - - - - - - - - - - - -', 60, currentY, { width: 156, align: 'center' });
        currentY += 10; // Less space after tear-off line
        // COMPACT STUB SECTION (for theater staff)
        // Theater name compact - bold and italic
        doc.fontSize(normalFontSize).font('Times-BoldItalic');
        doc.text(ticketData.theaterName || 'SREELEKHA THEATER', 60, currentY, { width: 156, align: 'center' });
        currentY += 12;
        // Essential info in compact form
        doc.fontSize(smallFontSize).font('Helvetica');
        doc.text(`${ticketData.date || new Date().toLocaleDateString()} ${ticketData.showClass || 'MATINEE SHOW'}`, 60, currentY, { width: 156, align: 'center' });
        currentY += 12;
        doc.text(`FILM: ${ticketData.movieName || 'Movie Name'}`, 60, currentY, { width: 156, align: 'center' });
        currentY += 18; // More space for longer movie names that may wrap
        // Split CLASS and SEAT into separate lines to handle longer class names
        doc.text(`CLASS: ${ticketData.seatClass || 'STAR'}`, 60, currentY, { width: 156, align: 'center' });
        currentY += 10;
        doc.text(`SEAT: ${ticketData.seatInfo || 'A 1'}`, 60, currentY, { width: 156, align: 'center' });
        currentY += 12;
        // Tax breakdown in horizontal format
        doc.text(`NET:${ticketData.net || '125.12'} CGST:${ticketData.cgst || '11.44'} SGST:${ticketData.sgst || '11.44'} MC:${ticketData.mc || '2.00'}`, 60, currentY, { width: 156, align: 'center' });
        currentY += 18; // More spacing between MC and TOTAL
        doc.text(`TOTAL: Rs.${ticketData.totalAmount || '150.00'}`, 60, currentY, { width: 156, align: 'center' });
        currentY += 15;
        doc.text(`${ticketData.ticketId || 'TKT1000000'} ${formattedTime}`, 60, currentY, { width: 156, align: 'center' });
        // Finalize the PDF
        doc.end();
        return new Promise((resolve, reject) => {
            stream.on('finish', () => {
                console.log(`✅ PDF generated: ${outputPath}`);
                resolve(outputPath);
            });
            stream.on('error', reject);
        });
    }
    // Print ticket using PDF generation
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
            // Generate PDF
            const pdfPath = await this.createPDFTicket(formattedTicket);
            console.log(`💾 PDF file created: ${pdfPath}`);
            // Print using SumatraPDF
            try {
                console.log(`🖨️ Printing with SumatraPDF: ${printerName}`);
                // Try primary SumatraPDF path
                const primaryPath = 'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe';
                const secondaryPath = 'C:\\Users\\Hi\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe';
                let sumatraPath = primaryPath;
                if (!fs_1.default.existsSync(primaryPath)) {
                    sumatraPath = secondaryPath;
                }
                const printCommand = `"${sumatraPath}" -print-to-default "${pdfPath}"`;
                await execAsync(printCommand, { windowsHide: true });
                console.log(`✅ Print command sent successfully via SumatraPDF!`);
                // Clean up PDF file after a delay
                setTimeout(() => {
                    if (fs_1.default.existsSync(pdfPath)) {
                        fs_1.default.unlinkSync(pdfPath);
                        console.log('🧹 PDF file cleaned up');
                    }
                }, 30000); // 30 second delay
                return {
                    success: true,
                    printer: printerName,
                    message: 'Ticket printed successfully via PDF'
                };
            }
            catch (pdfError) {
                console.log(`❌ PDF print failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
                // Fallback to opening PDF for manual printing
                try {
                    console.log(`🖨️ Fallback: Opening PDF for manual print: ${printerName}`);
                    const openCommand = `start "" "${pdfPath}"`;
                    await execAsync(openCommand, { windowsHide: true });
                    console.log('✅ PDF opened! User can now press Ctrl+P to print');
                    return {
                        success: true,
                        printer: printerName,
                        message: 'PDF opened for manual printing (fallback method)'
                    };
                }
                catch (openError) {
                    console.log(`❌ PDF open failed: ${openError instanceof Error ? openError.message : 'Unknown error'}`);
                }
            }
            // Clean up PDF file if all methods failed
            if (fs_1.default.existsSync(pdfPath)) {
                fs_1.default.unlinkSync(pdfPath);
            }
            return {
                success: false,
                error: 'All PDF printing methods failed',
                printer: printerName || undefined
            };
        }
        catch (error) {
            console.error('❌ PDF print error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                printer: printerName || undefined
            };
        }
    }
    // Format ticket data for printing - Map frontend data to correct format
    formatTicket(ticketData) {
        console.log('🔧 Raw ticket data received:', JSON.stringify(ticketData, null, 2));
        // Handle different data structures from frontend
        let movieName = 'Movie';
        let showTime = '02:45PM';
        let showClass = 'MATINEE SHOW';
        let date = new Date().toLocaleDateString();
        let totalAmount = 0;
        let seatClass = 'STAR';
        let seatInfo = 'A 1';
        let net = '125.12';
        let cgst = '11.44';
        let sgst = '11.44';
        let ticketId = 'TKT1000000';
        let currentTime = new Date().toLocaleTimeString().split(':').slice(0, 2).join(':');
        // Extract data from frontend format
        if (ticketData.movie) {
            movieName = ticketData.movie;
        }
        else if (ticketData.movieName) {
            movieName = ticketData.movieName;
        }
        // Add language to movie name if available
        if (ticketData.movieLanguage) {
            movieName = `${movieName} (${ticketData.movieLanguage})`;
        }
        if (ticketData.show) {
            // Convert show key to time format
            const showMap = {
                'MATINEE': { time: '02:45PM', class: 'MATINEE SHOW' },
                'EVENING': { time: '06:00PM', class: 'EVENING SHOW' },
                'NIGHT': { time: '09:30PM', class: 'NIGHT SHOW' }
            };
            const showInfo = showMap[ticketData.show] || { time: '02:45PM', class: 'MATINEE SHOW' };
            showTime = showInfo.time;
            showClass = showInfo.class;
        }
        else if (ticketData.showTime) {
            showTime = ticketData.showTime;
        }
        if (ticketData.date) {
            // Convert date from YYYY-MM-DD to DD/MM/YYYY format
            const dateParts = ticketData.date.split('-');
            if (dateParts.length === 3) {
                date = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // DD/MM/YYYY
            }
            else {
                date = ticketData.date; // Fallback to original format
            }
        }
        if (ticketData.price) {
            totalAmount = ticketData.price;
        }
        else if (ticketData.total) {
            totalAmount = ticketData.total;
        }
        else if (ticketData.totalAmount) {
            totalAmount = ticketData.totalAmount;
        }
        // Handle seats data
        if (ticketData.seatRange) {
            // Grouped ticket data
            seatClass = ticketData.classLabel || 'STAR';
            // Extract row letter from row information (e.g., "BOX-A" -> "A")
            let rowLetter = 'A';
            if (ticketData.row) {
                const rowParts = ticketData.row.split('-');
                rowLetter = rowParts[rowParts.length - 1] || 'A'; // Get the last part after dash
            }
            // Format seat info as "A 5-6 (2)" format
            if (ticketData.seatCount && ticketData.seatCount > 1) {
                // For multiple seats, create range like "A 5-6 (2)"
                const startSeat = parseInt(ticketData.seatRange);
                const endSeat = startSeat + ticketData.seatCount - 1;
                seatInfo = `${rowLetter} ${startSeat}-${endSeat} (${ticketData.seatCount})`;
            }
            else {
                // For single seat, just show "A 5"
                seatInfo = `${rowLetter} ${ticketData.seatRange}`;
            }
            if (ticketData.totalPrice) {
                totalAmount = ticketData.totalPrice;
            }
        }
        else if (ticketData.seatId) {
            // Individual ticket data
            const seatId = ticketData.seatId;
            const parts = seatId.split('-');
            seatInfo = `${parts[0] || 'A'} ${parts[1] || '1'}`;
            seatClass = ticketData.class || 'STAR';
        }
        else if (ticketData.seats && Array.isArray(ticketData.seats) && ticketData.seats.length > 0) {
            // Multiple seats
            const firstSeat = ticketData.seats[0];
            seatInfo = `${firstSeat.row || 'A'} ${firstSeat.number || '1'}`;
            seatClass = firstSeat.classLabel || 'STAR';
        }
        else if (ticketData.seat) {
            // Direct seat data
            seatInfo = ticketData.seat;
            seatClass = ticketData.class || 'STAR';
        }
        // Calculate tax breakdown with proper formula
        const mcAmount = 2.00; // Fixed Maintenance Charge
        const baseAmount = (totalAmount - mcAmount) / 1.18; // Remove MC and divide by 1.18 (1 + 0.18 GST)
        net = baseAmount.toFixed(2);
        cgst = (baseAmount * 0.09).toFixed(2); // 9% CGST
        sgst = (baseAmount * 0.09).toFixed(2); // 9% SGST
        const mc = mcAmount.toFixed(2); // Convert to string for display
        console.log('💰 Tax calculation:', {
            totalAmount,
            mc: mcAmount,
            baseAmount: parseFloat(net),
            cgst: parseFloat(cgst),
            sgst: parseFloat(sgst),
            verification: parseFloat(net) + parseFloat(cgst) + parseFloat(sgst) + mcAmount
        });
        // Generate ticket ID using the service
        ticketId = ticketIdService_1.default.getNextTicketId();
        return {
            theaterName: 'SREELEKHA THEATER',
            location: 'Chikmagalur',
            gstin: '29AAVFS7423E120',
            date,
            showTime,
            showClass,
            movieName,
            seatClass,
            seatInfo,
            net,
            cgst,
            sgst,
            mc,
            totalAmount: totalAmount.toString(),
            ticketId,
            currentTime
        };
    }
}
exports.default = PdfPrintService;
