// Direct width test with 56 characters
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createTestContent56() {
  const PAPER_WIDTH = 56; // Direct 56-character width
  
  // Helper functions
  const centerText = (text) => {
    const padding = Math.max(0, Math.floor((PAPER_WIDTH - text.length) / 2));
    return ' '.repeat(padding) + text;
  };
  
  const fullWidthLine = (char = '=') => char.repeat(PAPER_WIDTH);
  
  const justifyText = (text) => {
    if (text.length >= PAPER_WIDTH) return text.substring(0, PAPER_WIDTH);
    
    const words = text.split(' ');
    if (words.length <= 1) return text;
    
    const totalSpaces = PAPER_WIDTH - text.length;
    const gaps = words.length - 1;
    const spacesPerGap = Math.floor(totalSpaces / gaps);
    const extraSpaces = totalSpaces % gaps;
    
    let result = words[0];
    for (let i = 1; i < words.length; i++) {
      const spaces = spacesPerGap + (i <= extraSpaces ? 1 : 0);
      result += ' '.repeat(spaces) + words[i];
    }
    
    return result;
  };
  
  const rightAlign = (text) => {
    const padding = Math.max(0, PAPER_WIDTH - text.length);
    return ' '.repeat(padding) + text;
  };
  
  const lines = [
    '',
    centerText('SREELEKHA THEATER'),
    centerText('Chickmagalur'),
    centerText('GSTIN: 29AAVFS7423E120'),
    '',
    fullWidthLine('='),
    justifyText('Movie: KALANK'),
    justifyText('Date: 20/8/2025'),
    justifyText('Time: 6:00 PM'),
    justifyText('Screen: Screen 1'),
    '',
    justifyText('Seats:'),
    justifyText('  A-1 (₹100)'),
    justifyText('  A-2 (₹100)'),
    justifyText('  B-5 (₹120)'),
    justifyText('  B-6 (₹120)'),
    '',
    fullWidthLine('='),
    rightAlign('Total: ₹440'),
    '',
    centerText('Thank you for visiting!'),
    centerText('Enjoy your movie!'),
    '',
    fullWidthLine('='),
    ''
  ];
  
  return lines.join('\n');
}

function testDirect56() {
  console.log('📏 Testing Direct 56-Character Width...\n');
  
  try {
    // Create content with exactly 56 characters width
    const content = createTestContent56();
    
    console.log('📄 56-Character Width Preview:');
    console.log('='.repeat(60)); // Slightly longer line to show boundary
    console.log(content);
    console.log('='.repeat(60));
    
    // Count characters in each line to verify
    const lines = content.split('\n');
    console.log('\n📐 Line length verification:');
    lines.forEach((line, index) => {
      if (line.trim().length > 0) {
        console.log(`Line ${index + 1}: ${line.length} characters`);
      }
    });
    
    // Create test file
    const testFile = path.join(__dirname, 'temp', `direct_56_${Date.now()}.txt`);
    fs.writeFileSync(testFile, content);
    console.log(`\n💾 Test file created: ${testFile}`);
    
    // Print the ticket
    console.log('\n🖨️ Printing 56-character width ticket...');
    const printCommand = `powershell -Command "Get-Content '${testFile}' | Out-Printer -Name 'EPSON TM-T81'"`;
    
    try {
      execSync(printCommand, { stdio: 'inherit' });
      console.log('\n✅ 56-character width ticket printed successfully!');
      console.log('📄 Check your printer - this should now use the FULL WIDTH of the paper');
      console.log('\n🔍 Compare this printout with the previous one:');
      console.log('   • Should be much wider');
      console.log('   • Text should span edge-to-edge');
      console.log('   • Lines should look fuller');
      
    } catch (printError) {
      console.log('\n❌ Print failed:', printError.message);
    }
    
    // Clean up
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
      console.log('\n🧹 Test file cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDirect56();
