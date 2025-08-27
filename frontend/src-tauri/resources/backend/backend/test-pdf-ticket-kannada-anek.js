const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Test ticket data in Kannada
const ticketData = {
  theaterName: 'ಶ್ರೀಲೇಖಾ ಥಿಯೇಟರ್',
  location: 'ಚಿಕ್ಕಮಗಳೂರು',
  gstin: '29AAVFS7423E120',
  date: '06/08/2025',
  showTime: '02:45PM',
  showClass: 'ಮ್ಯಾಟಿನಿ ಶೋ',
  movieName: 'ಅವೆಂಜರ್ಸ್ ಇನ್ಫಿನಿಟಿ ವಾರ್ (ಇಂಗ್ಲಿಷ್) (3-D) 4 ಶೋಗಳು',
  seatClass: 'ಕ್ಲಾಸಿಕ್ ಬಾಲ್ಕನಿ',
  seatInfo: 'A 15-16 (2)',
  net: '250.24',
  cgst: '22.88',
  sgst: '22.88',
  mc: '4.00',
  totalAmount: '300.00',
  ticketId: 'TKT1000000',
  currentTime: '10:07AM'
};

function createPDFTicket(ticketData) {
  // Create a new PDF document - thermal printer dimensions (80mm width)
  const doc = new PDFDocument({
    size: [250, 500], // Width: wider to accommodate larger boxes, Height: taller for tear-off stub
    margins: {
      top: 5,
      bottom: 5,
      left: 55, // Even more left margin to move content further right
      right: 5 // Minimal right margin
    },
    layout: 'portrait' // Force portrait orientation for vertical printing
  });

  // Pipe the PDF to a file
  const outputPath = path.join(__dirname, 'temp', `ticket_kannada_anek_${Date.now()}.pdf`);
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Set font sizes - increased for prominence
  const titleFontSize = 12;
  const normalFontSize = 10;
  const smallFontSize = 8;

  let currentY = 10;

  // Header box with theater info
  doc.rect(55, 5, 170, 65).stroke(); // Moved right and reduced width to ensure right line is visible
  
  // Try to use Anek Kannada font - variable font with weights 100-800
  try {
    doc.fontSize(16).font('Anek Kannada'); // Try to use Anek Kannada font
  } catch (e) {
    // Fallback to Nudi font if Anek Kannada not available
    doc.fontSize(16).font('C:\\Windows\\Fonts\\Nudi 01 e.ttf');
  }
  
  doc.text(ticketData.theaterName, 55, 12, { 
    width: 176, 
    align: 'center',
    characterSpacing: 1
  });
  
  doc.fontSize(normalFontSize).font('Helvetica');
  doc.text(ticketData.location, 55, 46, { width: 176, align: 'center' });
  doc.text(`GSTIN: ${ticketData.gstin}`, 55, 58, { width: 176, align: 'center' });

  currentY = 75;

  // Date and Show info - try Anek Kannada font for Kannada text
  try {
    doc.fontSize(normalFontSize).font('Anek Kannada');
  } catch (e) {
    doc.fontSize(normalFontSize).font('C:\\Windows\\Fonts\\Nudi 01 e.ttf');
  }
  doc.text(`ದಿನಾಂಕ: ${ticketData.date}`, 60, currentY);
  
  doc.fontSize(6).font('Helvetica');
  doc.text(` ಸೀ.ನಂ:${ticketData.ticketId}/${ticketData.currentTime}`, 145, currentY - 5);
  currentY += 15;

  // Movie name - with word wrapping for longer names
  try {
    doc.fontSize(normalFontSize).font('Anek Kannada');
  } catch (e) {
    doc.fontSize(normalFontSize).font('C:\\Windows\\Fonts\\Nudi 01 e.ttf');
  }
  doc.text(`ಚಲನಚಿತ್ರ: ${ticketData.movieName}`, 60, currentY, {
    width: 160,
    align: 'left'
  });
  currentY += 25;
  
  doc.fontSize(normalFontSize).font('Helvetica');
  doc.text(`${ticketData.showClass} (${ticketData.showTime})`, 60, currentY);
  currentY += 18;

  // HIGHLIGHT: Seat info box - prominent display like reference ticket
  doc.rect(55, currentY, 170, 55).stroke();
  
  try {
    doc.fontSize(titleFontSize).font('Anek Kannada');
  } catch (e) {
    doc.fontSize(titleFontSize).font('C:\\Windows\\Fonts\\Nudi 01 e.ttf');
  }
  doc.text(`ವರ್ಗ : ${ticketData.seatClass}`, 60, currentY + 10, { 
    width: 176, 
    characterSpacing: -0.5
  });
  
  try {
    doc.fontSize(titleFontSize).font('Anek Kannada');
  } catch (e) {
    doc.fontSize(titleFontSize).font('C:\\Windows\\Fonts\\Nudi 01 e.ttf');
  }
  doc.text(`ಸೀಟ್  : ${ticketData.seatInfo}`, 60, currentY + 32);
  
  currentY += 60;

  // Price breakdown - compact horizontal layout
  doc.fontSize(smallFontSize).font('Helvetica');
  const priceStartY = currentY;
  doc.text(`[ನಿವ್ವಳ : ${ticketData.net.padStart(6)}]  [ಸಿಜಿಎಸ್ಟಿ : ${ticketData.cgst.padStart(7)}]`, 60, currentY);
  currentY += 12;
  doc.text(`[ಎಸ್ಜಿಎಸ್ಟಿ : ${ticketData.sgst.padStart(6)}]  [ಎಂಸಿ    : ${ticketData.mc.padStart(7)}]`, 60, currentY);
  currentY += 12;
  doc.text(`[ಟಿಕೆಟ್ ಬೆಲೆ: Rs.${ticketData.totalAmount.padStart(6)}]`, 60, currentY);
  currentY += 18;

  // Total price box - full width, prominent display
  doc.rect(55, priceStartY + 36, 170, 40).stroke();
  try {
    doc.fontSize(titleFontSize).font('Anek Kannada');
  } catch (e) {
    doc.fontSize(titleFontSize).font('C:\\Windows\\Fonts\\Nudi 01 e.ttf');
  }
  doc.text(`ಒಟ್ಟು: Rs.${ticketData.totalAmount}`, 55, priceStartY + 51, { width: 176, align: 'center' });

  currentY = priceStartY + 86;

  // Tear-off line (dotted/dashed line) - shorter to fit on one line
  doc.fontSize(smallFontSize).font('Helvetica');
  doc.text('- - - - - - - - - - - - - - - - - - - - - - - - - -', 60, currentY, { width: 156, align: 'center' });
  currentY += 10;
  
  // COMPACT STUB SECTION (for theater staff)
  // Theater name compact
  try {
    doc.fontSize(normalFontSize).font('Anek Kannada');
  } catch (e) {
    doc.fontSize(normalFontSize).font('C:\\Windows\\Fonts\\Nudi 01 e.ttf');
  }
  doc.text(ticketData.theaterName, 60, currentY, { width: 156, align: 'center' });
  currentY += 12;
  
  // Essential info in compact form
  doc.fontSize(smallFontSize).font('Helvetica');
  doc.text(`${ticketData.date} ${ticketData.showClass}`, 60, currentY, { width: 156, align: 'center' });
  currentY += 12;
  
  try {
    doc.fontSize(smallFontSize).font('Anek Kannada');
  } catch (e) {
    doc.fontSize(smallFontSize).font('C:\\Windows\\Fonts\\Nudi 01 e.ttf');
  }
  doc.text(`ಚಲನಚಿತ್ರ: ${ticketData.movieName}`, 60, currentY, { width: 156, align: 'center' });
  currentY += 18;
  
  doc.text(`ವರ್ಗ: ${ticketData.seatClass}`, 60, currentY, { width: 156, align: 'center' });
  currentY += 10;
  doc.text(`ಸೀಟ್: ${ticketData.seatInfo}`, 60, currentY, { width: 156, align: 'center' });
  currentY += 12;
  
  doc.text(`ನಿವ್ವಳ:${ticketData.net} ಸಿಜಿಎಸ್ಟಿ:${ticketData.cgst} ಎಸ್ಜಿಎಸ್ಟಿ:${ticketData.sgst} ಎಂಸಿ:${ticketData.mc}`, 60, currentY, { width: 156, align: 'center' });
  currentY += 18;
  doc.text(`ಒಟ್ಟು: Rs.${ticketData.totalAmount}`, 60, currentY, { width: 156, align: 'center' });
  currentY += 15;
  doc.text(`${ticketData.ticketId} ${ticketData.currentTime}`, 60, currentY, { width: 156, align: 'center' });

  // Finalize the PDF
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`Kannada PDF ticket generated with Anek Kannada font: ${outputPath}`);
      resolve(outputPath);
    });
    stream.on('error', reject);
  });
}

// Test the PDF generation
async function testKannadaPDFTicket() {
  try {
    const pdfPath = await createPDFTicket(ticketData);
    console.log('Kannada PDF generated successfully with Anek Kannada font!');
    console.log('Path:', pdfPath);
    
    // Now print using multiple methods for thermal printer
    const { exec } = require('child_process');
    
    console.log('Kannada PDF generated successfully!');
    console.log('Attempting to print Kannada ticket to thermal printer...');
    
    // Method 1: SumatraPDF (excellent for thermal printing)
    console.log('Trying SumatraPDF printing...');
    
    // Get username for AppData path
    const username = process.env.USERNAME || 'User';
    const appDataCommand = `"C:\\Users\\${username}\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe" -print-to-default "${pdfPath}"`;
    
    exec(appDataCommand, (error, stdout, stderr) => {
      if (error) {
        console.log('SumatraPDF AppData failed, trying Program Files...');
        
        // Method 2: Try SumatraPDF from Program Files
        const sumatra2Command = `"C:\\Program Files\\SumatraPDF\\SumatraPDF.exe" -print-to-default "${pdfPath}"`;
        exec(sumatra2Command, (error2, stdout2, stderr2) => {
          if (error2) {
            console.log('SumatraPDF Program Files failed, trying Program Files (x86)...');
            
            // Method 3: Try SumatraPDF from Program Files (x86)
            const sumatra3Command = `"C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe" -print-to-default "${pdfPath}"`;
            exec(sumatra3Command, (error3, stdout3, stderr3) => {
              if (error3) {
                console.log('SumatraPDF not found in any standard location.');
                console.log('Kannada PDF generated at:', pdfPath);
                console.log('Please manually open with SumatraPDF and print (Ctrl+P)');
              } else {
                console.log('Kannada ticket print sent via SumatraPDF (Program Files x86)!');
              }
            });
          } else {
            console.log('Kannada ticket print sent via SumatraPDF (Program Files)!');
          }
        });
      } else {
        console.log('Kannada ticket print sent via SumatraPDF (AppData)!');
      }
    });
    
  } catch (error) {
    console.error('Error generating Kannada PDF ticket:', error);
  }
}

testKannadaPDFTicket();
