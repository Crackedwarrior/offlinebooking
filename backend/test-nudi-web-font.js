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
    }
  });

  const outputFilePath = path.join(__dirname, 'temp', `test_nudi_web_font_${Date.now()}.pdf`);
  if (!fs.existsSync(path.join(__dirname, 'temp'))) {
    fs.mkdirSync(path.join(__dirname, 'temp'));
  }
  doc.pipe(fs.createWriteStream(outputFilePath));

  let currentY = 12;
  const boxWidth = 176;
  const boxX = 55;

  let usedFontName = '';

  // Try to use Nudi web 01 k font first
  try {
    doc.font('Nudi web 01 k');
    usedFontName = 'Nudi web 01 k';
  } catch (e) {
    // Fallback to Anek Kannada if Nudi web 01 k not available
    try {
      doc.font('Anek Kannada');
      usedFontName = 'Anek Kannada';
    } catch (e) {
      // Fallback to Nudi 01 e.ttf if Anek Kannada not available
      try {
        const nudiFontPath = 'C:\\Windows\\Fonts\\Nudi 01 e.ttf';
        doc.font(nudiFontPath);
        usedFontName = nudiFontPath;
      } catch (e) {
        // Final fallback to a standard PDFKit font if all custom fonts fail
        doc.font('Helvetica');
        usedFontName = 'Helvetica (fallback)';
        console.warn('Could not load Nudi web 01 k, Anek Kannada, or Nudi 01 e.ttf. Using Helvetica.');
      }
    }
  }

  console.log(`Using font: ${usedFontName}`);

  // Helper to draw a box
  const drawBox = (y, height) => {
    doc.rect(boxX, y, boxWidth, height).stroke();
  };

  // Helper to draw a dotted line
  const drawDottedLine = (y) => {
    doc.moveTo(boxX, y)
      .lineTo(boxX + boxWidth, y)
      .dash(1, {
        space: 2
      })
      .stroke();
    doc.undash();
  };

  // --- Main Ticket Section ---

  // Theater Name Box
  const theaterNameHeight = 45;
  drawBox(currentY, theaterNameHeight);
  doc.fontSize(16).text(ticketData.theaterName, boxX, currentY + 5, {
    width: boxWidth,
    align: 'center',
    characterSpacing: 1
  });
  doc.fontSize(10).text(ticketData.location, boxX, currentY + 22, {
    width: boxWidth,
    align: 'center'
  });
  doc.fontSize(8).text(`GSTIN:${ticketData.gstin}`, boxX, currentY + 35, {
    width: boxWidth,
    align: 'center'
  });
  currentY += theaterNameHeight + 5;

  // Date, Showtime, Movie Name
  doc.fontSize(10).text(`ದಿನಾಂಕ: ${ticketData.date}`, boxX, currentY);
  currentY += 15;
  doc.fontSize(10).text(`ಮ್ಯಾಟಿನಿ ಶೋ: ${ticketData.showTime}`, boxX, currentY);
  currentY += 15;
  doc.fontSize(10).text(`ಚಲನಚಿತ್ರ: ${ticketData.movieName}`, boxX, currentY, {
    width: boxWidth,
    align: 'left',
    lineGap: 2
  });
  currentY += doc.heightOfString(`ಚಲನಚಿತ್ರ: ${ticketData.movieName}`, {
    width: boxWidth,
    lineGap: 2
  }) + 5;

  // Class and Seat Box
  const classSeatHeight = 35;
  drawBox(currentY, classSeatHeight);
  doc.fontSize(12).text(`ವರ್ಗ: ${ticketData.seatClass}`, boxX + 5, currentY + 5, {
    width: boxWidth - 10
  });
  doc.fontSize(12).text(`ಸೀಟ್: ${ticketData.seatInfo}`, boxX + 5, currentY + 20, {
    width: boxWidth - 10
  });
  currentY += classSeatHeight + 5;

  // Tax and Total
  const taxLineHeight = 15;
  const taxX = boxX + 5;
  const taxValueX = boxX + 5 + 45; // Adjusted for alignment

  doc.fontSize(8).text(`NET : ₹${ticketData.net}`, taxX, currentY);
  currentY += taxLineHeight;
  doc.fontSize(8).text(`CGST: ₹${ticketData.cgst}`, taxX, currentY);
  currentY += taxLineHeight;
  doc.fontSize(8).text(`SGST: ₹${ticketData.sgst}`, taxX, currentY);
  currentY += taxLineHeight;
  doc.fontSize(8).text(`MC  : ₹${ticketData.mc}`, taxX, currentY);
  currentY += taxLineHeight + 5;

  // Total Cost Box
  const totalCostHeight = 25;
  drawBox(currentY, totalCostHeight);
  doc.fontSize(14).text(`ಒಟ್ಟು ವೆಚ್ಚ: ₹${ticketData.totalAmount}`, boxX, currentY + 7, {
    width: boxWidth,
    align: 'center',
    characterSpacing: 0.5
  });
  currentY += totalCostHeight + 5;

  // Ticket ID and Time
  doc.fontSize(8).text(`S.No: ${ticketData.ticketId} / ${ticketData.currentTime}`, boxX, currentY, {
    width: boxWidth,
    align: 'center'
  });
  currentY += 15;

  // --- Tear-off Stub Section ---
  drawDottedLine(currentY);
  currentY += 5;

  const stubY = currentY;
  const stubBoxX = boxX;
  const stubBoxWidth = boxWidth;

  // Stub - Theater Name
  doc.fontSize(10).text(ticketData.theaterName, stubBoxX, stubY, {
    width: stubBoxWidth,
    align: 'center'
  });
  currentY += 15;

  // Stub - Movie Name
  doc.fontSize(8).text(ticketData.movieName, stubBoxX, currentY, {
    width: stubBoxWidth,
    align: 'center',
    lineGap: 1
  });
  currentY += doc.heightOfString(ticketData.movieName, {
    width: stubBoxWidth,
    lineGap: 1
  }) + 5;

  // Stub - Date & Showtime
  doc.fontSize(8).text(`ದಿನಾಂಕ: ${ticketData.date} | ಮ್ಯಾಟಿನಿ ಶೋ: ${ticketData.showTime}`, stubBoxX, currentY, {
    width: stubBoxWidth,
    align: 'center'
  });
  currentY += 12;

  // Stub - Class & Seat
  doc.fontSize(10).text(`ವರ್ಗ: ${ticketData.seatClass} | ಸೀಟ್: ${ticketData.seatInfo}`, stubBoxX, currentY, {
    width: stubBoxWidth,
    align: 'center'
  });
  currentY += 15;

  // Stub - Tax Breakdown (Horizontal)
  const taxStubY = currentY;
  const taxStubWidth = stubBoxWidth / 4;
  doc.fontSize(7).text(`NET:₹${ticketData.net}`, stubBoxX, taxStubY, {
    width: taxStubWidth,
    align: 'center'
  });
  doc.fontSize(7).text(`CGST:₹${ticketData.cgst}`, stubBoxX + taxStubWidth, taxStubY, {
    width: taxStubWidth,
    align: 'center'
  });
  doc.fontSize(7).text(`SGST:₹${ticketData.sgst}`, stubBoxX + taxStubWidth * 2, taxStubY, {
    width: taxStubWidth,
    align: 'center'
  });
  doc.fontSize(7).text(`MC:₹${ticketData.mc}`, stubBoxX + taxStubWidth * 3, taxStubY, {
    width: taxStubWidth,
    align: 'center'
  });
  currentY += 12;

  // Stub - Total Amount
  doc.fontSize(12).text(`ಒಟ್ಟು: ₹${ticketData.totalAmount}`, stubBoxX, currentY, {
    width: stubBoxWidth,
    align: 'center'
  });
  currentY += 15;

  // Stub - Ticket ID
  doc.fontSize(8).text(`S.No: ${ticketData.ticketId}`, stubBoxX, currentY, {
    width: stubBoxWidth,
    align: 'center'
  });

  doc.end();
  console.log(`PDF generated at: ${outputFilePath}`);
  console.log(`Font used for PDF: ${usedFontName}`);
}

createPDFTicket(ticketData);
