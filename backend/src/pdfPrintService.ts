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

class PdfPrintService {
  private tempDir: string;

  constructor() {
    // Use production path handling
    const basePath = process.env.NODE_ENV === 'production' ? process.cwd() : path.join(__dirname, '../');
    this.tempDir = path.join(basePath, 'temp');
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Get all available printers using PowerShell
  async getAllPrinters(): Promise<PrinterInfo[]> {
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
        } catch (parseError) {
          console.error('❌ Failed to parse printer list:', parseError);
          return [];
        }
      } else {
        // For non-Windows systems, return empty array for now
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting printers:', error);
      return [];
    }
  }

  // Get thermal printers specifically
  async getThermalPrinters(): Promise<PrinterInfo[]> {
    const allPrinters = await this.getAllPrinters();
    const thermalKeywords = ['thermal', 'pos', 'receipt', 'epson', 'star', 'citizen'];
    
    return allPrinters.filter(printer => 
      thermalKeywords.some(keyword => 
        printer.name.toLowerCase().includes(keyword)
      )
    );
  }

  // Test printer connection using Windows print command
  async testPrinter(printerName: string): Promise<TestResult> {
    try {
      console.log(`🧪 Testing printer: ${printerName}`);
      
      // Create a simple test file
      const testFile = path.join(this.tempDir, `test_${Date.now()}.txt`);
      const testContent = `Test print from ${printerName}\nDate: ${new Date().toLocaleString()}\n\n`;
      fs.writeFileSync(testFile, testContent);
      
      // Try to print using PowerShell
      const psCommand = `powershell -Command "Start-Process -FilePath '${testFile}' -Verb Print"`;
      await execAsync(psCommand, { windowsHide: true });
      
      // Clean up test file
      setTimeout(() => {
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }, 10000);
      
      return {
        success: true,
        message: `Test print sent to ${printerName}`
      };
    } catch (error) {
      console.error(`❌ Test print failed for ${printerName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create PDF ticket using the working English version
  async createPDFTicket(ticketData: any): Promise<string> {
    // Create a new PDF document - thermal printer dimensions (80mm width)
    const doc = new PDFDocument({
      size: [226, 500], // Width: 80mm (~226 points), Height: taller for tear-off stub
      margins: {
        top: 5,
        bottom: 5,
        left: 0, // Even more left margin to move content further right
        right: 0 // Minimal right margin
      },
      layout: 'portrait' // Force portrait orientation for vertical printing
    });

    // Register Kannada fonts for rupee symbol support (copied from Kannada service)
    let regularFontRegistered = false;
    let boldFontRegistered = false;
    
    // In production, fonts are in the same directory as the service
    // In development, fonts are in the parent directory
    const isProduction = process.env.NODE_ENV === 'production';
    const fontDir = isProduction ? path.join(__dirname, 'fonts') : path.join(__dirname, '..', 'fonts');
    
    const regularFontPath = path.join(fontDir, 'NotoSansKannada-Regular.ttf');
    const boldFontPath = path.join(fontDir, 'NotoSansKannada-Bold.ttf');
    
    if (fs.existsSync(regularFontPath)) {
      try {
        doc.registerFont('NotoSansKannada', regularFontPath);
        regularFontRegistered = true;
        console.log('✅ Registered NotoSansKannada font in English service');
      } catch (error) {
        console.log('❌ Failed to register NotoSansKannada font:', (error as Error).message);
      }
    } else {
      console.log('❌ Regular font not found!');
    }
    
    if (fs.existsSync(boldFontPath)) {
      try {
        doc.registerFont('NotoSansKannada-Bold', boldFontPath);
        boldFontRegistered = true;
        console.log('✅ Registered NotoSansKannada-Bold font in English service');
      } catch (error) {
        console.log('❌ Failed to register NotoSansKannada-Bold font:', (error as Error).message);
      }
    } else {
      console.log('❌ Bold font not found!');
    }

    // Safe font function (copied from Kannada service)
    const getSafeFont = (isBold = false) => {
      if (isBold && boldFontRegistered) {
        return 'NotoSansKannada-Bold';
      } else if (regularFontRegistered) {
        return 'NotoSansKannada';
      } else {
        return isBold ? 'Helvetica-Bold' : 'Helvetica';
      }
    };

    // Rupee symbol
    const rupeeSymbol = '₹';

    // Pipe the PDF to a file
    const outputPath = path.join(this.tempDir, `ticket_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Set font sizes - increased for prominence
    const titleFontSize = 12;
    const normalFontSize = 10;
    const smallFontSize = 8;

    // Positioning offsets - change these to move entire ticket
    const LEFT_OFFSET = 39;  // Moved 2mm to left (6 points from 45 to 39)
    const TEXT_OFFSET = 44;  // Moved 2mm to left (6 points from 50 to 44)
    const RIGHT_OFFSET = 94; // Moved 2mm to left (6 points from 100 to 94)
    const SNO_OFFSET = 114;  // Moved 2mm to left (6 points from 120 to 114)

    let currentY = 10;

    // Header box with theater info
    doc.rect(LEFT_OFFSET, 5, 170, 65).stroke(); // Moved right and reduced width to ensure right line is visible
    
    // Bold AND italic theater name (flowing, calligraphy-like)
    doc.fontSize(16).font('Times-BoldItalic'); // Bold + Italic for prominence and elegance
    doc.text(ticketData.theaterName || getTheaterConfig().name, LEFT_OFFSET, 12, { 
      width: 176, 
      align: 'center',
      characterSpacing: 1 // Back to original character spacing
    });
    
    doc.fontSize(normalFontSize).font('Helvetica');
    doc.text(ticketData.location || getTheaterConfig().location, LEFT_OFFSET, 46, { width: 176, align: 'center' }); // Wider text area, aligned with box
    doc.text(`GSTIN: ${ticketData.gstin || getTheaterConfig().gstin}`, LEFT_OFFSET, 58, { width: 176, align: 'center' }); // Wider text area, aligned with box

    currentY = 75;

    // Date and Show info - adjusted spacing for larger fonts
    doc.fontSize(normalFontSize).font('Times-Bold'); // Same font family as theater name, no italic
    doc.text(`DATE: ${ticketData.date || new Date().toLocaleDateString()}`, TEXT_OFFSET, currentY);
    doc.fontSize(6).font('Helvetica'); // Further reduced font size for S.No
    // Format time with AM/PM
    const formattedTime = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
    console.log('🔧 SNO_OFFSET DEBUG:', { SNO_OFFSET, currentY, formattedTime });
    doc.text(`S.No:${ticketData.ticketId || 'TKT1000000'}/${formattedTime}`, SNO_OFFSET + 12, currentY + 1); // Separate S.No control (moved 4mm to right total: 6 + 6 = 12)
    currentY += 15;

    // Movie name - with word wrapping for longer names
    doc.fontSize(normalFontSize).font('Times-Bold'); // Same font family as theater name, no italic
    doc.text(`FILM: ${ticketData.movieName || 'Movie Name'}`, TEXT_OFFSET, currentY, {
      width: 160, // Set width to enable word wrapping
      align: 'left'
    });
    currentY += 25; // More space to accommodate potential wrapping
    
    doc.fontSize(normalFontSize).font('Helvetica');
    doc.text(`${ticketData.showClass} (${ticketData.showTime})`, TEXT_OFFSET, currentY);
    currentY += 18;

    // HIGHLIGHT: Seat info box - prominent display like reference ticket
    doc.rect(LEFT_OFFSET, currentY, 170, 55).stroke(); // Moved right and reduced width to ensure right line is visible
    
    doc.fontSize(14).font('Times-Bold'); // Match Kannada print font size for CLASS/SEAT
    doc.text(`CLASS : ${ticketData.seatClass}`, TEXT_OFFSET, currentY + 10, { 
      width: 176, 
      characterSpacing: -0.5 // Tighter character spacing for longer text
    }); // Moved right
    doc.fontSize(14).font('Times-Bold'); // Match Kannada print font size for CLASS/SEAT
    doc.text(`SEAT  : ${ticketData.seatInfo || 'A 1'}`, TEXT_OFFSET, currentY + 32); // Aligned semicolon with CLASS
    
    currentY += 60; // Adjusted for taller box

    // Price breakdown - compact horizontal layout (2x2 format) with aligned semicolons
    doc.fontSize(smallFontSize).font('Helvetica');
    const priceStartY = currentY;
    
    // Calculate widths for proper semicolon alignment
    const netText = 'NET';
    const cgstText = 'CGST';
    const sgstText = 'SGST';
    const mcText = 'MC';
    
    const netTextWidth = doc.widthOfString(netText);
    const cgstTextWidth = doc.widthOfString(cgstText);
    const sgstTextWidth = doc.widthOfString(sgstText);
    const mcTextWidth = doc.widthOfString(mcText);
    
    const maxLeftTextWidth = Math.max(netTextWidth, sgstTextWidth);
    const maxRightTextWidth = Math.max(cgstTextWidth, mcTextWidth);
    
    const leftColonX = TEXT_OFFSET + maxLeftTextWidth;
    const rightColonX = TEXT_OFFSET + maxLeftTextWidth + 50 + maxRightTextWidth; // 50px gap between columns to prevent overlap
    
    // First row: NET and CGST
    doc.text(netText, TEXT_OFFSET, currentY);
    doc.text(':', leftColonX, currentY);
    doc.font(getSafeFont(false)).text(`${rupeeSymbol}${ticketData.net || getTheaterConfig().defaultTaxValues.net}`, leftColonX + 5, currentY);
    
    doc.font('Helvetica').text(cgstText, TEXT_OFFSET + maxLeftTextWidth + 50, currentY);
    doc.text(':', rightColonX, currentY);
    doc.font(getSafeFont(false)).text(`${rupeeSymbol}${ticketData.cgst || getTheaterConfig().defaultTaxValues.cgst}`, rightColonX + 5, currentY);
    
    currentY += 12;
    
    // Second row: SGST and MC
    doc.font('Helvetica').text(sgstText, TEXT_OFFSET, currentY);
    doc.text(':', leftColonX, currentY);
    doc.font(getSafeFont(false)).text(`${rupeeSymbol}${ticketData.sgst || getTheaterConfig().defaultTaxValues.sgst}`, leftColonX + 5, currentY);
    
    doc.font('Helvetica').text(mcText, TEXT_OFFSET + maxLeftTextWidth + 50, currentY);
    doc.text(':', rightColonX, currentY);
    doc.font(getSafeFont(false)).text(`${rupeeSymbol}${ticketData.mc || getTheaterConfig().defaultTaxValues.mc}`, rightColonX + 5, currentY);
    currentY += 12;
   // Use pre-calculated individual ticket price from formatTicket
    const ticketCostFormatted = ticketData.individualTicketPrice || '0.00';
    console.log('🖨️ RENDER COST LINE:', {
    individualTicketPrice: ticketCostFormatted
    });
    // Split TICKET COST text: use Times-Bold for label and NotoSansKannada-Bold for amount
    const ticketCostLabel = "TICKET COST (per seat):";
    const ticketCostAmount = `${rupeeSymbol}${ticketCostFormatted}`;
    
    // Calculate positions for left-aligned text
    doc.fontSize(normalFontSize).font('Times-Bold');
    const ticketCostLabelWidth = doc.widthOfString(ticketCostLabel);
    doc.fontSize(normalFontSize).font(getSafeFont(true));
    const ticketCostAmountWidth = doc.widthOfString(ticketCostAmount);
    
    // Draw "TICKET COST (per seat):" with Times-Bold
    doc.fontSize(normalFontSize).font('Times-Bold');
    doc.text(ticketCostLabel, TEXT_OFFSET, currentY);
    
    // Draw amount with NotoSansKannada-Bold (supports rupee symbol)
    doc.fontSize(normalFontSize).font(getSafeFont(true));
    doc.text(ticketCostAmount, TEXT_OFFSET + ticketCostLabelWidth, currentY);
    doc.font('Helvetica');
    currentY += 18; // More spacing before total box

    // Total price box - full width, prominent display
    doc.rect(LEFT_OFFSET, priceStartY + 36, 170, 40).stroke(); // Moved right and reduced width to ensure right line is visible
    // Split TOTAL text: use Times-Bold for "TOTAL:" and NotoSansKannada-Bold for amount
    const totalText = "TOTAL:";
    const totalAmount = `${rupeeSymbol}${ticketData.totalAmount || getTheaterConfig().defaultTaxValues.totalAmount}`;
    
    // Calculate positions for centered text
    doc.fontSize(titleFontSize).font('Times-Bold');
    const totalTextWidth = doc.widthOfString(totalText);
    doc.fontSize(titleFontSize).font(getSafeFont(true));
    const totalAmountWidth = doc.widthOfString(totalAmount);
    
    const totalCombinedWidth = totalTextWidth + totalAmountWidth;
    const totalStartX = LEFT_OFFSET + (176 - totalCombinedWidth) / 2;
    const totalY = priceStartY + 51;
    
    // Draw "TOTAL:" with Times-Bold
    doc.fontSize(titleFontSize).font('Times-Bold');
    doc.text(totalText, totalStartX, totalY);
    
    // Draw amount with NotoSansKannada-Bold (supports rupee symbol) - fallback to Times-Bold if not available
    try {
      doc.fontSize(titleFontSize).font(getSafeFont(true));
    } catch (error) {
      doc.fontSize(titleFontSize).font('Times-Bold');
    }
    doc.text(totalAmount, totalStartX + totalTextWidth, totalY);

    // === STUB SECTION === (matching Kannada layout)
    currentY = priceStartY + 86; // Move tear-off line closer to total box
    currentY += 4.2; // Move both tear line and theater name down by 1.4mm total (4.2 points)
    
    // === TEAR-OFF LINE === (round dots, positioned above theater name)
    const drawRoundDotsLine = (startX: number, y: number, endX: number, endY: number) => {
      const dotSpacing = 3;
      const dotRadius = 0.5;
      for (let x = startX; x <= endX; x += dotSpacing) {
        doc.circle(x, y, dotRadius).fill();
      }
    };
    
    drawRoundDotsLine(LEFT_OFFSET, currentY, LEFT_OFFSET + 170, currentY);
    currentY += 5; // Small gap after tear line, close to theater name
    
    // Theater name on one line in stub (matching Kannada font size and bold)
    doc.fontSize(normalFontSize).font('Times-BoldItalic');
    const theaterNameText = ticketData.theaterName || getTheaterConfig().name;
    const theaterNameWidth = doc.widthOfString(theaterNameText);
    const centerX = LEFT_OFFSET + 85; // Center of the ticket
    const theaterNameX = centerX - (theaterNameWidth / 2);
    doc.text(theaterNameText, theaterNameX, currentY);
    currentY += normalFontSize + 6; // Reduced gap from 8 to 6
    
    // Movie name with two-line support (matching Kannada layout)
    doc.fontSize(smallFontSize).font('Times-Bold'); // Use smaller font for stub
    const stubMovieText = ticketData.movieName || 'Movie Name';
    const stubMovieTextWidth = doc.widthOfString(stubMovieText);
    const availableStubWidth = 150; // Available width for stub movie name
    
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
    
    // Stub date and time - reduced gap between movie name and date (matching Kannada alignment)
    currentY -= 3; // Reduce gap by 3px (total reduction of 5px)
    doc.fontSize(smallFontSize).font('Times-Bold'); // Make DATE label bold
    const stubDateLabelText = 'DATE: ';
    const stubDateLabelWidth = doc.widthOfString(stubDateLabelText);
    const stubDateValueWidth = doc.widthOfString(`${ticketData.date || new Date().toLocaleDateString()}`);
    const stubDateTextWidth = stubDateLabelWidth + stubDateValueWidth;
    const stubDateX = centerX - (stubDateTextWidth / 2) - 50;
    const movedStubDateX = stubDateX + 3; // Moved left by 2mm (6 points) - reduced from 9 to 3
    doc.text(stubDateLabelText, movedStubDateX, currentY + 0.75); // Moved right by 1mm and down by 0.25mm (0.75 points)
    doc.font('Times-Bold').text(`${ticketData.date || new Date().toLocaleDateString()}`, movedStubDateX + stubDateLabelWidth + 0.9, currentY + 0.75); // Aligned date value with label Y position
    
    const stubDateEndX = movedStubDateX + stubDateLabelWidth + 0.9 + stubDateValueWidth; // Updated end position
    const stubShowLabelText = `${ticketData.showClass}: `;
    doc.font('Times-Bold'); // Make show label bold
    const stubShowLabelWidth = doc.widthOfString(stubShowLabelText);
    doc.text(stubShowLabelText, stubDateEndX + 10 - 7, currentY); // Moved right by 1mm (3 points) - adjusted positioning
    doc.font('Helvetica').text(`${ticketData.showTime || '02:45 PM'}`, stubDateEndX + 10 - 7 + stubShowLabelWidth, currentY);
    currentY += 15;
    currentY -= 0.6; // Move class/seat line up by 0.2mm (0.6 points)
    
    // CLASS and SEAT on same line (matching Kannada format)
    doc.fontSize(8).font('Helvetica'); // Match Kannada print font size for stub CLASS/SEAT
    const classSeatText = `CLASS: ${ticketData.seatClass} | SEAT: ${ticketData.seatInfo || 'A 1'}`;
    const classSeatWidth = doc.widthOfString(classSeatText);
    const classSeatX = centerX - (classSeatWidth / 2);
    doc.text(classSeatText, classSeatX, currentY);
    currentY += smallFontSize + 5;
    
    // Stub tax breakdown (matching Kannada vertical layout)
    currentY += 1.5; // Add 0.5mm space between CLASS and GST calculations (1.5 points)
    const stubTaxY = currentY;
    const stubTaxStartX = LEFT_OFFSET + 21; // Moved further left by 0.2mm (0.6 points from 24 to 21)
    const stubTaxSpacing = 35;
    
    doc.fontSize(smallFontSize);
    doc.font('Helvetica').text('NET:', stubTaxStartX, stubTaxY);
    doc.font(getSafeFont(false)).text(`${rupeeSymbol}${ticketData.net || getTheaterConfig().defaultTaxValues.net}`, stubTaxStartX, stubTaxY + 8);
    
    doc.font('Helvetica').text('CGST:', stubTaxStartX + stubTaxSpacing, stubTaxY);
    doc.font(getSafeFont(false)).text(`${rupeeSymbol}${ticketData.cgst || getTheaterConfig().defaultTaxValues.cgst}`, stubTaxStartX + stubTaxSpacing, stubTaxY + 8);
    
    doc.font('Helvetica').text('SGST:', stubTaxStartX + (stubTaxSpacing * 2) + 0.3, stubTaxY);
    doc.font(getSafeFont(false)).text(`${rupeeSymbol}${ticketData.sgst || getTheaterConfig().defaultTaxValues.sgst}`, stubTaxStartX + (stubTaxSpacing * 2) + 0.3, stubTaxY + 8);
    
    doc.font('Helvetica').text('MC:', stubTaxStartX + (stubTaxSpacing * 3) + 0.3, stubTaxY);
    doc.font(getSafeFont(false)).text(`${rupeeSymbol}${ticketData.mc || getTheaterConfig().defaultTaxValues.mc}`, stubTaxStartX + (stubTaxSpacing * 3) + 0.3, stubTaxY + 8);
    
    currentY = stubTaxY + 20;
    
    // Stub ticket price (matching Kannada positioning) - split font approach
    const stubTicketCostLabel = "TICKET COST (per seat):";
    const stubTicketCostAmount = `${rupeeSymbol}${ticketData.individualTicketPrice || '0.00'}`;
    
    // Calculate positions for centered text
    doc.fontSize(smallFontSize).font('Times-Bold');
    const stubTicketCostLabelWidth = doc.widthOfString(stubTicketCostLabel);
    doc.fontSize(smallFontSize).font(getSafeFont(true));
    const stubTicketCostAmountWidth = doc.widthOfString(stubTicketCostAmount);
    
    const stubTicketCostCombinedWidth = stubTicketCostLabelWidth + stubTicketCostAmountWidth;
    const stubTicketCostStartX = centerX - (stubTicketCostCombinedWidth / 2) - 0.6; // Moved left by 0.2mm (0.6 points)
    
    // Draw "TICKET COST (per seat):" with Times-Bold
    doc.fontSize(smallFontSize).font('Times-Bold');
    doc.text(stubTicketCostLabel, stubTicketCostStartX, currentY);
    
    // Draw amount with NotoSansKannada-Bold (supports rupee symbol)
    doc.fontSize(smallFontSize).font(getSafeFont(true));
    doc.text(stubTicketCostAmount, stubTicketCostStartX + stubTicketCostLabelWidth, currentY);
    currentY += smallFontSize + 5;
    
    // Stub total (matching Kannada positioning and font size)
    const stubTotalFontSize = normalFontSize + 2; // Slightly bigger than normal but not as big as title
    
    // Split stub TOTAL text: use Times-Bold for "TOTAL:" and NotoSansKannada-Bold for amount
    const stubTotalText = "TOTAL:";
    const stubTotalAmount = `${rupeeSymbol}${ticketData.totalAmount || getTheaterConfig().defaultTaxValues.totalAmount}`;
    
    // Calculate positions for centered text
    doc.fontSize(stubTotalFontSize).font('Times-Bold');
    const stubTotalTextWidth = doc.widthOfString(stubTotalText);
    doc.fontSize(stubTotalFontSize).font(getSafeFont(true));
    const stubTotalAmountWidth = doc.widthOfString(stubTotalAmount);
    
    const stubTotalCombinedWidth = stubTotalTextWidth + stubTotalAmountWidth;
    const stubTotalStartX = centerX - (stubTotalCombinedWidth / 2) - 0.6; // Moved left by 0.2mm (0.6 points)
    
    // Draw "TOTAL:" with Times-Bold
    doc.fontSize(stubTotalFontSize).font('Times-Bold');
    doc.text(stubTotalText, stubTotalStartX, currentY);
    
    // Draw amount with NotoSansKannada-Bold (supports rupee symbol) - fallback to Times-Bold if not available
    try {
      doc.fontSize(stubTotalFontSize).font(getSafeFont(true));
    } catch (error) {
      doc.fontSize(stubTotalFontSize).font('Times-Bold');
    }
    doc.text(stubTotalAmount, stubTotalStartX + stubTotalTextWidth, currentY);
    currentY += stubTotalFontSize + 5;
    
    // Stub S.No and print time (matching Kannada corner positioning with font size 6)
    const stubTicketId = `S.No: ${ticketData.ticketId || 'TKT1000000'}`;
    const stubPrintTime = formattedTime;
    
    doc.fontSize(6).font('Helvetica'); // Font size 6 as requested
    doc.text(stubTicketId, LEFT_OFFSET - 5, currentY); // Moved more to left corner
    
    const stubPrintTimeWidth = doc.widthOfString(stubPrintTime);
    const stubPrintTimeX = LEFT_OFFSET + 170 - stubPrintTimeWidth + 5; // Moved more to right corner
    doc.text(stubPrintTime, stubPrintTimeX, currentY);

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
  async printTicket(ticketData: TicketData, printerName: string | null = null): Promise<PrintResult> {
    console.log('🔤 PdfPrintService.printTicket called! (ENGLISH SERVICE)');
    console.log('🔤 This should NOT be called for Kannada tickets!');
    console.log('🔤 Ticket data received:', ticketData);
    
    try {
      // Auto-detect printer if not specified
      if (!printerName) {
        const thermalPrinters = await this.getThermalPrinters();
        if (thermalPrinters.length > 0) {
          printerName = thermalPrinters[0].name;
          console.log(`🖨️ Auto-selected printer: ${printerName}`);
        } else {
          throw new Error('No thermal printers found');
        }
      }

      // Format ticket data
      const formattedTicket = this.formatTicket(ticketData);
      
      // Generate PDF
      const pdfPath = await this.createPDFTicket(formattedTicket);
      
      console.log(`💾 PDF file created: ${pdfPath}`);
      
      // Print using SumatraPDF with enhanced detection
      try {
        console.log(`🖨️ Printing with SumatraPDF: ${printerName}`);
        
        // Validate printer name to prevent command injection
        if (!printerName || printerName.includes('"') || printerName.includes(';') || printerName.includes('|') || printerName.includes('&')) {
          throw new Error('Invalid printer name: contains forbidden characters');
        }
        
        // Enhanced SumatraPDF detection with multiple paths
        const sumatraPaths = [
          'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
          'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
          path.join(process.env.LOCALAPPDATA || '', 'SumatraPDF\\SumatraPDF.exe'),
          path.join(process.env.USERPROFILE || '', 'AppData\\Local\\SumatraPDF\\SumatraPDF.exe'),
          'C:\\Users\\Hi\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe',
          path.join(process.env.PROGRAMFILES || '', 'SumatraPDF\\SumatraPDF.exe'),
          path.join(process.env['PROGRAMFILES(X86)'] || '', 'SumatraPDF\\SumatraPDF.exe')
        ];
        
        let sumatraPath = null;
        for (const testPath of sumatraPaths) {
          console.log(`🔍 Checking SumatraPDF path: ${testPath}`);
          if (fs.existsSync(testPath)) {
            sumatraPath = testPath;
            console.log(`✅ Found SumatraPDF at: ${testPath}`);
            break;
          }
        }
        
        if (!sumatraPath) {
          throw new Error('SumatraPDF not found. Please install SumatraPDF from https://www.sumatrapdfreader.org/download-free-pdf-viewer.html');
        }
        
        // Use specific printer instead of default
        const printCommand = `"${sumatraPath}" -print-to "${printerName}" "${pdfPath}"`;
        console.log(`🖨️ Executing command: ${printCommand}`);
        await execAsync(printCommand, { windowsHide: true });
        
        console.log(`✅ Print command sent successfully via SumatraPDF!`);
        
        // Clean up PDF file after a delay
        setTimeout(() => {
          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
            console.log('🧹 PDF file cleaned up');
          }
        }, 30000); // 30 second delay
      
        return {
          success: true,
          printer: printerName,
          message: 'Ticket printed successfully via PDF'
        };
      } catch (pdfError) {
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
        } catch (openError) {
          console.log(`❌ PDF open failed: ${openError instanceof Error ? openError.message : 'Unknown error'}`);
        }
      }
      
      // Clean up PDF file if all methods failed
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
      
      return {
        success: false,
        error: 'All PDF printing methods failed',
        printer: printerName || undefined
      };
    } catch (error) {
      console.error('❌ PDF print error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        printer: printerName || undefined
      };
    }
  }

  // Test function for time format - can be called for debugging
  testTimeFormat(): void {
    console.log('🕐 TIME FORMAT TEST - English PDF Service:');
    
    const testTimes = [
      new Date('2024-01-01T06:00:00'), // 6:00 AM
      new Date('2024-01-01T12:00:00'), // 12:00 PM
      new Date('2024-01-01T18:00:00'), // 6:00 PM
      new Date('2024-01-01T00:00:00'), // 12:00 AM
      new Date('2024-01-01T14:30:00'), // 2:30 PM
    ];
    
    testTimes.forEach((date, index) => {
      const formatted = date.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
      console.log(`🕐 Test ${index + 1}: ${date.toISOString()} → "${formatted}"`);
    });
    
    // Test current time
    const now = new Date();
    const currentFormatted = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
    console.log(`🕐 Current time: ${now.toISOString()} → "${currentFormatted}"`);
  }

  // Format ticket data for printing - Map frontend data to correct format
  formatTicket(ticketData: any): any {
    console.log('🔧 Raw ticket data received:', JSON.stringify(ticketData, null, 2));
    
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
    // Test time format first
    this.testTimeFormat();
    
    let currentTime = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
    console.log('🕐 CURRENT TIME DEBUG - English PDF Service:');
    console.log('🕐 new Date():', new Date());
    console.log('🕐 new Date().toISOString():', new Date().toISOString());
    console.log('🕐 toLocaleTimeString result:', currentTime);
    console.log('🕐 typeof currentTime:', typeof currentTime);
    console.log('🕐 currentTime length:', currentTime.length);
    
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
    
    // Prefer provided fields but normalize show label from time if present
    if (ticketData.showTime) {
      showTime = ticketData.showTime;
      const m = showTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (m) {
        let hour = parseInt(m[1], 10);
        const period = m[3].toUpperCase();
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        if (hour < 12) showClass = 'MORNING SHOW';
        else if (hour < 17) showClass = 'MATINEE SHOW';
        else if (hour < 21) showClass = 'EVENING SHOW';
        else showClass = 'NIGHT SHOW';
      } else if (ticketData.show) {
        showClass = `${ticketData.show} SHOW`;
      }
    } else if (ticketData.show) {
      showClass = `${ticketData.show} SHOW`;
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
    console.log('🔧 Seat data extraction:', {
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
        seatInfo = `${rowLetter} ${ticketData.seatRange} (${ticketData.seatCount})`;
      } else {
        // For single seat, just show the seat number
        seatInfo = `${rowLetter} ${ticketData.seatRange}`;
      }
      
      if (ticketData.totalPrice) {
        totalAmount = ticketData.totalPrice;
      }
    } else if (ticketData.seatInfo) {
      // Direct seat info from Electron (fallback)
      console.log('🔧 Using direct seatInfo (fallback):', ticketData.seatInfo);
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
    
    console.log('💰 TICKET COST DEBUG - English PDF Service:');
    console.log('💰 Raw ticketData.individualAmount:', ticketData.individualAmount);
    console.log('💰 Raw ticketData.totalAmount:', ticketData.totalAmount);
    console.log('💰 Raw ticketData.totalPrice:', ticketData.totalPrice);
    console.log('💰 Raw ticketData.seatCount:', ticketData.seatCount);
    console.log('💰 Calculated totalAmount variable:', totalAmount);
    console.log('💰 Calculated individualTicketPrice:', individualTicketPrice);
    console.log('💰 Fallback calculation (totalAmount / seatCount):', totalAmount / (ticketData.seatCount || 1));
    console.log('💰 Final value used for TICKET COST:', individualTicketPrice);
    
    const mcAmount = ticketData.mc || parseFloat(getTheaterConfig().defaultTaxValues.mc); // Use frontend value or default
    const baseAmount = (individualTicketPrice - mcAmount) / 1.18; // Remove MC and divide by 1.18 (1 + 0.18 GST)
    net = baseAmount.toFixed(2);
    cgst = (baseAmount * 0.09).toFixed(2); // 9% CGST
    sgst = (baseAmount * 0.09).toFixed(2); // 9% SGST
    const mc = mcAmount.toFixed(2); // Convert to string for display
    
    console.log('💰 Tax calculation (per ticket):', {
      totalAmount,
      individualTicketPrice,
      mc: mcAmount,
      baseAmount: parseFloat(net),
      cgst: parseFloat(cgst),
      sgst: parseFloat(sgst),
      verification: parseFloat(net) + parseFloat(cgst) + parseFloat(sgst) + mcAmount
    });
    
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
      net,
      cgst,
      sgst,
      mc,
      totalAmount: totalAmount.toString(),
      individualTicketPrice: individualTicketPrice.toFixed(2),
      ticketId,
      currentTime
    };
  }
}

export default PdfPrintService;
