const PDFDocument = require('pdfkit');
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

function createPDFTicket(ticketData) {
  // Create a new PDF document
  const doc = new PDFDocument({
    size: [400, 800],
    margins: { top: 20, bottom: 20, left: 20, right: 20 }
  });

  const outputFilePath = path.join(__dirname, 'temp', `test_system_fonts_${Date.now()}.pdf`);
  if (!fs.existsSync(path.join(__dirname, 'temp'))) {
    fs.mkdirSync(path.join(__dirname, 'temp'));
  }
  doc.pipe(fs.createWriteStream(outputFilePath));

  let currentY = 30;
  
  // Test different system fonts that might support Kannada
  const systemFonts = [
    'Arial Unicode MS',
    'Segoe UI',
    'Calibri',
    'Times New Roman',
    'Tahoma',
    'Verdana',
    'Microsoft Sans Serif',
    'Arial',
    'Helvetica'
  ];

  systemFonts.forEach((fontName, index) => {
    try {
      doc.font(fontName);
      console.log(`✅ Testing font: ${fontName}`);
      
      doc.fontSize(16).text(`Font ${index + 1}: ${fontName}`, 20, currentY);
      currentY += 25;
      
      // Test Kannada text
      const kannadaText = [
        'ಶ್ರೀಲೇಖಾ ಥಿಯೇಟರ್',
        'ಚಿಕ್ಕಮಗಳೂರು', 
        'ದಿನಾಂಕ: 06/08/2025',
        'ಮ್ಯಾಟಿನಿ ಶೋ: 02:45PM',
        'ಚಲನಚಿತ್ರ: ಅವೆಂಜರ್ಸ್ ಇನ್ಫಿನಿಟಿ ವಾರ್',
        'ವರ್ಗ: ಕ್ಲಾಸಿಕ್ ಬಾಲ್ಕನಿ',
        'ಸೀಟ್: A 15-16 (2)',
        'ನಿವ್ವಳ: ₹250.24',
        'ಸಿಜಿಎಸ್ಟಿ: ₹22.88',
        'ಎಸ್ಜಿಎಸ್ಟಿ: ₹22.88',
        'ಎಂಸಿ: ₹4.00',
        'ಒಟ್ಟು: ₹300.00'
      ];
      
      kannadaText.forEach((text, textIndex) => {
        doc.fontSize(12).text(`${textIndex + 1}. ${text}`, 40, currentY);
        currentY += 20;
      });
      
      currentY += 30; // Space between fonts
      
    } catch (error) {
      console.log(`❌ Font failed: ${fontName} - ${error.message}`);
      currentY += 50; // Skip space for failed font
    }
  });

  doc.end();
  console.log(`PDF generated at: ${outputFilePath}`);
}

createPDFTicket(ticketData);
