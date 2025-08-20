// Test with ESC/POS commands to control actual print width
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createEscPosContent() {
  // ESC/POS commands for thermal printers
  const ESC = '\x1B';
  const GS = '\x1D';
  
  // Font and width commands
  const INIT = ESC + '@';                    // Initialize printer
  const FONT_A = ESC + 'M' + '\x00';         // Font A (12x24)
  const FONT_B = ESC + 'M' + '\x01';         // Font B (9x17) - smaller, fits more characters
  const DOUBLE_WIDTH = GS + '!' + '\x10';    // Double width
  const DOUBLE_HEIGHT = GS + '!' + '\x01';   // Double height
  const NORMAL_SIZE = GS + '!' + '\x00';     // Normal size
  const CENTER = ESC + 'a' + '\x01';         // Center alignment
  const LEFT = ESC + 'a' + '\x00';           // Left alignment
  const RIGHT = ESC + 'a' + '\x02';          // Right alignment
  const BOLD_ON = ESC + 'E' + '\x01';        // Bold on
  const BOLD_OFF = ESC + 'E' + '\x00';       // Bold off
  const CUT = GS + 'V' + '\x41' + '\x03';    // Cut paper
  const FEED = '\n';
  
  // Build the ticket content with ESC/POS commands
  const content = [
    INIT,                                      // Initialize
    FONT_B,                                    // Use smaller font for more characters per line
    CENTER,                                    // Center alignment
    BOLD_ON,
    'SREELEKHA THEATER',
    BOLD_OFF,
    FEED,
    'Chickmagalur',
    FEED,
    'GSTIN: 29AAVFS7423E120',
    FEED + FEED,
    
    LEFT,                                      // Left alignment for content
    '='.repeat(48),                           // Full width separator (48 chars for Font B)
    FEED,
    
    'Movie: KALANK                        ',  // Padded to full width
    FEED,
    'Date: 20/8/2025                      ',
    FEED,
    'Time: 6:00 PM                        ',
    FEED,
    'Screen: Screen 1                     ',
    FEED + FEED,
    
    'Seats:',
    FEED,
    '  A-1 (₹100)                        ',
    FEED,
    '  A-2 (₹100)                        ',
    FEED,
    '  B-5 (₹120)                        ',
    FEED,
    '  B-6 (₹120)                        ',
    FEED + FEED,
    
    '='.repeat(48),
    FEED,
    
    RIGHT,                                     // Right alignment for total
    'Total: ₹440',
    FEED + FEED,
    
    CENTER,                                    // Center for footer
    'Thank you for visiting!',
    FEED,
    'Enjoy your movie!',
    FEED + FEED,
    
    LEFT,
    '='.repeat(48),
    FEED + FEED + FEED,
    
    CUT                                        // Cut the paper
  ].join('');
  
  return content;
}

function testEscPosWidth() {
  console.log('🖨️ Testing ESC/POS Commands for Full Width...\n');
  
  try {
    // Create content with ESC/POS commands
    const content = createEscPosContent();
    
    console.log('📄 ESC/POS Content Preview (showing commands):');
    console.log('='.repeat(60));
    // Show a readable version without control characters
    const readable = content
      .replace(/\x1B/g, '[ESC]')
      .replace(/\x1D/g, '[GS]')
      .replace(/\x00/g, '[0]')
      .replace(/\x01/g, '[1]')
      .replace(/\x02/g, '[2]');
    console.log(readable.substring(0, 500) + '...');
    console.log('='.repeat(60));
    
    // Create test file
    const testFile = path.join(__dirname, 'temp', `escpos_${Date.now()}.txt`);
    fs.writeFileSync(testFile, content, 'binary');
    console.log(`\n💾 ESC/POS file created: ${testFile}`);
    
    // Print using raw mode
    console.log('\n🖨️ Printing with ESC/POS commands...');
    
    // Try different printing methods for raw ESC/POS
    const methods = [
      {
        name: 'Method 1: Copy to printer port',
        command: `powershell -Command "Get-Content '${testFile}' -Raw -Encoding Byte | Set-Content -Path 'ESDPRT001' -Encoding Byte"`
      },
      {
        name: 'Method 2: Print as raw text',
        command: `powershell -Command "Get-Content '${testFile}' -Raw | Out-Printer -Name 'EPSON TM-T81'"`
      }
    ];
    
    for (const method of methods) {
      console.log(`\n🔄 Trying ${method.name}...`);
      try {
        execSync(method.command, { stdio: 'inherit' });
        console.log(`✅ ${method.name} executed successfully`);
        console.log('📄 Check your printer - this should use ACTUAL full width!');
        console.log('\n🔍 What to look for:');
        console.log('   • Much wider text');
        console.log('   • Smaller font (more characters per line)');
        console.log('   • Proper thermal printer formatting');
        console.log('   • Full paper width utilization');
        break;
      } catch (error) {
        console.log(`❌ ${method.name} failed: ${error.message}`);
      }
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

testEscPosWidth();
