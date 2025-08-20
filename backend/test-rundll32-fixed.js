// Test Rundll32 Fixed Method
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

function testRundll32Fixed() {
  console.log('🖨️ Testing Rundll32 Fixed Method...\n');
  
  try {
    // Create ticket content
    const ticketContent = createTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `rundll32_fixed_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Method 1: Try rundll32 to trigger Windows print dialog
    console.log('\n🔄 Triggering Windows print dialog with rundll32...');
    try {
      const rundllCommand = `rundll32 printui.dll,PrintUIEntry /k /n "EPSON TM-T81" "${ticketFile}"`;
      execSync(rundllCommand, { stdio: 'inherit' });
      console.log('✅ Rundll32 print dialog triggered!');
      console.log('📄 Print dialog should have opened with your ticket content');
      console.log('📄 Please click Print to get full-width output');
    } catch (rundllError) {
      console.log('❌ Rundll32 failed, trying alternative...');
      
      // Method 2: Try with different printer name
      try {
        const rundllCommand2 = `rundll32 printui.dll,PrintUIEntry /k /n "EPSON TM-T81 ReceiptE4" "${ticketFile}"`;
        execSync(rundllCommand2, { stdio: 'inherit' });
        console.log('✅ Rundll32 with full printer name executed!');
        console.log('📄 Print dialog should have opened with your ticket content');
        console.log('📄 Please click Print to get full-width output');
      } catch (rundllError2) {
        console.log('❌ Both rundll32 methods failed');
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
    }, 30000); // 30 second delay
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRundll32Fixed();
