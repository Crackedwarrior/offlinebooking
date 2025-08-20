// Test raw printing using Windows API
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createRawContent() {
  // Simple text content with proper spacing for thermal printer
  const content = [
    '',
    '           SREELEKHA THEATER',
    '              Chickmagalur',
    '         GSTIN: 29AAVFS7423E120',
    '',
    '================================================',
    'Movie:                                    KALANK',
    'Date:                                  20/8/2025',
    'Time:                               6:00 PM',
    'Screen:                             Screen 1',
    '',
    'Seats:',
    '  A-1 (₹100)',
    '  A-2 (₹100)',
    '  B-5 (₹120)',
    '  B-6 (₹120)',
    '',
    '================================================',
    '                                        Total: ₹440',
    '',
    '         Thank you for visiting!',
    '            Enjoy your movie!',
    '',
    '================================================',
    ''
  ].join('\n');
  
  return content;
}

function testRawPrint() {
  console.log('🖨️ Testing Raw Printing Method...\n');
  
  try {
    // Create content with proper spacing
    const content = createRawContent();
    
    console.log('📄 Raw Content Preview:');
    console.log('='.repeat(60));
    console.log(content);
    console.log('='.repeat(60));
    
    // Create test file
    const testFile = path.join(__dirname, 'temp', `raw_${Date.now()}.txt`);
    fs.writeFileSync(testFile, content);
    console.log(`\n💾 Raw file created: ${testFile}`);
    
    // Try different printing methods
    const methods = [
      {
        name: 'Method 1: Direct Out-Printer',
        command: `powershell -Command "Get-Content '${testFile}' | Out-Printer -Name 'EPSON TM-T81'"`
      },
      {
        name: 'Method 2: Start-Process Print',
        command: `powershell -Command "Start-Process -FilePath '${testFile}' -Verb Print"`
      },
      {
        name: 'Method 3: Copy to printer',
        command: `powershell -Command "Copy-Item '${testFile}' -Destination 'EPSON TM-T81'"`
      }
    ];
    
    for (const method of methods) {
      console.log(`\n🔄 Trying ${method.name}...`);
      try {
        execSync(method.command, { stdio: 'inherit' });
        console.log(`✅ ${method.name} executed successfully`);
        console.log('📄 Check your printer for output!');
        console.log('\n🔍 This should show:');
        console.log('   • Properly spaced text');
        console.log('   • Better width utilization');
        console.log('   • Clean formatting');
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

testRawPrint();
