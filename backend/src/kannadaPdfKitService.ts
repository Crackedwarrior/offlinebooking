import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import ticketIdService from './ticketIdService';
import { getTheaterConfig } from './config/theaterConfig';

const execAsync = promisify(exec);

interface PrinterInfo {
  name: string;
  port: string;
  status: string | number;
}

interface TicketSeat {
  row: string;
  number: string;
  price: number;
  classLabel?: string;
}

interface TicketData {
  theaterName?: string;
  location?: string;
  gstin?: string;
  movieName?: string;
  movie?: string; // Alternative field name from frontend
  date?: string;
  showTime?: string;
  screen?: string;
  seats?: TicketSeat[];
  totalAmount?: number;
  seatCount?: number;
  individualAmount?: number;
  seatInfo?: string;
  seatClass?: string;
  show?: string;
  movieLanguage?: string;
  ticketId?: string;
  // Tax data from frontend
  net?: number;
  cgst?: number;
  sgst?: number;
  mc?: number;
}

interface PrintResult {
  success: boolean;
  printer?: string;
  message?: string;
  error?: string;
}

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
}

class KannadaPdfKitService {
  private regularFontPath: string;
  private boldFontPath: string;

  constructor() {
    // Try multiple possible font locations for different deployment environments
    const possibleFontDirs = [
      path.join(__dirname, 'fonts'), // Production: same directory as service
      path.join(__dirname, '..', 'fonts'), // Development: parent directory
      path.join(process.cwd(), 'fonts'), // Railway/web: current working directory
      path.join(process.cwd(), 'backend', 'fonts'), // Alternative web path
      path.join(__dirname, '..', '..', 'fonts'), // Another possible location
    ];
    
    let fontDir = possibleFontDirs[0]; // Default fallback
    
    // Find the first directory that contains the Kannada fonts
    for (const dir of possibleFontDirs) {
      const regularPath = path.join(dir, 'NotoSansKannada-Regular.ttf');
      const boldPath = path.join(dir, 'NotoSansKannada-Bold.ttf');
      
      if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
        fontDir = dir;
        console.log('[PRINT] Found Kannada fonts in directory:', dir);
        break;
      }
    }
    
    this.regularFontPath = path.join(fontDir, 'NotoSansKannada-Regular.ttf');
    this.boldFontPath = path.join(fontDir, 'NotoSansKannada-Bold.ttf');
    
    console.log('[PRINT] Kannada font paths:', {
      regular: this.regularFontPath,
      bold: this.boldFontPath,
      regularExists: fs.existsSync(this.regularFontPath),
      boldExists: fs.existsSync(this.boldFontPath)
    });
  }

  // Get list of thermal printers (same as English service)
  async getThermalPrinters(): Promise<PrinterInfo[]> {
    try {
      console.log('[PRINT] Scanning for thermal printers...');
      
      const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus"', {
        timeout: 10000,
        maxBuffer: 1024 * 1024
      });

      const lines = stdout.split('\n').filter(line => line.trim());
      const printers = [];

      for (let i = 2; i < lines.length; i++) { // Skip header lines
        const line = lines[i].trim();
        if (line) {
          const parts = line.split(/\s+/);
          if (parts.length >= 4) {
            const name = parts[0];
            const driverName = parts[1];
            const portName = parts[2];
            const status = parts[3];

            // Check if it's a thermal printer
            if (name.toLowerCase().includes('epson') || 
                name.toLowerCase().includes('thermal') || 
                name.toLowerCase().includes('receipt') ||
                driverName.toLowerCase().includes('thermal') ||
                driverName.toLowerCase().includes('receipt')) {
              
              printers.push({
                name: name,
                port: portName,
                status: status
              });
            }
          }
        }
      }

      console.log(`[PRINT] Found ${printers.length} thermal printers`);
      return printers;

    } catch (error) {
      console.log('[ERROR] Error scanning printers:', error);
      return [];
    }
  }

  // Print PDF using SumatraPDF (same as English service)
  async printPDF(pdfPath: string, printerName: string): Promise<PrintResult> {
    try {
      console.log(`[PRINT] Printing PDF to ${printerName}...`);
      
      // Enhanced SumatraPDF detection with multiple paths (same as English service)
      const sumatraPaths = [
        'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
        'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
        path.join(process.env.LOCALAPPDATA || '', 'SumatraPDF\\SumatraPDF.exe'),
        path.join(process.env.USERPROFILE || '', 'AppData\\Local\\SumatraPDF\\SumatraPDF.exe'),
        'C:\\Users\\Hi\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe',
        path.join(process.env.PROGRAMFILES || '', 'SumatraPDF\\SumatraPDF.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'SumatraPDF\\SumatraPDF.exe')
      ];
      
      let sumatraFound = false;
      
      for (const sumatraPath of sumatraPaths) {
        if (fs.existsSync(sumatraPath)) {
          console.log(`[PRINT] Found SumatraPDF at: ${sumatraPath}`);
          
          try {
            const printCommand = `"${sumatraPath}" -print-to "${printerName}" "${pdfPath}"`;
            console.log('[PRINT] Executing print command...');
            
            const { stdout, stderr } = await execAsync(printCommand, {
              timeout: 30000,
              maxBuffer: 10 * 1024 * 1024
            });
            
            if (stderr) {
              console.log('[PRINT] Print stderr:', stderr);
            }
            
            console.log('[PRINT] SumatraPDF print executed successfully!');
            console.log('[PRINT] Print output:', stdout);
            
            return {
              success: true,
              printer: printerName,
              message: 'Ticket printed successfully using SumatraPDF'
            };
            
          } catch (error) {
            console.log(`[ERROR] SumatraPDF at ${sumatraPath} failed:`, error);
          }
        }
      }
      
      if (!sumatraFound) {
        throw new Error('SumatraPDF not found. Please install SumatraPDF for thermal printing.');
      }
      
      return {
        success: false,
        error: 'All SumatraPDF paths failed'
      };
      
    } catch (error) {
      console.log('[ERROR] PDF print failed:', error);
      return {
        success: false,
        error: `Print failed: ${error}`
      };
    }
  }

  // Create PDF ticket (same approach as English service but with Kannada content)
  async createPDFTicket(formattedTicket: any): Promise<string> {
    return new Promise((resolve, reject) => {
      // Register Kannada fonts BEFORE creating the document
      console.log('[PRINT] Checking font paths...');
      console.log('[PRINT] Regular font path:', this.regularFontPath);
      console.log('[PRINT] Bold font path:', this.boldFontPath);
      console.log('[PRINT] Regular font exists:', fs.existsSync(this.regularFontPath));
      console.log('[PRINT] Bold font exists:', fs.existsSync(this.boldFontPath));
      
      const doc = new PDFDocument({
        size: [226, 800],
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      
      const outputPath = path.join(__dirname, 'temp', `kannada_ticket_${Date.now()}.pdf`);
      
      // Ensure temp directory exists
      const tempDir = path.dirname(outputPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      
      // Register Kannada fonts
      let regularFontRegistered = false;
      let boldFontRegistered = false;
      
      if (fs.existsSync(this.regularFontPath)) {
        try {
          doc.registerFont('NotoSansKannada', this.regularFontPath);
          regularFontRegistered = true;
          console.log('[PRINT] ✅ Successfully registered NotoSansKannada font from:', this.regularFontPath);
        } catch (error) {
          console.log('[ERROR] ❌ Failed to register NotoSansKannada font:', (error as Error).message);
          console.log('[ERROR] Font path attempted:', this.regularFontPath);
        }
      } else {
        console.log('[ERROR] ❌ Regular font not found at:', this.regularFontPath);
        console.log('[ERROR] Current working directory:', process.cwd());
        console.log('[ERROR] __dirname:', __dirname);
      }
      
      if (fs.existsSync(this.boldFontPath)) {
        try {
          doc.registerFont('NotoSansKannada-Bold', this.boldFontPath);
          boldFontRegistered = true;
          console.log('[PRINT] ✅ Successfully registered NotoSansKannada-Bold font from:', this.boldFontPath);
        } catch (error) {
          console.log('[ERROR] ❌ Failed to register NotoSansKannada-Bold font:', (error as Error).message);
          console.log('[ERROR] Font path attempted:', this.boldFontPath);
        }
      } else {
        console.log('[ERROR] ❌ Bold font not found at:', this.boldFontPath);
      }
      
      // Helper function to get safe font
      const getSafeFont = (isBold = false) => {
        if (isBold && boldFontRegistered) {
          return 'NotoSansKannada-Bold';
        } else if (regularFontRegistered) {
          return 'NotoSansKannada';
        } else {
          console.log('[WARNING] ⚠️ Kannada fonts not available, falling back to Helvetica');
          return isBold ? 'Helvetica-Bold' : 'Helvetica';
        }
      };
      
      // Log font registration status
      console.log('[PRINT] Font registration status:', {
        regularFontRegistered,
        boldFontRegistered,
        fallbackToEnglish: !regularFontRegistered
      });
      
      // Start from TOP of the page
      let currentY = 20;
      const leftMargin = 41; // Set to 41 as requested
      const rightMargin = 209.5; // Adjusted to maintain same width (210.5 - 1 = 209.5)
      const centerX = 125.25; // Adjusted center ((41 + 209.5) / 2 = 125.25)
      
      // Font sizes
      const titleFontSize = 18; // Increased for theater name
      const normalFontSize = 10;
      const smallFontSize = 8;
      const snoFontSize = 5; // Reduced from 6 to 5 for smaller ticket ID/time
      
      // Helper function to draw centered text
      const drawCenteredText = (text: string, y: number, fontSize: number = 10, useBold: boolean = false, useKannada: boolean = false) => {
        const font = useKannada ? getSafeFont(useBold) : (useBold ? 'Helvetica-Bold' : 'Helvetica');
        doc.font(font).fontSize(fontSize);
        const textWidth = doc.widthOfString(text);
        const x = centerX - (textWidth / 2);
        doc.text(text, x, y);
        return y + fontSize + 8;
      };
      
      // Helper function to draw left-aligned text
      const drawLeftText = (text: string, y: number, fontSize: number = 10, useBold: boolean = false, useKannada: boolean = false) => {
        const font = useKannada ? getSafeFont(useBold) : (useBold ? 'Helvetica-Bold' : 'Helvetica');
        doc.font(font).fontSize(fontSize);
        doc.text(text, leftMargin, y);
        return y + fontSize + 5;
      };
      
      // Helper function to draw box
      const drawBox = (x: number, y: number, width: number, height: number) => {
        doc.rect(x, y, width, height).stroke();
      };
      
      // Helper function to draw round dots line
      const drawRoundDotsLine = (x1: number, y1: number, x2: number, y2: number) => {
        const dotSpacing = 2; // Reduced spacing for more dots
        const dotRadius = 0.5; // Smaller radius for unbold dots
        
        for (let x = x1; x <= x2; x += dotSpacing) {
          doc.circle(x, y1, dotRadius).fill();
        }
      };
      
      // === HEADER BOX SECTION ===
      const boxWidth = rightMargin - leftMargin;
      const boxHeight = 68.2; // Reduced by 0.1mm (0.3 points) to move bottom line up further
      const boxX = leftMargin;
      const boxY = currentY;
      
      console.log('[PRINT] Header box position:', { boxX, boxY, boxWidth, boxHeight, leftMargin, rightMargin });
      doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();
      
      let textY = boxY + 4.7; // Moved up by 0.1mm (0.3 points) from 5 to 4.7
      // Split theater name into two lines with reduced spacing and smaller font
      const theaterFontSize = titleFontSize - 2; // Reduced font size by 2
      textY = drawCenteredText('ಶ್ರೀಲೇಖಾ', textY, theaterFontSize, true, true);
      textY = drawCenteredText('ಚಿತ್ರಮಂದಿರ', textY - 5, theaterFontSize, true, true);
      textY = drawCenteredText('ಚಿಕ್ಕಮಗಳೂರು', textY - 3.3, normalFontSize, false, true); // Use Kannada font for location
      textY = drawCenteredText(`GSTIN: ${formattedTicket.gstin}`, textY - 4.3, smallFontSize, false, false); // Moved up by 0.1mm (0.3 points) // Moved down from -5 to -2
      
      // === DETAILS SECTION ===
      currentY = boxY + boxHeight + 3; // Further reduced gap from 8 to 3
      
      // Date and S.No
      doc.fontSize(normalFontSize).font(getSafeFont(true)); // Kannada font for "ದಿನಾಂಕ"
      const dateLabelText = 'ದಿನಾಂಕ: ';
      const dateLabelWidth = doc.widthOfString(dateLabelText);
      const dateX = leftMargin + 3; // Keep text 3px to the left of boxes (41 + 3 = 44, same as before)
      console.log('[PRINT] Text positioning:', { leftMargin, dateX, currentY });
      doc.text(dateLabelText, dateX, currentY);
      doc.font('Times-Bold').text(`${formattedTicket.date}`, dateX + dateLabelWidth, currentY + 1); // Moved date value down by 1 point to align with Kannada baseline
      
      const dateEndX = dateX + dateLabelWidth + doc.widthOfString(`${formattedTicket.date}`);
      // Manual 12-hour format to ensure consistency across all systems
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      const snoText = `S.No: ${formattedTicket.ticketId} / ${formattedTime}`;
      
      doc.fontSize(snoFontSize + 1).font('Helvetica'); // Increased font size by +1 and use same font as English ticket
      doc.text(snoText, dateEndX + 5, currentY + 1); // Moved down to align with dinanka label baseline
      
      currentY += 15;
      
      // Movie - Use same logic as stub (simpler and more effective)
      const kannadaLabel = 'ಚಲನಚಿತ್ರ: ';
      const englishMovieName = formattedTicket.movieName; // Use actual movie name from ticket data
      
      // Draw Kannada label first
      doc.fontSize(normalFontSize).font(getSafeFont(true));
      doc.text(kannadaLabel, dateX, currentY);
      
      // Calculate Kannada label width first with correct font
      doc.fontSize(normalFontSize).font(getSafeFont(true));
      const kannadaLabelWidth = doc.widthOfString(kannadaLabel);
      
      // Calculate movie name width and available space
      doc.fontSize(normalFontSize).font('Times-Bold');
      const englishMovieWidth = doc.widthOfString(englishMovieName);
      const availableWidth = rightMargin - dateX - 20; // Available width for movie name
      
      // Check if movie name fits on one line after the label
      if (englishMovieWidth <= (availableWidth - kannadaLabelWidth)) {
        // Single line - draw English movie name right after Kannada label
        doc.text(englishMovieName, dateX + kannadaLabelWidth, currentY);
      } else {
        // Two lines - calculate if words fit within character limits
        const words = englishMovieName.split(' ');
        let firstLineWords = [];
        let firstLineLength = 0;
        const maxFirstLineChars = 16; // First line can hold 16 characters
        const maxSecondLineChars = 28; // Second line can hold 28 characters
        
        // Build first line word by word, checking character count
        for (const word of words) {
          const wordWithSpace = firstLineWords.length > 0 ? ' ' + word : word;
          if (firstLineLength + wordWithSpace.length <= maxFirstLineChars) {
            firstLineWords.push(word);
            firstLineLength += wordWithSpace.length;
          } else {
            break;
          }
        }
        
        const firstLine = firstLineWords.join(' ');
        const secondLine = words.slice(firstLineWords.length).join(' ');
        
        // First line: chalanachitra: first part (on same line)
        doc.text(firstLine, dateX + kannadaLabelWidth, currentY);
        
        // Second line: rest of movie name below chalanachitra, using the space under the label
        doc.text(secondLine, dateX, currentY + normalFontSize + 8);
        currentY += normalFontSize + 8; // Adjust for second line
      }
      
      currentY += 8; // Reduced gap from 15 to 8
      
      // Show
      currentY += 5; // Reduced gap from 12 to 5
      doc.fontSize(normalFontSize).font(getSafeFont(true)); // Use bold Kannada font for show label
      const showLabelText = `${formattedTicket.showClass}: `;
      const showLabelWidth = doc.widthOfString(showLabelText);
      const showX = dateX;
      doc.text(showLabelText, showX, currentY);
      doc.font('Helvetica').text(`${formattedTicket.showTime}`, showX + showLabelWidth, currentY);
      currentY += 15;
      
      // === CLASS/SEAT BOX ===
      currentY += 2; // Reduced gap further to move box up (5 - 3 = 2)
      const classSeatBoxHeight = 55;
      const classSeatBoxY = currentY;
      
      console.log('[PRINT] CLASS/SEAT box position:', { leftMargin, classSeatBoxY, boxWidth, classSeatBoxHeight });
      drawBox(leftMargin, classSeatBoxY, boxWidth, classSeatBoxHeight);
      
      let classSeatTextY = classSeatBoxY + 15;
      doc.fontSize(14).font('Times-Bold'); // Use same font as English ticket for CLASS/SEAT
      
      const classText = 'CLASS';
      const seatText = 'SEAT';
      const classTextWidth = doc.widthOfString(classText);
      const seatTextWidth = doc.widthOfString(seatText);
      const maxTextWidth = Math.max(classTextWidth, seatTextWidth);
      const alignedColonX = dateX + maxTextWidth + 3; // Added 3px space before colon
      
      doc.text('CLASS', dateX, classSeatTextY - 3); // Moved 1mm (3px) upwards
      doc.text(':', alignedColonX, classSeatTextY - 3);
      doc.text(formattedTicket.seatClass, alignedColonX + 8, classSeatTextY - 3); // Increased gap from 2 to 8
      
      classSeatTextY += 20;
      doc.text('SEAT', dateX, classSeatTextY);
      doc.text(':', alignedColonX, classSeatTextY);
      doc.text(formattedTicket.seatInfo, alignedColonX + 8, classSeatTextY); // Increased gap from 2 to 8
      
      // === TAX BREAKDOWN ===
      currentY = classSeatBoxY + classSeatBoxHeight + 5.9; // Moved up by another 0.1mm (6.2 - 0.3 = 5.9)
      doc.fontSize(smallFontSize).font('Helvetica');
      
      // Use dynamic tax values from frontend
      const netAmount = formattedTicket.net || 0;
      const cgstAmount = formattedTicket.cgst || 0;
      const sgstAmount = formattedTicket.sgst || 0;
      const mcAmount = formattedTicket.mc || 0;
      
      const netText = 'NET';
      const cgstText = 'CGST';
      const sgstText = 'SGST';
      const mcText = 'MC';
      
      const netTextWidth = doc.widthOfString(netText);
      const cgstTextWidth = doc.widthOfString(cgstText);
      const sgstTextWidth = doc.widthOfString(sgstText);
      const mcTextWidth = doc.widthOfString(mcText);
      
      const maxTaxTextWidth = Math.max(netTextWidth, cgstTextWidth, sgstTextWidth, mcTextWidth);
      const taxAlignedColonX = dateX + maxTaxTextWidth;
      
      let taxY = currentY;
      
      // NET and CGST
      doc.font('Helvetica').text('NET', dateX, taxY);
      doc.font('Helvetica').text(':', taxAlignedColonX, taxY);
      doc.font(getSafeFont(false)).text(`₹${netAmount.toFixed(2)}`, taxAlignedColonX + 5, taxY);
      
      const cgstX = dateX + 70;
      doc.font('Helvetica').text('CGST', cgstX, taxY);
      doc.font('Helvetica').text(':', cgstX + maxTaxTextWidth, taxY);
      doc.font(getSafeFont(false)).text(`₹${cgstAmount.toFixed(2)}`, cgstX + maxTaxTextWidth + 5, taxY);
      
      taxY += 12;
      
      // SGST and MC
      doc.font('Helvetica').text('SGST', dateX, taxY);
      doc.font('Helvetica').text(':', taxAlignedColonX, taxY);
      doc.font(getSafeFont(false)).text(`₹${sgstAmount.toFixed(2)}`, taxAlignedColonX + 5, taxY);
      
      doc.font('Helvetica').text('MC', cgstX, taxY);
      doc.font('Helvetica').text(':', cgstX + maxTaxTextWidth, taxY);
      doc.font(getSafeFont(false)).text(`₹${mcAmount.toFixed(2)}`, cgstX + maxTaxTextWidth + 5, taxY);
      
      // === TICKET PRICE ===
      currentY = taxY + 8.9; // Moved down by another 0.1mm (8.6 + 0.3 = 8.9)
      doc.fontSize(normalFontSize).font(getSafeFont(true));
      const ticketPriceText = `ಟಿಕೆಟ್ ಬೆಲೆ (ಪ್ರತಿ ಆಸನ): ₹${formattedTicket.individualTicketPrice}`;
      doc.text(ticketPriceText, dateX, currentY);
      currentY += 15;
      
      // === TOTAL BOX ===
      currentY += 1.4; // Moved up by another 0.1mm (1.7 - 0.3 = 1.4)
      const totalBoxHeight = 37.0; // Increased height by another 0.1mm (36.7 + 0.3 = 37.0)
      const totalBoxY = currentY;
      
      console.log('[PRINT] Total box position:', { leftMargin, totalBoxY, boxWidth, totalBoxHeight });
      drawBox(leftMargin, totalBoxY, boxWidth, totalBoxHeight);
      
      let totalTextY = totalBoxY + 10.4; // Moved text up by 0.2mm (12 - 0.6 = 10.4)
      currentY = drawCenteredText(`ಒಟ್ಟು: ₹${formattedTicket.totalAmount}`, totalTextY, titleFontSize, true, true);
      
      // === STUB SECTION ===
      currentY = totalBoxY + totalBoxHeight + 8; // Reduced gap from 15 to 8
      currentY += 4.2; // Move both tear line and theater name down by 1.4mm total (4.2 points)
      
      // === TEAR-OFF LINE === (moved above theater name in stub, close to it)
      drawRoundDotsLine(leftMargin, currentY, rightMargin, currentY);
      currentY += 5; // Small gap after tear line, close to theater name
      
      // Theater name on one line in stub
      currentY = drawCenteredText('ಶ್ರೀಲೇಖಾ ಚಿತ್ರಮಂದಿರ', currentY, normalFontSize, true, true);
      // Use smaller font for movie name in stub with two-line support
      doc.fontSize(smallFontSize).font('Times-Bold'); // Use smaller font for stub
      const stubMovieText = formattedTicket.movieName; // Use actual movie name from ticket data
      const stubMovieTextWidth = doc.widthOfString(stubMovieText);
      const availableStubWidth = rightMargin - leftMargin - 20; // Available width for stub movie name
      
      currentY -= 1.2; // Move movie name up by 0.4mm total (1.2 points)
      
      // Check if movie name fits on one line in stub
      if (stubMovieTextWidth <= availableStubWidth) {
        // Single line - center the movie name
        const stubMovieX = centerX - (stubMovieTextWidth / 2);
        doc.text(stubMovieText, stubMovieX, currentY);
      } else {
        // Two lines - split movie name
        const words = stubMovieText.split(' ');
        const midPoint = Math.ceil(words.length / 2);
        const firstLine = words.slice(0, midPoint).join(' ');
        const secondLine = words.slice(midPoint).join(' ');
        
        // Center both lines
        const firstLineWidth = doc.widthOfString(firstLine);
        const secondLineWidth = doc.widthOfString(secondLine);
        const firstLineX = centerX - (firstLineWidth / 2);
        const secondLineX = centerX - (secondLineWidth / 2);
        
        // Draw first line
        doc.text(firstLine, firstLineX, currentY);
        // Draw second line
        doc.text(secondLine, secondLineX, currentY + smallFontSize + 2);
        currentY += smallFontSize + 2; // Adjust for second line
      }
      currentY += normalFontSize + 6; // Reduced gap from 8 to 6
      
      // Stub date and time - reduced gap between movie name and date
      currentY -= 3; // Reduce gap by 3px (total reduction of 5px)
      doc.fontSize(smallFontSize).font(getSafeFont(true)); // Kannada font for "ದಿನಾಂಕ"
      const stubDateLabelText = 'ದಿನಾಂಕ: ';
      const stubDateLabelWidth = doc.widthOfString(stubDateLabelText);
      const stubDateValueWidth = doc.widthOfString(`${formattedTicket.date}`);
      const stubDateTextWidth = stubDateLabelWidth + stubDateValueWidth;
      const stubDateX = centerX - (stubDateTextWidth / 2) - 50;
      const movedStubDateX = stubDateX + 3; // Moved right by 1mm (3 points) - increased for visibility
      doc.text(stubDateLabelText, movedStubDateX, currentY + 0.75); // Moved right by 1mm and down by 0.25mm (0.75 points)
      doc.font('Times-Bold').text(`${formattedTicket.date}`, movedStubDateX + stubDateLabelWidth + 0.9, currentY + 0.75); // Aligned date value with label Y position
      
      const stubDateEndX = movedStubDateX + stubDateLabelWidth + 0.9 + stubDateValueWidth; // Updated end position
      const stubShowLabelText = `${formattedTicket.showClass}: `;
      doc.font(getSafeFont(true)); // Use Kannada font for show label
      const stubShowLabelWidth = doc.widthOfString(stubShowLabelText);
      doc.text(stubShowLabelText, stubDateEndX + 10 - 10, currentY); // Moved left by 3.3mm (10 points) - much further left
      doc.font('Helvetica').text(`${formattedTicket.showTime}`, stubDateEndX + 10 - 10 + stubShowLabelWidth, currentY);
      currentY += 15;
      currentY -= 0.6; // Move class/seat line up by 0.2mm (0.6 points)
      
      currentY = drawCenteredText(`CLASS: ${formattedTicket.seatClass} | SEAT: ${formattedTicket.seatInfo}`, currentY, smallFontSize, false, false);
      
      // Stub tax breakdown
      currentY -= 5;
      const stubTaxY = currentY;
      const stubTaxStartX = leftMargin + 21; // Moved further left by 0.2mm (0.6 points from 24 to 21)
      const stubTaxSpacing = 35;
      
      doc.fontSize(smallFontSize);
      doc.font('Helvetica').text('NET:', stubTaxStartX, stubTaxY);
      doc.font(getSafeFont(false)).text(`₹${netAmount.toFixed(2)}`, stubTaxStartX, stubTaxY + 8);
      
      doc.font('Helvetica').text('CGST:', stubTaxStartX + stubTaxSpacing, stubTaxY);
      doc.font(getSafeFont(false)).text(`₹${cgstAmount.toFixed(2)}`, stubTaxStartX + stubTaxSpacing, stubTaxY + 8);
      
      doc.font('Helvetica').text('SGST:', stubTaxStartX + (stubTaxSpacing * 2) + 0.3, stubTaxY);
      doc.font(getSafeFont(false)).text(`₹${sgstAmount.toFixed(2)}`, stubTaxStartX + (stubTaxSpacing * 2) + 0.3, stubTaxY + 8);
      
      doc.font('Helvetica').text('MC:', stubTaxStartX + (stubTaxSpacing * 3) + 0.3, stubTaxY);
      doc.font(getSafeFont(false)).text(`₹${mcAmount.toFixed(2)}`, stubTaxStartX + (stubTaxSpacing * 3) + 0.3, stubTaxY + 8);
      
      currentY = stubTaxY + 20;
      
      // Stub ticket price (moved left by 0.2mm)
      doc.fontSize(smallFontSize).font(getSafeFont(true));
      const stubTicketPriceText = `ಟಿಕೆಟ್ ಬೆಲೆ (ಪ್ರತಿ ಆಸನ): ₹${formattedTicket.individualTicketPrice}`;
      const stubTicketPriceTextWidth = doc.widthOfString(stubTicketPriceText);
      const stubTicketPriceX = centerX - (stubTicketPriceTextWidth / 2) - 0.6; // Moved left by 0.2mm (0.6 points)
      doc.text(stubTicketPriceText, stubTicketPriceX, currentY);
      currentY += smallFontSize + 5;
      
      // Stub total (moved left by 0.2mm, slightly bigger font)
      const stubTotalFontSize = normalFontSize + 2; // Slightly bigger than normal but not as big as title
      doc.fontSize(stubTotalFontSize).font(getSafeFont(true));
      const stubTotalText = `ಒಟ್ಟು: ₹${formattedTicket.totalAmount}`;
      const stubTotalTextWidth = doc.widthOfString(stubTotalText);
      const stubTotalX = centerX - (stubTotalTextWidth / 2) - 0.6; // Moved left by 0.2mm (0.6 points)
      doc.text(stubTotalText, stubTotalX, currentY);
      currentY += stubTotalFontSize + 5;
      
      // Stub S.No and print time (font size 6, moved to corners)
      const stubTicketId = `S.No: ${formattedTicket.ticketId}`;
      const stubPrintTime = formattedTime;
      
      doc.fontSize(6).font('Helvetica'); // Font size 6 as requested
      doc.text(stubTicketId, leftMargin - 5, currentY); // Moved more to left corner
      
      const stubPrintTimeWidth = doc.widthOfString(stubPrintTime);
      const stubPrintTimeX = rightMargin - stubPrintTimeWidth + 5; // Moved more to right corner
      doc.text(stubPrintTime, stubPrintTimeX, currentY);
      
      doc.end();
      
      stream.on('finish', () => {
        resolve(outputPath);
      });
      stream.on('error', reject);
    });
  }

  // Format ticket data for printing - Map frontend data to correct format (same as English service)
  formatTicket(ticketData: any): any {
    console.log('[PRINT] Raw ticket data received:', JSON.stringify(ticketData, null, 2));
    
    // Handle different data structures from frontend
    let movieName = 'Movie';
    let showTime = '02:45PM';
    let showClass = 'UNKNOWN SHOW';
    let date = new Date().toLocaleDateString();
    let totalAmount = 0;
    let seatClass = 'UNKNOWN'; // FALLBACK - will be overridden if data is properly extracted
    let seatInfo = 'A 1'; // FALLBACK - will be overridden if data is properly extracted
    // Use tax values from frontend if available, otherwise use defaults
    let net = ticketData.net || getTheaterConfig().defaultTaxValues.net;
    let cgst = ticketData.cgst || getTheaterConfig().defaultTaxValues.cgst;
    let sgst = ticketData.sgst || getTheaterConfig().defaultTaxValues.sgst;
    let ticketId = 'TKT1000000';
    
    // Manual 12-hour format to ensure consistency across all systems
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    let currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    console.log('[TIME] CURRENT TIME DEBUG - Kannada PDF Service:');
    console.log('[TIME] new Date():', new Date());
    console.log('[TIME] new Date().toISOString():', new Date().toISOString());
    console.log('[TIME] toLocaleTimeString result:', currentTime);
    console.log('[TIME] typeof currentTime:', typeof currentTime);
    console.log('[TIME] currentTime length:', currentTime.length);
    
    // Extract data from frontend format
    if (ticketData.movie) {
      movieName = ticketData.movie;
    } else if (ticketData.movieName) {
      movieName = ticketData.movieName;
    }
    
    // Add language to movie name if available
    if (ticketData.movieLanguage) {
      movieName = `${movieName} (${ticketData.movieLanguage})`;
    }
    
    // Extract showTime first (if available)
    if (ticketData.showTime) {
      showTime = ticketData.showTime;
      console.log('[TIME] Using showTime from frontend:', showTime);
    }
    
    // Use show label from frontend and translate to Kannada
    if (ticketData.show) {
      // Translate English show labels to Kannada
      const showLabel = ticketData.show.toUpperCase();
      let kannadaShow = '';
      
      if (showLabel.includes('MORNING')) {
        kannadaShow = 'ಮಾರ್ನಿಂಗ್ ಶೋ';
      } else if (showLabel.includes('MATINEE') || showLabel.includes('AFTERNOON')) {
        kannadaShow = 'ಮ್ಯಾಟಿನೀ ಶೋ';
      } else if (showLabel.includes('EVENING')) {
        kannadaShow = 'ಈವ್ನಿಂಗ್ ಶೋ';
      } else if (showLabel.includes('NIGHT')) {
        kannadaShow = 'ನೈಟ್ ಶೋ';
      } else {
        // If it's already in Kannada or unknown, use as is
        kannadaShow = showLabel.includes('ಶೋ') ? ticketData.show : `${ticketData.show} ಶೋ`;
      }
      
      showClass = kannadaShow;
      console.log('[PRINT] Using show from frontend:', ticketData.show, '->', kannadaShow);
    } else if (showTime) {
      // Fallback to hardcoded time ranges only if no show label provided
      const m = showTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (m) {
        let hour = parseInt(m[1], 10);
        const period = m[3].toUpperCase();
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        if (hour < 12) showClass = 'ಮಾರ್ನಿಂಗ್ ಶೋ';
        else if (hour < 17) showClass = 'ಮ್ಯಾಟಿನೀ ಶೋ';
        else if (hour < 21) showClass = 'ಈವ್ನಿಂಗ್ ಶೋ';
        else showClass = 'ನೈಟ್ ಶೋ';
        console.log('[TIME] Using hardcoded time range for hour:', hour, '->', showClass);
      }
    }
    
    if (ticketData.date) {
      // Convert date from YYYY-MM-DD to DD/MM/YYYY format
      const dateParts = ticketData.date.split('-');
      if (dateParts.length === 3) {
        date = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // DD/MM/YYYY
      } else {
        date = ticketData.date; // Fallback to original format
      }
    }
    
    if (ticketData.price) {
      totalAmount = ticketData.price;
    } else if (ticketData.total) {
      totalAmount = ticketData.total;
    } else if (ticketData.totalAmount) {
      totalAmount = ticketData.totalAmount;
    }
    
    // Handle seats data - check multiple possible field names
    console.log('[PRINT] Seat data extraction:', {
      seatInfo: ticketData.seatInfo,
      seatClass: ticketData.seatClass,
      seatRange: ticketData.seatRange,
      classLabel: ticketData.classLabel,
      row: ticketData.row
    });
    
    // Prefer structured data (row + seatRange) to enforce range formatting
    if (ticketData.seatRange) {
      // Grouped ticket data
      seatClass = ticketData.classLabel;
      // Extract row letter from row information (e.g., "BOX-A" -> "A")
      let rowLetter = 'A';
      if (ticketData.row) {
        const rowParts = ticketData.row.split('-');
        rowLetter = rowParts[rowParts.length - 1] || 'A'; // Get the last part after dash
      }
      
      // Format seat info - seatRange is already formatted like "1, 2, 3"
      if (ticketData.seatCount && ticketData.seatCount > 1) {
        // For multiple seats, show the formatted range
        seatInfo = `${rowLetter} ${ticketData.seatRange}`;
      } else {
        // For single seat, just show the seat number
        seatInfo = `${rowLetter} ${ticketData.seatRange}`;
      }
      
      if (ticketData.totalPrice) {
        totalAmount = ticketData.totalPrice;
      }
    } else if (ticketData.seatInfo) {
      // Direct seat info from Electron (fallback)
      console.log('[PRINT] Using direct seatInfo (fallback):', ticketData.seatInfo);
      seatInfo = ticketData.seatInfo;
      seatClass = ticketData.seatClass;
    } else if (ticketData.seatId) {
      // Individual ticket data
      const seatId = ticketData.seatId;
      const parts = seatId.split('-');
      seatInfo = `${parts[0] || 'A'} ${parts[1] || '1'}`;
      seatClass = ticketData.class;
    } else if (ticketData.seats && Array.isArray(ticketData.seats) && ticketData.seats.length > 0) {
      // Multiple seats
      const firstSeat = ticketData.seats[0];
      seatInfo = `${firstSeat.row || 'A'} ${firstSeat.number || '1'}`;
      seatClass = firstSeat.classLabel;
    } else if (ticketData.seat) {
      // Direct seat data
      seatInfo = ticketData.seat;
      seatClass = ticketData.class;
    }
    
    // Calculate tax breakdown per individual ticket
    // Use individualAmount if available, otherwise calculate from totalAmount
    const individualTicketPrice = ticketData.individualAmount || (totalAmount / (ticketData.seatCount || 1));
    
    console.log('[PRICE] TICKET COST DEBUG - Kannada PDF Service:');
    console.log('[PRICE] Raw ticketData.individualAmount:', ticketData.individualAmount);
    console.log('[PRICE] Raw ticketData.totalAmount:', ticketData.totalAmount);
    console.log('[PRICE] Raw ticketData.totalPrice:', ticketData.totalPrice);
    console.log('[PRICE] Raw ticketData.seatCount:', ticketData.seatCount);
    console.log('[PRICE] Calculated totalAmount variable:', totalAmount);
    console.log('[PRICE] Calculated individualTicketPrice:', individualTicketPrice);
    console.log('[PRICE] Fallback calculation (totalAmount / seatCount):', totalAmount / (ticketData.seatCount || 1));
    console.log('[PRICE] Final value used for TICKET COST:', individualTicketPrice);
    
    const mcAmount = ticketData.mc || parseFloat(getTheaterConfig().defaultTaxValues.mc); // Use frontend value or default
    const baseAmount = (individualTicketPrice - mcAmount) / 1.18; // Remove MC and divide by 1.18 (1 + 0.18 GST)
    net = baseAmount; // Keep as number
    cgst = baseAmount * 0.09; // 9% CGST - keep as number
    sgst = baseAmount * 0.09; // 9% SGST - keep as number
    const mc = mcAmount; // Keep as number
    
    console.log('[PRICE] Tax calculation results:');
    console.log('[PRICE] individualTicketPrice:', individualTicketPrice);
    console.log('[PRICE] mcAmount:', mcAmount);
    console.log('[PRICE] baseAmount:', baseAmount);
    console.log('[PRICE] net:', net);
    console.log('[PRICE] cgst:', cgst);
    console.log('[PRICE] sgst:', sgst);
    console.log('[PRICE] mc:', mc);
    
    // Generate ticket ID using the service
    ticketId = ticketIdService.getNextTicketId();
    
    return {
      theaterName: getTheaterConfig().name,
      location: getTheaterConfig().location,
      gstin: getTheaterConfig().gstin,
      date,
      showTime,
      showClass,
      movieName,
      seatClass,
      seatInfo,
      totalAmount,
      individualTicketPrice,
      seatCount: ticketData.seatCount || 1,
      net,
      cgst,
      sgst,
      mc,
      ticketId,
      currentTime
    };
  }

  // Main print ticket method (same approach as English service)
  async printTicket(ticketData: TicketData, printerName: string | null = null): Promise<PrintResult> {
    console.log('[PRINT] KannadaPdfKitService.printTicket called! (KANNADA SERVICE)');
    console.log('[PRINT] Using PDFKit with Kannada fonts and SumatraPDF printing');
    console.log('[PRINT] Ticket data received:', ticketData);
    
    try {
      // Auto-detect printer if not specified
      if (!printerName) {
        const thermalPrinters = await this.getThermalPrinters();
        if (thermalPrinters.length > 0) {
          printerName = thermalPrinters[0].name;
          console.log(`[PRINT] Auto-selected printer: ${printerName}`);
        } else {
          throw new Error('No thermal printers found');
        }
      }

      // Format ticket data using same logic as English service
      const formattedTicket = this.formatTicket(ticketData);
      
      // Generate PDF
      const pdfPath = await this.createPDFTicket(formattedTicket);
      
      console.log(`[PRINT] PDF file created: ${pdfPath}`);
      
      // Print using SumatraPDF (same as English service)
      const printResult = await this.printPDF(pdfPath, printerName);
      
      if (printResult.success) {
        console.log('[PRINT] Kannada ticket printed successfully!');
        return {
          success: true,
          printer: printerName,
          message: 'Kannada ticket printed successfully using PDFKit + SumatraPDF'
        };
      } else {
        throw new Error(printResult.error);
      }
      
    } catch (error) {
      console.log('[ERROR] Kannada PDFKit printing failed:', error);
      return {
        success: false,
        error: `Kannada printing failed: ${error}`
      };
    }
  }
}

export { KannadaPdfKitService };
