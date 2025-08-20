// Test Windows Print Spooler API with actual ticket data
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

function testSpoolerTicket() {
  console.log('🖨️ Testing Windows Print Spooler API with Ticket Data...\n');
  
  try {
    // Create ticket content
    const content = createTicketContent();
    
    console.log('📄 Ticket Content Preview:');
    console.log('='.repeat(60));
    console.log(content);
    console.log('='.repeat(60));
    
    // Create ticket file
    const ticketFile = path.join(__dirname, 'temp', `spooler_ticket_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, content);
    console.log(`\n💾 Ticket file created: ${ticketFile}`);
    
    // Method 1: Use Windows Print Spooler API with our data
    console.log('\n🔄 Printing via Windows Print Spooler API...');
    
    // Use the Windows Print Spooler API that gives full width
    const command = `powershell -Command "Get-Content '${ticketFile}' | Out-Printer -Name 'EPSON TM-T81'"`;
    
    console.log(`Command: ${command}`);
    execSync(command, { stdio: 'inherit' });
    
    console.log('\n✅ Windows Print Spooler API command executed!');
    console.log('📄 Check your printer - this should use FULL WIDTH!');
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
  }
}

testSpoolerTicket();
