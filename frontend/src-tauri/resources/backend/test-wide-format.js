// Test wide format printing to force full width usage
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createWideTicketContent() {
  // Use wider character spacing to force printer to use more width
  const content = [
    '',
    '                        SREELEKHA THEATER',
    '                           Chickmagalur',
    '                      GSTIN: 29AAVFS7423E120',
    '',
    '========================================================',
    'Movie:                                          KALANK',
    'Date:                                        20/8/2025',
    'Time:                                     6:00 PM',
    'Screen:                                   Screen 1',
    '',
    'Seats:',
    '    A-1 (₹100)',
    '    A-2 (₹100)',
    '    B-5 (₹120)',
    '    B-6 (₹120)',
    '',
    '========================================================',
    '                                              Total: ₹440',
    '',
    '             Thank you for visiting!',
    '                Enjoy your movie!',
    '',
    '========================================================',
    ''
  ].join('\n');
  
  return content;
}

function testWideFormat() {
  console.log('🖨️ Testing Wide Format Printing...\n');
  
  try {
    // Create wide ticket content
    const content = createWideTicketContent();
    
    console.log('📄 Wide Ticket Content Preview:');
    console.log('='.repeat(70));
    console.log(content);
    console.log('='.repeat(70));
    
    // Create ticket file
    const ticketFile = path.join(__dirname, 'temp', `wide_format_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, content);
    console.log(`\n💾 Wide ticket file created: ${ticketFile}`);
    
    // Use the working PowerShell method but with wide content
    console.log('\n🔄 Printing wide format via PowerShell...');
    
    const command = `powershell -Command "Get-Content '${ticketFile}' | Out-Printer -Name 'EPSON TM-T81'"`;
    
    console.log(`Command: ${command}`);
    execSync(command, { stdio: 'inherit' });
    
    console.log('\n✅ Wide format print executed!');
    console.log('📄 Check your printer - this should use MORE width!');
    console.log('\n🔍 What to look for:');
    console.log('   • Wider character spacing');
    console.log('   • More width utilization');
    console.log('   • Text extending further across the paper');
    console.log('   • Better overall width coverage');
    
    // Clean up after a delay
    setTimeout(() => {
      if (fs.existsSync(ticketFile)) {
        fs.unlinkSync(ticketFile);
        console.log('\n🧹 Wide ticket file cleaned up');
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWideFormat();
