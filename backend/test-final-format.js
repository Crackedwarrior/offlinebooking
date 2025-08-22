// Test Final Format
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createFinalTicketContent() {
  // Generate ticket ID
  const ticketId = `TKT${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
  
  // Calculate tax breakdown
  const totalAmount = 150.00;
  const baseAmount = totalAmount / 1.18;
  const cgst = (baseAmount * 0.09).toFixed(2);
  const sgst = (baseAmount * 0.09).toFixed(2);
  const mc = 2.00;
  const net = (baseAmount - mc).toFixed(2);
  
  const ticketDate = '06/08/2025';
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour12: true, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // Final format matching the exact user specification
  const lines = [
    '╔═════════════════════╗',
    '║  SREELEKHA THEATER  ║',
    '║     Chikmagalur     ║',
    '║GSTIN:29AAVFS7423E120║',
    '╚═════════════════════╝',
    '    DATE:06/08/2025',
    '   SHOWTIME:02:45PM',
    ' FILM:Mahavatar Narsimha',
    '┌─────────────────────┐',
    '│      CLASS:STAR     │',
    '│      SEAT:A-18      │',
    '└─────────────────────┘',
    ' [NET: 125.12]',
    ' [CGST: 11.44]',
    ' [SGST: 11.44]',
    ' [MC: 2.00]',
    '┌─────────────────────┐',
    '│  TICKET COST:₹150.00│',
    '└─────────────────────┘',
    '',
    ` ${ticketId}     ${currentTime.replace(' ', '')}`,
    ''
  ];
  
  return lines.join('\n');
}

function testFinalFormat() {
  console.log('🎯 Test Final Format\n');
  
  try {
    // Create ticket content with final format
    const ticketContent = createFinalTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `final_format_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Show preview
    console.log('\n📄 Ticket Preview:');
    console.log('='.repeat(50));
    console.log(ticketContent);
    console.log('='.repeat(50));
    
    // Use PowerShell Start-Process for automatic printing
    console.log('\n🖨️ Printing with PowerShell Start-Process:');
    try {
      const psCommand = `powershell -Command "Start-Process -FilePath '${ticketFile}' -Verb Print"`;
      console.log(`Command: ${psCommand}`);
      execSync(psCommand, { stdio: 'inherit' });
      console.log('✅ PowerShell Start-Process executed successfully!');
      console.log('🖨️ This should print the actual ticket content');
      console.log('📝 Using your pre-configured printer settings');
    } catch (error) {
      console.log('❌ PowerShell Start-Process failed:', error.message);
    }

    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    console.log('🎉 Final format test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFinalFormat();
