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
  // Create a new PDF document
  const doc = new PDFDocument({
    size: [250, 500],
    margins: {
      top: 5,
      bottom: 5,
      left: 55,
      right: 5
    },
    layout: 'portrait'
  });

  // Pipe the PDF to a file
  const outputPath = path.join(__dirname, 'temp', `test_anek_font_${Date.now()}.pdf`);
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Set font sizes
  const titleFontSize = 12;
  const normalFontSize = 10;
  const smallFontSize = 8;

  let currentY = 10;

  // Header box with theater info
  doc.rect(55, 5, 170, 65).stroke();
  
  // Try different font options for Kannada text
  const fontOptions = [
    'Anek Kannada',
    'AnekKannada',
    'C:\\Windows\\Fonts\\Nudi 01 e.ttf',
    'Times-BoldItalic' // Fallback
  ];
  
  let selectedFont = 'Times-BoldItalic'; // Default fallback
  
  // Try to find a working font
  for (const font of fontOptions) {
    try {
      doc.fontSize(16).font(font);
      selectedFont = font;
      console.log(`Using font: ${font}`);
      break;
    } catch (e) {
      console.log(`Font not available: ${font}`);
      continue;
    }
  }
  
  doc.fontSize(16).font(selectedFont);
  doc.text(ticketData.theaterName, 55, 12, { 
    width: 176, 
    align: 'center',
    characterSpacing: 1
  });
  
  doc.fontSize(normalFontSize).font('Helvetica');
  doc.text(ticketData.location, 55, 46, { width: 176, align: 'center' });
  doc.text(`GSTIN: ${ticketData.gstin}`, 55, 58, { width: 176, align: 'center' });

  currentY = 75;

  // Date and Show info
  doc.fontSize(normalFontSize).font(selectedFont);
  doc.text(`ದಿನಾಂಕ: ${ticketData.date}`, 60, currentY);
  
  doc.fontSize(6).font('Helvetica');
  doc.text(` ಸೀ.ನಂ:${ticketData.ticketId}/${ticketData.currentTime}`, 145, currentY - 5);
  currentY += 15;

  // Movie name
  doc.fontSize(normalFontSize).font(selectedFont);
  doc.text(`ಚಲನಚಿತ್ರ: ${ticketData.movieName}`, 60, currentY, {
    width: 160,
    align: 'left'
  });
  currentY += 25;
  
  doc.fontSize(normalFontSize).font('Helvetica');
  doc.text(`${ticketData.showClass} (${ticketData.showTime})`, 60, currentY);
  currentY += 18;

  // Seat info box
  doc.rect(55, currentY, 170, 55).stroke();
  
  doc.fontSize(titleFontSize).font(selectedFont);
  doc.text(`ವರ್ಗ : ${ticketData.seatClass}`, 60, currentY + 10, { 
    width: 176, 
    characterSpacing: -0.5
  });
  
  doc.fontSize(titleFontSize).font(selectedFont);
  doc.text(`ಸೀಟ್  : ${ticketData.seatInfo}`, 60, currentY + 32);
  
  currentY += 60;

  // Price breakdown
  doc.fontSize(smallFontSize).font('Helvetica');
  const priceStartY = currentY;
  doc.text(`[ನಿವ್ವಳ : ${ticketData.net.padStart(6)}]  [ಸಿಜಿಎಸ್ಟಿ : ${ticketData.cgst.padStart(7)}]`, 60, currentY);
  currentY += 12;
  doc.text(`[ಎಸ್ಜಿಎಸ್ಟಿ : ${ticketData.sgst.padStart(6)}]  [ಎಂಸಿ    : ${ticketData.mc.padStart(7)}]`, 60, currentY);
  currentY += 12;
  doc.text(`[ಟಿಕೆಟ್ ಬೆಲೆ: Rs.${ticketData.totalAmount.padStart(6)}]`, 60, currentY);
  currentY += 18;

  // Total price box
  doc.rect(55, priceStartY + 36, 170, 40).stroke();
  doc.fontSize(titleFontSize).font(selectedFont);
  doc.text(`ಒಟ್ಟು: Rs.${ticketData.totalAmount}`, 55, priceStartY + 51, { width: 176, align: 'center' });

  currentY = priceStartY + 86;

  // Tear-off line
  doc.fontSize(smallFontSize).font('Helvetica');
  doc.text('- - - - - - - - - - - - - - - - - - - - - - - - - -', 60, currentY, { width: 156, align: 'center' });
  currentY += 10;
  
  // Stub section
  doc.fontSize(normalFontSize).font(selectedFont);
  doc.text(ticketData.theaterName, 60, currentY, { width: 156, align: 'center' });
  currentY += 12;
  
  doc.fontSize(smallFontSize).font('Helvetica');
  doc.text(`${ticketData.date} ${ticketData.showClass}`, 60, currentY, { width: 156, align: 'center' });
  currentY += 12;
  
  doc.fontSize(smallFontSize).font(selectedFont);
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
      console.log(`Test PDF generated with font: ${selectedFont}`);
      console.log(`PDF saved at: ${outputPath}`);
      resolve(outputPath);
    });
    stream.on('error', reject);
  });
}

// Test the PDF generation
async function testFontPDF() {
  try {
    const pdfPath = await createPDFTicket(ticketData);
    console.log('Test PDF generated successfully!');
    console.log('Path:', pdfPath);
    console.log('\nPlease open this PDF to check if the Kannada font is working correctly.');
    console.log('If the text appears as boxes or squares, the font is not embedded properly.');
    console.log('If the text appears as readable Kannada, the font is working!');
  } catch (error) {
    console.error('Error generating test PDF:', error);
  }
}

testFontPDF();
