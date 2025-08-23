const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function debugFonts() {
  console.log('🔍 Debugging Nudi fonts...\n');
  
  const nudiFonts = [
    'C:\\Windows\\Fonts\\Nudiweb01k.ttf',
    'C:\\Windows\\Fonts\\NUDI UNI 01K.ttf', 
    'C:\\Windows\\Fonts\\NudiUni01k.ttf',
    'C:\\Windows\\Fonts\\Nudi 01 e.ttf',
    'C:\\Windows\\Fonts\\NUDI UNI 01E.ttf'
  ];
  
  nudiFonts.forEach(fontPath => {
    console.log(`📁 Checking: ${path.basename(fontPath)}`);
    
    // Check if file exists
    if (!fs.existsSync(fontPath)) {
      console.log(`   ❌ File does not exist`);
      return;
    }
    
    // Get file stats
    const stats = fs.statSync(fontPath);
    console.log(`   📏 Size: ${stats.size} bytes`);
    console.log(`   📅 Modified: ${stats.mtime}`);
    
    // Try to load with PDFKit
    try {
      const doc = new PDFDocument();
      doc.font(fontPath);
      console.log(`   ✅ PDFKit can load this font`);
    } catch (error) {
      console.log(`   ❌ PDFKit error: ${error.message}`);
    }
    
    console.log('');
  });
  
  // Test with a simple PDF
  console.log('🖨️ Creating test PDF with working fonts...');
  
  const doc = new PDFDocument({
    size: [400, 800],
    margins: { top: 20, bottom: 20, left: 20, right: 20 }
  });
  
  const outputPath = path.join(__dirname, 'temp', `font_debug_${Date.now()}.pdf`);
  if (!fs.existsSync(path.join(__dirname, 'temp'))) {
    fs.mkdirSync(path.join(__dirname, 'temp'));
  }
  doc.pipe(fs.createWriteStream(outputPath));
  
  let y = 30;
  
  // Test only the fonts that PDFKit can load
  const workingFonts = [
    'C:\\Windows\\Fonts\\Nudi 01 e.ttf',
    'C:\\Windows\\Fonts\\NUDI UNI 01E.ttf'
  ];
  
  workingFonts.forEach((fontPath, index) => {
    try {
      doc.font(fontPath);
      console.log(`✅ Using font: ${path.basename(fontPath)}`);
      
      doc.fontSize(16).text(`Font ${index + 1}: ${path.basename(fontPath)}`, 20, y);
      y += 25;
      
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
        doc.fontSize(12).text(`${textIndex + 1}. ${text}`, 40, y);
        y += 20;
      });
      
      y += 30; // Space between fonts
      
    } catch (error) {
      console.log(`❌ Error with font: ${error.message}`);
    }
  });
  
  doc.end();
  console.log(`📄 Test PDF generated: ${outputPath}`);
}

debugFonts();
