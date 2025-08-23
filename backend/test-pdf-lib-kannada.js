const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Test ticket data - mixed Kannada and English
const ticketData = {
  theaterName: 'ಶ್ರೀಲೇಖಾ ಥಿಯೇಟರ್',
  location: 'ಚಿಕ್ಕಮಗಳೂರು',
  gstin: '29AAVFS7423E120',
  date: '06/08/2025',
  showTime: '02:45PM',
  showClass: 'ಮ್ಯಾಟಿನಿ ಶೋ',
  movieName: 'ಅವೆಂಜರ್ಸ್ ಇನ್ಫಿನಿಟಿ ವಾರ್ (ಇಂಗ್ಲಿಷ್) (3-D) 4 ಶೋಗಳು',
  seatClass: 'ಕ್ಲಾಸಿಕ್ ಬಾಲ್ಕನಿ',
  seatInfo: 'A 15-16 (2)', // This will be in English
  net: '250.24',
  cgst: '22.88',
  sgst: '22.88',
  mc: '4.00',
  totalAmount: '300.00',
  ticketId: 'TKT1000000', // This will be in English
  currentTime: '10:07AM'
};

async function createPDFTicket(ticketData) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([250, 500]); // Thermal printer size
  
  const { width, height } = page.getSize();
  
  // Use built-in fonts that support Unicode
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let currentY = height - 20;
  const margin = 20;
  const contentWidth = width - (margin * 2);
  
  // Helper function to draw text
  const drawText = (text, x, y, size = 12, isBold = false, align = 'left') => {
    const textWidth = font.widthOfTextAtSize(text, size);
    let finalX = x;
    
    if (align === 'center') {
      finalX = x + (contentWidth - textWidth) / 2;
    } else if (align === 'right') {
      finalX = x + contentWidth - textWidth;
    }
    
    page.drawText(text, {
      x: finalX,
      y,
      size,
      font: isBold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
  };
  
  // Helper function to draw a box
  const drawBox = (x, y, width, height) => {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
  };
  
  // Helper function to draw a dotted line
  const drawDottedLine = (y) => {
    const dashLength = 2;
    const gapLength = 2;
    let currentX = margin;
    
    while (currentX < width - margin) {
      page.drawLine({
        start: { x: currentX, y },
        end: { x: Math.min(currentX + dashLength, width - margin), y },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      currentX += dashLength + gapLength;
    }
  };
  
  // --- Main Ticket Section ---
  
  // Theater Name Box
  const theaterNameHeight = 45;
  drawBox(margin, currentY - theaterNameHeight, contentWidth, theaterNameHeight);
  
  drawText(ticketData.theaterName, margin, currentY - 15, 16, true, 'center');
  drawText(ticketData.location, margin, currentY - 32, 10, false, 'center');
  drawText(`GSTIN:${ticketData.gstin}`, margin, currentY - 45, 8, false, 'center');
  currentY -= theaterNameHeight + 10;
  
  // Date, Showtime, Movie Name
  drawText(`ದಿನಾಂಕ: ${ticketData.date}`, margin, currentY, 10);
  currentY -= 15;
  drawText(`ಮ್ಯಾಟಿನಿ ಶೋ: ${ticketData.showTime}`, margin, currentY, 10);
  currentY -= 15;
  
  // Movie name with word wrapping
  const movieText = `ಚಲನಚಿತ್ರ: ${ticketData.movieName}`;
  const words = movieText.split(' ');
  let currentLine = '';
  let lineY = currentY;
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const testWidth = font.widthOfTextAtSize(testLine, 10);
    
    if (testWidth > contentWidth) {
      if (currentLine) {
        drawText(currentLine, margin, lineY, 10);
        lineY -= 15;
        currentLine = word;
      } else {
        drawText(word, margin, lineY, 10);
        lineY -= 15;
      }
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    drawText(currentLine, margin, lineY, 10);
    lineY -= 15;
  }
  
  currentY = lineY - 5;
  
  // Class and Seat Box
  const classSeatHeight = 35;
  drawBox(margin, currentY - classSeatHeight, contentWidth, classSeatHeight);
  
  drawText(`ವರ್ಗ: ${ticketData.seatClass}`, margin + 5, currentY - 10, 12);
  drawText(`ಸೀಟ್: ${ticketData.seatInfo}`, margin + 5, currentY - 25, 12);
  currentY -= classSeatHeight + 10;
  
  // Tax and Total
  const taxLineHeight = 15;
  drawText(`ನಿವ್ವಳ: ₹${ticketData.net}`, margin, currentY, 8);
  currentY -= taxLineHeight;
  drawText(`ಸಿಜಿಎಸ್ಟಿ: ₹${ticketData.cgst}`, margin, currentY, 8);
  currentY -= taxLineHeight;
  drawText(`ಎಸ್ಜಿಎಸ್ಟಿ: ₹${ticketData.sgst}`, margin, currentY, 8);
  currentY -= taxLineHeight;
  drawText(`ಎಂಸಿ: ₹${ticketData.mc}`, margin, currentY, 8);
  currentY -= taxLineHeight + 5;
  
  // Total Cost Box
  const totalCostHeight = 25;
  drawBox(margin, currentY - totalCostHeight, contentWidth, totalCostHeight);
  
  drawText(`ಒಟ್ಟು: ₹${ticketData.totalAmount}`, margin, currentY - 12, 14, true, 'center');
  currentY -= totalCostHeight + 10;
  
  // Ticket ID and Time in English
  drawText(`S.No: ${ticketData.ticketId} / ${ticketData.currentTime}`, margin, currentY, 8, false, 'center');
  currentY -= 20;
  
  // --- Tear-off Stub Section ---
  drawDottedLine(currentY);
  currentY -= 10;
  
  // Stub - Theater Name
  drawText(ticketData.theaterName, margin, currentY, 10, false, 'center');
  currentY -= 15;
  
  // Stub - Movie Name (simplified)
  drawText(ticketData.movieName.split(' ').slice(0, 3).join(' '), margin, currentY, 8, false, 'center');
  currentY -= 12;
  
  // Stub - Date & Showtime
  drawText(`ದಿನಾಂಕ: ${ticketData.date} | ಮ್ಯಾಟಿನಿ ಶೋ: ${ticketData.showTime}`, margin, currentY, 8, false, 'center');
  currentY -= 12;
  
  // Stub - Class & Seat
  drawText(`ವರ್ಗ: ${ticketData.seatClass} | ಸೀಟ್: ${ticketData.seatInfo}`, margin, currentY, 10, false, 'center');
  currentY -= 15;
  
  // Stub - Tax Breakdown (Horizontal)
  const taxStubWidth = contentWidth / 4;
  drawText(`ನಿವ್ವಳ:₹${ticketData.net}`, margin, currentY, 7, false, 'center');
  drawText(`ಸಿಜಿಎಸ್ಟಿ:₹${ticketData.cgst}`, margin + taxStubWidth, currentY, 7, false, 'center');
  drawText(`ಎಸ್ಜಿಎಸ್ಟಿ:₹${ticketData.sgst}`, margin + taxStubWidth * 2, currentY, 7, false, 'center');
  drawText(`ಎಂಸಿ:₹${ticketData.mc}`, margin + taxStubWidth * 3, currentY, 7, false, 'center');
  currentY -= 12;
  
  // Stub - Total Amount
  drawText(`ಒಟ್ಟು: ₹${ticketData.totalAmount}`, margin, currentY, 12, true, 'center');
  currentY -= 15;
  
  // Stub - Ticket ID in English
  drawText(`S.No: ${ticketData.ticketId}`, margin, currentY, 8, false, 'center');
  
  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  const outputFilePath = path.join(__dirname, 'temp', `test_pdf_lib_kannada_${Date.now()}.pdf`);
  
  if (!fs.existsSync(path.join(__dirname, 'temp'))) {
    fs.mkdirSync(path.join(__dirname, 'temp'));
  }
  
  fs.writeFileSync(outputFilePath, pdfBytes);
  console.log(`PDF generated at: ${outputFilePath}`);
  console.log(`Using pdf-lib with built-in Unicode support`);
}

createPDFTicket(ticketData).catch(console.error);
