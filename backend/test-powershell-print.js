// Test PowerShell Print Method
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

function testPowerShellPrint() {
  console.log('🖨️ Testing PowerShell Print Method...\n');
  
  try {
    // Create ticket content
    const ticketContent = createTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `powershell_test_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Method 1: Try PowerShell Out-Printer
    console.log('\n🔄 Printing with PowerShell Out-Printer...');
    try {
      const printCommand = `powershell -Command "Get-Content '${ticketFile}' | Out-Printer -Name 'EPSON TM-T81'"`;
      execSync(printCommand, { stdio: 'inherit' });
      console.log('✅ PowerShell print executed!');
      console.log('📄 Check your printer for the actual ticket content');
    } catch (psError) {
      console.log('❌ PowerShell failed, trying alternative...');
      
      // Method 2: Try with different printer name
      try {
        const printCommand2 = `powershell -Command "Get-Content '${ticketFile}' | Out-Printer -Name 'EPSON TM-T81 ReceiptE4'"`;
        execSync(printCommand2, { stdio: 'inherit' });
        console.log('✅ PowerShell print with full name executed!');
        console.log('📄 Check your printer for the actual ticket content');
      } catch (psError2) {
        console.log('❌ Both PowerShell methods failed');
        console.log(`\n📄 Ticket file created: ${ticketFile}`);
        console.log('🖨️ Please open the file and print manually (Ctrl+P)');
      }
    }
    
    // Clean up file after delay
    setTimeout(() => {
      if (fs.existsSync(ticketFile)) {
        fs.unlinkSync(ticketFile);
        console.log('🧹 Ticket file cleaned up');
      }
    }, 15000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPowerShellPrint();
