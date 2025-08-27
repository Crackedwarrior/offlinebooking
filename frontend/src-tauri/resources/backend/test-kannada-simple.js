const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function testKannadaFont() {
  const doc = new PDFDocument({
    size: [400, 600],
    margins: { top: 20, bottom: 20, left: 20, right: 20 }
  });

  const outputPath = path.join(__dirname, 'temp', `kannada_test_${Date.now()}.pdf`);
  if (!fs.existsSync(path.join(__dirname, 'temp'))) {
    fs.mkdirSync(path.join(__dirname, 'temp'));
  }
  doc.pipe(fs.createWriteStream(outputPath));

  let y = 30;
  
  // Test different fonts
  const fonts = [
    'C:\\Windows\\Fonts\\Nudiweb01k.ttf',
    'C:\\Windows\\Fonts\\NUDI UNI 01K.ttf',
    'C:\\Windows\\Fonts\\Nudi 01 e.ttf',
    'Helvetica'
  ];

  fonts.forEach((fontPath, index) => {
    try {
      doc.font(fontPath);
      console.log(`✅ Font loaded: ${fontPath}`);
      
      doc.fontSize(16).text(`Font ${index + 1}: ${path.basename(fontPath)}`, 20, y);
      y += 25;
      
      // Test individual Kannada characters
      const testChars = [
        'ಶ್ರೀಲೇಖಾ', // Theater name
        'ಚಿಕ್ಕಮಗಳೂರು', // Location
        'ದಿನಾಂಕ', // Date
        'ಮ್ಯಾಟಿನಿ ಶೋ', // Matinee Show
        'ಚಲನಚಿತ್ರ', // Film
        'ವರ್ಗ', // Class
        'ಸೀಟ್', // Seat
        'ನಿವ್ವಳ', // Net
        'ಸಿಜಿಎಸ್ಟಿ', // CGST
        'ಎಸ್ಜಿಎಸ್ಟಿ', // SGST
        'ಎಂಸಿ', // MC
        'ಒಟ್ಟು' // Total
      ];
      
      testChars.forEach((char, charIndex) => {
        doc.fontSize(12).text(`${charIndex + 1}. ${char}`, 40, y);
        y += 20;
      });
      
      y += 20; // Space between fonts
      
    } catch (error) {
      console.log(`❌ Font failed: ${fontPath} - ${error.message}`);
      y += 50; // Skip space for failed font
    }
  });

  // Test with Unicode escape sequences
  doc.font('Helvetica').fontSize(14).text('Unicode Test:', 20, y);
  y += 25;
  
  const unicodeTest = [
    '\\u0C36\\u0CCD\\u0CB0\\u0CC0\\u0CB2\\u0CC7\\u0C96\\u0CBE', // ಶ್ರೀಲೇಖಾ
    '\\u0C9A\\u0CBF\\u0C95\\u0CCD\\u0C95\\u0CAE\\u0C97\\u0CB3\\u0CC2\\u0CB0\\u0CC1' // ಚಿಕ್ಕಮಗಳೂರು
  ];
  
  unicodeTest.forEach((unicode, index) => {
    const decoded = eval(`"${unicode}"`);
    doc.fontSize(12).text(`${index + 1}. Unicode: ${decoded}`, 40, y);
    y += 20;
  });

  doc.end();
  console.log(`PDF generated: ${outputPath}`);
}

testKannadaFont();
