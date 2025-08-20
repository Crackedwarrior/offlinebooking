// Test Windows print command with correct printer name
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createTicketContent() {
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

function testPrintFixed() {
  console.log('🖨️ Testing Windows Print Command (Fixed)...\n');
  
  try {
    // Create ticket content
    const content = createTicketContent();
    
    console.log('📄 Ticket Content Preview:');
    console.log('='.repeat(60));
    console.log(content);
    console.log('='.repeat(60));
    
    // Create ticket file
    const ticketFile = path.join(__dirname, 'temp', `print_fixed_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, content);
    console.log(`\n💾 Ticket file created: ${ticketFile}`);
    
    // Method 1: Use Windows print command with correct syntax
    console.log('\n🔄 Printing via Windows Print Command...');
    
    // Use Windows print command with proper escaping
    const command = `print "${ticketFile}" /d:"EPSON TM-T81"`;
    
    console.log(`Command: ${command}`);
    execSync(command, { stdio: 'inherit' });
    
    console.log('\n✅ Windows Print Command executed!');
    console.log('📄 Check your printer - this should use FULL WIDTH like browser printing!');
    console.log('\n🔍 What to look for:');
    console.log('   • Full paper width utilization (like browser Ctrl+P)');
    console.log('   • Proper ticket formatting and alignment');
    console.log('   • Professional appearance');
    console.log('   • Text spanning the entire width');
    
    // Clean up after a delay
    setTimeout(() => {
      if (fs.existsSync(ticketFile)) {
        fs.unlinkSync(ticketFile);
        console.log('\n🧹 Ticket file cleaned up');
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Fallback: Try with different syntax
    console.log('\n🔄 Trying alternative syntax...');
    try {
      const content = createTicketContent();
      const ticketFile = path.join(__dirname, 'temp', `alt_print_${Date.now()}.txt`);
      fs.writeFileSync(ticketFile, content);
      
      // Alternative: Use cmd with different syntax
      const altCommand = `cmd /c print "${ticketFile}" /d:"EPSON TM-T81"`;
      execSync(altCommand, { stdio: 'inherit' });
      
      console.log('✅ Alternative print command executed!');
      
      setTimeout(() => {
        if (fs.existsSync(ticketFile)) {
          fs.unlinkSync(ticketFile);
        }
      }, 5000);
      
    } catch (altError) {
      console.error('❌ Alternative method also failed:', altError.message);
    }
  }
}

testPrintFixed();
