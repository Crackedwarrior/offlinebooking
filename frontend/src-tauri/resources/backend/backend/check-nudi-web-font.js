const PDFDocument = require('pdfkit');

console.log('Checking for Nudi web 01 k font availability...\n');

// Create a temporary PDF document to test fonts
const doc = new PDFDocument();

const fontsToTest = [
  'Nudi web 01 k',
  'Nudi web 01 k (TrueType)',
  'Nudi web 01 k Regular',
  'Anek Kannada',
  'AnekKannada',
  'C:\\Windows\\Fonts\\Nudi 01 e.ttf'
];

let foundFont = null;

for (const fontName of fontsToTest) {
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
  console.log(`\n🎉 Success! Found font: "${foundFont}"`);
  console.log('This font can be used for Kannada text in your tickets.');
} else {
  console.log('\n❌ None of the tested fonts were found.');
  console.log('\nPossible solutions:');
  console.log('1. Restart your computer after installing the font');
  console.log('2. Check if the font installation completed successfully');
  console.log('3. Try installing the font again');
}

console.log('\nThe latest PDF was generated using: C:\\Windows\\Fonts\\Nudi 01 e.ttf');
console.log('Please open the PDF to check if the Kannada text is displaying correctly.');
