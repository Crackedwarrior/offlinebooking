import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

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

class KannadaPdfService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
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

  // Generate HTML for Kannada ticket
  private generateTicketHTML(ticketData: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Movie Ticket</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;700&display=swap');
          
          body {
            font-family: 'Noto Sans Kannada', 'Arial Unicode MS', 'Segoe UI', sans-serif;
            margin: 0;
            padding: 10px;
            padding-left: 70px;
            font-size: 40px;
            line-height: 1.2;
            color: black;
            background: white;
            width: 280px;
          }
          
          .ticket {
            border: 1px solid #000;
            padding: 5px;
            margin-bottom: 10px;
          }
          
          .theater-box {
            border: 1px solid #000;
            padding: 5px;
            text-align: center;
            margin-bottom: 10px;
          }
          
          .theater-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .location {
            font-size: 22px;
            margin-bottom: 5px;
          }
          
          .gstin {
            font-size: 20px;
          }
          
          .info-row {
            margin: 4px 0;
            font-size: 22px;
          }
          
          .class-seat-box {
            border: 1px solid #000;
            padding: 5px;
            margin: 10px 0;
          }
          
          .tax-row {
            margin: 4px 0;
            font-size: 20px;
          }
          
          .tax-row-container {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            align-items: baseline;
          }
          
          .tax-item-main {
            font-size: 20px;
            width: 48%;
            text-align: left;
            display: inline-block;
            white-space: nowrap;
          }
          
          .total-box {
            border: 1px solid #000;
            padding: 5px;
            text-align: center;
            margin: 10px 0;
          }
          
          .total-amount {
            font-size: 32px;
            font-weight: bold;
          }
          
          .ticket-id {
            text-align: center;
            font-size: 22px;
            margin: 10px 0;
          }
          
          .dotted-line {
            border-top: 2px dotted #000;
            margin: 10px 0;
          }
          
          .stub {
            font-size: 24px;
            text-align: center;
          }
          
          .stub-row {
            margin: 2px 0;
            line-height: 1.2;
            font-size: 20px;
          }
          
          .tax-breakdown {
            display: flex;
            justify-content: space-between;
            font-size: 18px;
            margin: 5px 0;
          }
          
          .tax-item {
            text-align: center;
            flex: 1;
            font-size: 18px;
          }
          
          .page-break {
            page-break-after: always;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="theater-box">
            <div class="theater-name">${ticketData.theaterName || 'ಶ್ರೀಲೇಖಾ ಚಿತ್ರಮಂದಿರ'}</div>
            <div class="location">${ticketData.location || 'ಚಿಕ್ಕಮಗಳೂರು'}</div>
            <div class="gstin">GSTIN:${ticketData.gstin || '29AAVFS7423E120'}</div>
          </div>
          
          <div class="info-row"><span style="font-weight: bold;">ದಿನಾಂಕ:</span> ${ticketData.date || new Date().toLocaleDateString()}</div>
          <div class="info-row"><span style="font-weight: bold;">${ticketData.showClass || 'ಮ್ಯಾಟಿನಿ ಶೋ'}:</span> ${ticketData.showTime || '02:45PM'}</div>
          <div class="info-row"><span style="font-weight: bold;">ಚಲನಚಿತ್ರ:</span> ${ticketData.movieName || 'ಚಲನಚಿತ್ರ ಹೆಸರು'}</div>
          
          <div class="class-seat-box">
            <div class="info-row" style="font-weight: bold;">ವರ್ಗ: ${ticketData.seatClass || 'ಸ್ಟಾರ್'}</div>
            <div class="info-row" style="font-weight: bold;">ಸೀಟ್: ${ticketData.seatInfo || 'A 1'}</div>
          </div>
          
          <div class="tax-row-container">
            <div class="tax-item-main">ನಿವ್ವಳ: ₹${ticketData.net || '125.12'}</div>
            <div class="tax-item-main">ಸಿಜಿಎಸ್ಟಿ: ₹${ticketData.cgst || '11.44'}</div>
          </div>
          <div class="tax-row-container">
            <div class="tax-item-main">ಎಸ್ಜಿಎಸ್ಟಿ: ₹${ticketData.sgst || '11.44'}</div>
            <div class="tax-item-main">ಎಂಸಿ: ₹${ticketData.mc || '2.00'}</div>
          </div>
          
          <div class="total-box">
            <div class="total-amount">ಒಟ್ಟು: ₹${ticketData.totalAmount || '150.00'}</div>
          </div>
          
          <div class="ticket-id">S.No: ${ticketData.ticketId || 'TKT1000000'} / ${ticketData.currentTime || new Date().toLocaleTimeString().split(':').slice(0, 2).join(':')}</div>
        </div>
        
        <!-- Tear-off Stub Section -->
        <div class="dotted-line"></div>
        
        <div class="stub">
          <div class="stub-row" style="font-weight: bold;">${ticketData.theaterName || 'ಶ್ರೀಲೇಖಾ ಚಿತ್ರಮಂದಿರ'}</div>
          <div class="stub-row">${(ticketData.movieName || 'ಚಲನಚಿತ್ರ ಹೆಸರು').split(' ').slice(0, 3).join(' ')}</div>
          <div class="stub-row">ದಿನಾಂಕ: ${ticketData.date || new Date().toLocaleDateString()} | ${ticketData.showClass || 'ಮ್ಯಾಟಿನಿ ಶೋ'}: ${ticketData.showTime || '02:45PM'}</div>
          <div class="stub-row">ವರ್ಗ: ${ticketData.seatClass || 'ಸ್ಟಾರ್'} | ಸೀಟ್: ${ticketData.seatInfo || 'A 1'}</div>
          
          <div class="tax-breakdown">
            <div class="tax-item">ನಿವ್ವಳ:₹${ticketData.net || '125.12'}</div>
            <div class="tax-item">ಸಿಜಿಎಸ್ಟಿ:₹${ticketData.cgst || '11.44'}</div>
            <div class="tax-item">ಎಸ್ಜಿಎಸ್ಟಿ:₹${ticketData.sgst || '11.44'}</div>
            <div class="tax-item">ಎಂಸಿ:₹${ticketData.mc || '2.00'}</div>
          </div>
          
          <div class="stub-row" style="font-weight: bold; font-size: 18px;">ಒಟ್ಟು: ₹${ticketData.totalAmount || '150.00'}</div>
          <div class="stub-row" style="font-size: 14px;">S.No: ${ticketData.ticketId || 'TKT1000000'} / ${ticketData.currentTime || new Date().toLocaleTimeString().split(':').slice(0, 2).join(':')}</div>
        </div>
      </body>
      </html>
    `;
  }

  // Create PDF ticket using Puppeteer
  async createPDFTicket(ticketData: any): Promise<string> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set viewport for thermal printer size
    await page.setViewport({ width: 320, height: 1500 });
    
    // Generate HTML content
    const htmlContent = this.generateTicketHTML(ticketData);
    
    // Set content and wait for fonts to load
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const outputPath = path.join(this.tempDir, `kannada_ticket_${Date.now()}.pdf`);
    await page.pdf({ 
      path: outputPath, 
      width: '320px', 
      height: '1500px', 
      printBackground: true, 
      margin: { top: '0', right: '0', bottom: '0', left: '0' } 
    });
    
    await browser.close();
    return outputPath;
  }

  // Print ticket using PDF generation
  async printTicket(ticketData: TicketData, printerName: string | null = null): Promise<PrintResult> {
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
      
      console.log(`💾 Kannada PDF file created: ${pdfPath}`);
      
      // Print using SumatraPDF
      try {
        console.log(`🖨️ Printing Kannada ticket with SumatraPDF: ${printerName}`);
        
        // Try primary SumatraPDF path
        const primaryPath = 'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe';
        const secondaryPath = 'C:\\Users\\Hi\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe';
        
        let sumatraPath = primaryPath;
        if (!fs.existsSync(primaryPath)) {
          sumatraPath = secondaryPath;
        }
        
        const printCommand = `"${sumatraPath}" -print-to-default "${pdfPath}"`;
        await execAsync(printCommand, { windowsHide: true });
        
        console.log(`✅ Kannada print command sent successfully via SumatraPDF!`);
        
        // Clean up PDF file after a delay
        setTimeout(() => {
          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
            console.log('🧹 Kannada PDF file cleaned up');
          }
        }, 30000); // 30 second delay
      
        return {
          success: true,
          printer: printerName,
          message: 'Kannada ticket printed successfully via PDF'
        };
      } catch (pdfError) {
        console.log(`❌ Kannada PDF print failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
        
        // Fallback to opening PDF for manual printing
        try {
          console.log(`🖨️ Fallback: Opening Kannada PDF for manual print: ${printerName}`);
          const openCommand = `start "" "${pdfPath}"`;
          await execAsync(openCommand, { windowsHide: true });
          
          console.log('✅ Kannada PDF opened! User can now press Ctrl+P to print');
          
          return {
            success: true,
            printer: printerName,
            message: 'Kannada PDF opened for manual printing (fallback method)'
          };
        } catch (openError) {
          console.log(`❌ Kannada PDF open failed: ${openError instanceof Error ? openError.message : 'Unknown error'}`);
        }
      }
      
      // Clean up PDF file if all methods failed
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
      
      return {
        success: false,
        error: 'All Kannada PDF printing methods failed',
        printer: printerName || undefined
      };
    } catch (error) {
      console.error('❌ Kannada PDF print error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        printer: printerName || undefined
      };
    }
  }

  // Format ticket data for printing - Map frontend data to correct format
  formatTicket(ticketData: any): any {
    console.log('🔧 Raw Kannada ticket data received:', JSON.stringify(ticketData, null, 2));
    console.log('🔧 Movie language check:', {
      movieLanguage: ticketData.movieLanguage,
      movieName: ticketData.movieName,
      hasLanguage: !!ticketData.movieLanguage
    });
    
    // Handle different data structures from frontend
    let movieName = 'ಚಲನಚಿತ್ರ ಹೆಸರು';
    let showTime = '02:45PM';
    let showClass = 'ಮ್ಯಾಟಿನಿ ಶೋ';
    let date = new Date().toLocaleDateString();
    let totalAmount = 0;
    let seatClass = 'ಸ್ಟಾರ್';
    let seatInfo = 'A 1';
    let net = '125.12';
    let cgst = '11.44';
    let sgst = '11.44';
    let mc = '2.00';
    let ticketId = 'TKT1000000';
    let currentTime = new Date().toLocaleTimeString().split(':').slice(0, 2).join(':');
    
         // Extract data from frontend format
     console.log('🔧 Starting movie name extraction...');
     if (ticketData.movie) {
       movieName = ticketData.movie;
       console.log('🔧 Using ticketData.movie:', movieName);
     } else if (ticketData.movieName) {
       movieName = ticketData.movieName;
       console.log('🔧 Using ticketData.movieName:', movieName);
     } else {
       console.log('🔧 No movie name found in ticketData');
     }
     
     // Append movie language if provided
     console.log('🔧 Processing movie language:', {
       movieName,
       movieLanguage: ticketData.movieLanguage,
       hasLanguage: !!ticketData.movieLanguage
     });
     
     if (ticketData.movieLanguage) {
       console.log('🔧 Adding language to movie name...');
       movieName = `${movieName} (${ticketData.movieLanguage})`;
       console.log('🔧 Final movie name with language:', movieName);
     } else {
       console.log('🔧 No movie language found, keeping original name:', movieName);
     }
    
    if (ticketData.show) {
      // Convert show key to Kannada time format
      const showMap: { [key: string]: { time: string, class: string } } = {
        'MORNING': { time: '10:30AM', class: 'ಬೆಳಗಿನ ಶೋ' },
        'MATINEE': { time: '02:45PM', class: 'ಮ್ಯಾಟಿನಿ ಶೋ' },
        'EVENING': { time: '06:00PM', class: 'ಸಂಜೆ ಶೋ' },
        'NIGHT': { time: '09:30PM', class: 'ರಾತ್ರಿ ಶೋ' }
      };
      const showInfo = showMap[ticketData.show] || { time: '02:45PM', class: 'ಮ್ಯಾಟಿನಿ ಶೋ' };
      showTime = showInfo.time;
      showClass = showInfo.class;
    } else if (ticketData.showTime) {
      showTime = ticketData.showTime;
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
    
    // Handle seats data
    if (ticketData.seatRange) {
      // Grouped ticket data
      seatClass = this.translateClassToKannada(ticketData.classLabel || 'STAR');
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
      } else {
        // For single seat, just show "A 5"
        seatInfo = `${rowLetter} ${ticketData.seatRange}`;
      }
      
      if (ticketData.totalPrice) {
        totalAmount = ticketData.totalPrice;
      }
    } else if (ticketData.seatId) {
      // Individual ticket data
      const seatId = ticketData.seatId;
      const parts = seatId.split('-');
      seatInfo = `${parts[0] || 'A'} ${parts[1] || '1'}`;
      seatClass = this.translateClassToKannada(ticketData.class || 'STAR');
    } else if (ticketData.seats && Array.isArray(ticketData.seats) && ticketData.seats.length > 0) {
      // Multiple seats
      const firstSeat = ticketData.seats[0];
      seatInfo = `${firstSeat.row || 'A'} ${firstSeat.number || '1'}`;
      seatClass = this.translateClassToKannada(firstSeat.classLabel || 'STAR');
    } else if (ticketData.seat) {
      // Direct seat data
      seatInfo = ticketData.seat;
      seatClass = this.translateClassToKannada(ticketData.class || 'STAR');
    }
    
    // Calculate tax breakdown (simplified)
    const baseAmount = totalAmount * 0.8; // Assume 80% is base amount
    net = baseAmount.toFixed(2);
    cgst = (baseAmount * 0.09).toFixed(2); // 9% CGST
    sgst = (baseAmount * 0.09).toFixed(2); // 9% SGST
    mc = (totalAmount * 0.02).toFixed(2); // 2% MC
    
    // Generate ticket ID
    ticketId = `TKT${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    
    return {
      theaterName: 'ಶ್ರೀಲೇಖಾ ಚಿತ್ರಮಂದಿರ',
      location: 'ಚಿಕ್ಕಮಗಳೂರು',
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

  // Translate English class names to Kannada
  private translateClassToKannada(englishClass: string): string {
    const translations: { [key: string]: string } = {
      'BOX': 'ಬಾಕ್ಸ್',
      'STAR': 'ಸ್ಟಾರ್',
      'STAR CLASS': 'ಸ್ಟಾರ್ ವರ್ಗ',
      'CLASSIC': 'ಕ್ಲಾಸಿಕ್',
      'FIRST CLASS': 'ಮೊದಲ ವರ್ಗ',
      'SECOND CLASS': 'ಎರಡನೇ ವರ್ಗ',
      'VIP': 'ವಿಐಪಿ',
      'BALCONY': 'ಬಾಲ್ಕನಿ',
      'CLASSIC BALCONY': 'ಕ್ಲಾಸಿಕ್ ಬಾಲ್ಕನಿ'
    };
    
    return translations[englishClass.toUpperCase()] || englishClass;
  }
}

export default KannadaPdfService;
