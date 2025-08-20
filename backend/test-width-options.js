// Test different paper widths to find optimal setting
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testWidthOptions() {
  console.log('📏 Testing Different Paper Widths...\n');
  
  try {
    // First compile the TypeScript
    console.log('🔧 Compiling TypeScript...');
    execSync('npx tsc src/thermalPrintService.ts --outDir dist --esModuleInterop --target es2017 --module commonjs', { stdio: 'inherit' });
    
    // Import the compiled service
    const ThermalPrintService = require('./dist/thermalPrintService').default;
    const thermalService = new ThermalPrintService();
    
    // Test different widths
    const widths = [32, 36, 40, 42, 44, 48, 52, 56];
    
    for (const width of widths) {
      console.log(`\n📏 Testing width: ${width} characters`);
      
      // Create a simple test content with the specified width
      const testContent = createTestContent(width);
      
      console.log('Preview:');
      console.log('='.repeat(width));
      console.log(testContent);
      console.log('='.repeat(width));
      
      // Create test file
      const testFile = path.join(__dirname, 'temp', `width_test_${width}_${Date.now()}.txt`);
      fs.writeFileSync(testFile, testContent);
      
      // Print test
      console.log(`🖨️ Printing width test ${width}...`);
      const printCommand = `powershell -Command "Get-Content '${testFile}' | Out-Printer -Name 'EPSON TM-T81'"`;
      
      try {
        execSync(printCommand, { stdio: 'inherit' });
        console.log(`✅ Width ${width} printed successfully`);
        console.log('📄 Check your printer - does this width look correct?');
        
        // Ask user if this width looks good
        console.log(`\n❓ Does width ${width} look correct? (y/n)`);
        console.log('   If yes, we can use this width for your tickets');
        console.log('   If no, we\'ll try the next width');
        
      } catch (printError) {
        console.log(`❌ Width ${width} failed: ${printError.message}`);
      }
      
      // Clean up
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      
      // Wait a moment between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function createTestContent(width) {
  const centerText = (text, w) => {
    const padding = Math.max(0, Math.floor((w - text.length) / 2));
    return ' '.repeat(padding) + text;
  };
  
  const fullWidthLine = (char, w) => char.repeat(w);
  
  const justifyText = (text, w) => {
    if (text.length >= w) return text.substring(0, w);
    
    const words = text.split(' ');
    if (words.length <= 1) return text;
    
    const totalSpaces = w - text.length;
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
  
  const lines = [
    '',
    centerText('SREELEKHA THEATER', width),
    centerText('Chickmagalur', width),
    centerText('GSTIN: 29AAVFS7423E120', width),
    '',
    fullWidthLine('=', width),
    justifyText(`Movie: KALANK`, width),
    justifyText(`Date: 20/8/2025`, width),
    justifyText(`Time: 6:00 PM`, width),
    justifyText(`Screen: Screen 1`, width),
    '',
    justifyText(`Seats: A-1 (₹100)`, width),
    justifyText(`        A-2 (₹100)`, width),
    '',
    fullWidthLine('=', width),
    centerText(`Total: ₹200`, width),
    '',
    centerText('Thank you for visiting!', width),
    centerText('Enjoy your movie!', width),
    '',
    fullWidthLine('=', width),
    ''
  ];
  
  return lines.join('\n');
}

testWidthOptions();
