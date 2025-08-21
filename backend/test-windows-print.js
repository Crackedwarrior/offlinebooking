// Test Windows Print Command
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createTicketContent() {
  // Create formatted ticket content optimized for 80mm thermal paper
  const content = `
                    SREELEKHA THEATER
                       Chickmagalur
                  GSTIN: 29AAVFS7423E120

================================================
Movie:                                    KALANK
Date:                                  20/8/2025
Time:                               6:00 PM
Screen:                             Screen 1

Seats:
  A-1 (₹100)
  A-2 (₹100)
  B-5 (₹120)
  B-6 (₹120)

================================================
                                        Total: ₹440

         Thank you for visiting!
            Enjoy your movie!

================================================
      `;
  
  return content;
}

function testWindowsPrint() {
  console.log('🖨️ Testing Windows Print Command...\n');
  
  try {
    // Create ticket content
    const ticketContent = createTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `windows_print_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Method 1: Try Windows print command
    console.log('\n🔄 Testing Windows print command...');
    try {
      // Use the Windows print command which should print the actual file
      const printCommand = `print "${ticketFile}"`;
      console.log(`Command: ${printCommand}`);
      execSync(printCommand, { stdio: 'inherit' });
      console.log('✅ Windows print command executed!');
      console.log('📄 This should print the actual ticket content');
    } catch (printError) {
      console.log('❌ Windows print failed, trying PowerShell...');
      
      // Method 2: Try PowerShell with different approach
      try {
        const psCommand = `powershell -Command "Get-Content '${ticketFile}' | Out-Printer -Name 'EPSON TM-T81'"`;
        console.log(`Command: ${psCommand}`);
        execSync(psCommand, { stdio: 'inherit' });
        console.log('✅ PowerShell print executed!');
        console.log('📄 This should print the actual ticket content (narrow width)');
      } catch (psError) {
        console.log('❌ Both methods failed');
        console.log(`\n📄 Ticket file created: ${ticketFile}`);
        console.log('🖨️ Please open the file and try Ctrl+P manually');
      }
    }
    
    // Keep file for manual testing
    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWindowsPrint();
