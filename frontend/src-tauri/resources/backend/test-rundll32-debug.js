// Debug Rundll32 Printing Issue
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

function testRundll32Debug() {
  console.log('🖨️ Debugging Rundll32 Printing Issue...\n');
  
  try {
    // Create ticket content
    const ticketContent = createTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `debug_ticket_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    console.log(`📄 File size: ${fs.statSync(ticketFile).size} bytes`);
    
    // Test 1: Check if file content is correct
    console.log('\n📄 File content preview:');
    console.log('---START---');
    console.log(fs.readFileSync(ticketFile, 'utf8').substring(0, 200));
    console.log('---END---');
    
    // Test 2: Try different rundll32 approaches
    console.log('\n🔄 Testing different rundll32 approaches...');
    
    // Method 1: Basic rundll32
    console.log('\n1️⃣ Testing basic rundll32:');
    try {
      const command1 = `rundll32 printui.dll,PrintUIEntry /k /n "EPSON TM-T81" "${ticketFile}"`;
      console.log(`Command: ${command1}`);
      execSync(command1, { stdio: 'inherit' });
      console.log('✅ Basic rundll32 executed');
    } catch (error) {
      console.log('❌ Basic rundll32 failed:', error.message);
    }
    
    // Method 2: Try with full printer name
    console.log('\n2️⃣ Testing with full printer name:');
    try {
      const command2 = `rundll32 printui.dll,PrintUIEntry /k /n "EPSON TM-T81 ReceiptE4" "${ticketFile}"`;
      console.log(`Command: ${command2}`);
      execSync(command2, { stdio: 'inherit' });
      console.log('✅ Full name rundll32 executed');
    } catch (error) {
      console.log('❌ Full name rundll32 failed:', error.message);
    }
    
    // Method 3: Try different rundll32 syntax
    console.log('\n3️⃣ Testing alternative rundll32 syntax:');
    try {
      const command3 = `rundll32 printui.dll,PrintUIEntry /k /n "EPSON TM-T81" /f "${ticketFile}"`;
      console.log(`Command: ${command3}`);
      execSync(command3, { stdio: 'inherit' });
      console.log('✅ Alternative syntax executed');
    } catch (error) {
      console.log('❌ Alternative syntax failed:', error.message);
    }
    
    // Method 4: Try using cmd print command
    console.log('\n4️⃣ Testing cmd print command:');
    try {
      const command4 = `cmd /c print "${ticketFile}" "EPSON TM-T81"`;
      console.log(`Command: ${command4}`);
      execSync(command4, { stdio: 'inherit' });
      console.log('✅ Cmd print executed');
    } catch (error) {
      console.log('❌ Cmd print failed:', error.message);
    }
    
    // Method 5: Try PowerShell Start-Process
    console.log('\n5️⃣ Testing PowerShell Start-Process:');
    try {
      const command5 = `powershell -Command "Start-Process -FilePath '${ticketFile}' -Verb Print"`;
      console.log(`Command: ${command5}`);
      execSync(command5, { stdio: 'inherit' });
      console.log('✅ PowerShell Start-Process executed');
    } catch (error) {
      console.log('❌ PowerShell Start-Process failed:', error.message);
    }
    
    // Keep file for manual testing
    console.log(`\n📄 Ticket file preserved for manual testing: ${ticketFile}`);
    console.log('🖨️ Please open this file and try Ctrl+P manually to compare');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRundll32Debug();
