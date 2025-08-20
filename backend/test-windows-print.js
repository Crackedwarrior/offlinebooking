// Test Windows Print Spooler API (like browser Ctrl+P)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createFormattedContent() {
  // Create content with proper formatting that Windows print spooler can handle
  const content = [
    '',
    '                    SREELEKHA THEATER',
    '                       Chickmagalur',
    '                  GSTIN: 29AAVFS7423E120',
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

function testWindowsPrint() {
  console.log('🖨️ Testing Windows Print Spooler API (Browser-style)...\n');
  
  try {
    // Create formatted content
    const content = createFormattedContent();
    
    console.log('📄 Formatted Content Preview:');
    console.log('='.repeat(60));
    console.log(content);
    console.log('='.repeat(60));
    
    // Create test file
    const testFile = path.join(__dirname, 'temp', `windows_print_${Date.now()}.txt`);
    fs.writeFileSync(testFile, content);
    console.log(`\n💾 Test file created: ${testFile}`);
    
    // Method 1: Use Windows Print Spooler directly (like browser)
    console.log('\n🔄 Printing via Windows Print Spooler...');
    
    // Use rundll32 to print (this is what Windows uses internally)
    const command = `rundll32 printui.dll,PrintUIEntry /k /n "EPSON TM-T81" "${testFile}"`;
    
    console.log(`Command: ${command}`);
    execSync(command, { stdio: 'inherit' });
    
    console.log('\n✅ Windows Print Spooler command executed!');
    console.log('📄 Check your printer - this should use FULL WIDTH like browser printing!');
    console.log('\n🔍 What to look for:');
    console.log('   • Full paper width utilization (like browser Ctrl+P)');
    console.log('   • Proper formatting and alignment');
    console.log('   • Professional appearance');
    console.log('   • Text spanning the entire width');
    
    // Clean up after a delay
    setTimeout(() => {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
        console.log('\n🧹 Test file cleaned up');
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Fallback: Try the working method but with better formatting
    console.log('\n🔄 Trying fallback with better formatting...');
    try {
      const content = createFormattedContent();
      const testFile = path.join(__dirname, 'temp', `fallback_${Date.now()}.txt`);
      fs.writeFileSync(testFile, content);
      
      const fallbackCommand = `powershell -Command "Get-Content '${testFile}' | Out-Printer -Name 'EPSON TM-T81'"`;
      execSync(fallbackCommand, { stdio: 'inherit' });
      
      console.log('✅ Fallback print executed!');
      
      setTimeout(() => {
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }, 5000);
      
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
    }
  }
}

testWindowsPrint();
