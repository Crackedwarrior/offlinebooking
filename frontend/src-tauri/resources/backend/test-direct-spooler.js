// Test direct Windows Print Spooler API (like browser Ctrl+P)
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

function testDirectSpooler() {
  console.log('🖨️ Testing Direct Windows Print Spooler API...\n');
  
  try {
    // Create ticket content
    const content = createTicketContent();
    
    console.log('📄 Ticket Content Preview:');
    console.log('='.repeat(60));
    console.log(content);
    console.log('='.repeat(60));
    
    // Create ticket file
    const ticketFile = path.join(__dirname, 'temp', `direct_spooler_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, content);
    console.log(`\n💾 Ticket file created: ${ticketFile}`);
    
    // Method 1: Use Windows Print Spooler API directly (like browser)
    console.log('\n🔄 Printing via Direct Windows Print Spooler API...');
    
    // Use the actual Windows Print Spooler API that browsers use
    // This is different from PowerShell's Out-Printer
    const command = `cmd /c "print /d:\"EPSON TM-T81\" \"${ticketFile}\""`;
    
    console.log(`Command: ${command}`);
    execSync(command, { stdio: 'inherit' });
    
    console.log('\n✅ Direct Windows Print Spooler API command executed!');
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
    
    // Fallback: Try alternative Windows Print Spooler method
    console.log('\n🔄 Trying alternative Windows Print Spooler method...');
    try {
      const content = createTicketContent();
      const ticketFile = path.join(__dirname, 'temp', `alt_spooler_${Date.now()}.txt`);
      fs.writeFileSync(ticketFile, content);
      
      // Alternative: Use Windows Print Spooler API through different method
      const altCommand = `powershell -Command "Add-Type -AssemblyName System.Printing; $printer = New-Object System.Printing.PrintServer; $printer.DefaultPrintQueue.AddJob('${ticketFile}')"`;
      execSync(altCommand, { stdio: 'inherit' });
      
      console.log('✅ Alternative Windows Print Spooler method executed!');
      
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

testDirectSpooler();
