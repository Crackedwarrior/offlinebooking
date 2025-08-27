const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Common font names to try for Anek Kannada
const fontNamesToTry = [
  'Anek Kannada',
  'AnekKannada',
  'Anek Kannada Regular',
  'AnekKannada-Regular',
  'Anek Kannada Bold',
  'AnekKannada-Bold',
  'AnekKannada-Regular',
  'AnekKannada-Bold',
  'Anek Kannada Variable',
  'AnekKannada-Variable',
  'Anek Kannada VF',
  'AnekKannada-VF'
];

console.log('Testing font availability for Anek Kannada...\n');

// Create a temporary PDF document to test fonts
const doc = new PDFDocument();

let foundFont = null;

for (const fontName of fontNamesToTry) {
  try {
    doc.font(fontName);
    console.log(`✅ FOUND: "${fontName}"`);
    foundFont = fontName;
    break;
  } catch (error) {
    console.log(`❌ NOT FOUND: "${fontName}"`);
  }
}

if (foundFont) {
  console.log(`\n🎉 Success! Using font: "${foundFont}"`);
  
  // Test with some Kannada text
  try {
    doc.fontSize(16).font(foundFont);
    console.log('✅ Font can be used with PDFKit');
    
    // Create a test PDF
    const testDoc = new PDFDocument();
    const outputPath = path.join(__dirname, 'temp', `anek_test_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(outputPath);
    testDoc.pipe(stream);
    
    testDoc.fontSize(20).font(foundFont);
    testDoc.text('ಶ್ರೀಲೇಖಾ ಥಿಯೇಟರ್', 50, 50);
    testDoc.text('ದಿನಾಂಕ: 06/08/2025', 50, 80);
    testDoc.text('ಚಲನಚಿತ್ರ: ಅವೆಂಜರ್ಸ್', 50, 110);
    testDoc.text('ವರ್ಗ: ಕ್ಲಾಸಿಕ್ ಬಾಲ್ಕನಿ', 50, 140);
    testDoc.text('ಒಟ್ಟು: Rs.300.00', 50, 170);
    
    testDoc.end();
    
    stream.on('finish', () => {
      console.log(`\n📄 Test PDF created: ${outputPath}`);
      console.log('Please open this PDF to verify the Kannada text is displaying correctly.');
    });
    
  } catch (error) {
    console.log('❌ Error using font:', error.message);
  }
} else {
  console.log('\n❌ Anek Kannada font not found with any of the tested names.');
  console.log('\nPossible solutions:');
  console.log('1. Restart your computer after installing the font');
  console.log('2. Check if the font is installed in Windows Fonts folder');
  console.log('3. Try installing the font again');
  
  // List some available fonts
  console.log('\nSome available fonts on your system:');
  const commonFonts = ['Helvetica', 'Times-Roman', 'Courier', 'Arial', 'Times-Bold', 'Helvetica-Bold'];
  for (const font of commonFonts) {
    try {
      doc.font(font);
      console.log(`✅ Available: ${font}`);
    } catch (error) {
      console.log(`❌ Not available: ${font}`);
    }
  }
}
