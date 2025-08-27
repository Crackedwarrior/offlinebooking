// Test Actual Print - Automatic printing with optimized settings
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createExactTicketContent() {
  const PAPER_WIDTH = 48; // Optimized width for thermal paper
  
  // Helper function to create full-width line
  const fullWidthLine = (char = '-') => char.repeat(PAPER_WIDTH);
  
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
  
  // Exact format matching SREELEKHA THEATER.txt
  const lines = [
    'SREELEKHA THEATER',
    '     Chickmagalur',
    '  GSTIN:29AAVFS7423E120',
    fullWidthLine('-'),
    '    Date:06/08/2025',
    ' SHOWTIME:02:45PM',
    'Film:Mahavatar Narsimha',
    '     Class:STAR',
    '     Seat:A-18',
    fullWidthLine('-'),
    `[NET: ${net}]`,
    `[CGST: ${cgst}]`,
    `[SGST: ${sgst}]`,
    `[MC: ${mc.toFixed(2)}]`,
    fullWidthLine('-'),
    'Ticket Cost:₹150.00',
    fullWidthLine('-'),
    `${ticketDate} / ${currentTime}`,
    ticketId,
    ''
  ];
  
  return lines.join('\n');
}

function testActualPrint() {
  console.log('🎯 Test Actual Print - Automatic Printing\n');
  console.log('Format matches SREELEKHA THEATER.txt exactly:\n');
  console.log('✅ Left-aligned headers (no centering)');
  console.log('✅ Compact format (no extra blank lines)');
  console.log('✅ Exact spacing and indentation');
  console.log('✅ Full-width separators');
  console.log('✅ Automatic printing with optimized settings\n');
  
  try {
    // Create ticket content with exact format
    const ticketContent = createExactTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `actual_print_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Show preview
    console.log('\n📄 Ticket Preview:');
    console.log('='.repeat(50));
    console.log(ticketContent);
    console.log('='.repeat(50));
    
    const printerName = 'EPSON TM-T81 ReceiptE4';
    
    // Method 1: Try PowerShell Start-Process for automatic printing
    console.log('\n1️⃣ Attempting automatic print with PowerShell:');
    try {
      const printCommand = `powershell -Command "Start-Process -FilePath '${ticketFile}' -Verb Print"`;
      console.log(`Command: ${printCommand}`);
      execSync(printCommand, { stdio: 'inherit' });
      console.log('✅ PowerShell automatic print executed!');
      console.log('🖨️ This should print automatically with your optimized settings');
    } catch (error) {
      console.log('❌ PowerShell automatic print failed:', error.message);
    }
    
    // Method 2: Try rundll32 for automatic printing
    console.log('\n2️⃣ Attempting automatic print with rundll32:');
    try {
      const rundllCommand = `rundll32 printui.dll,PrintUIEntry /k /n "${printerName}" "${ticketFile}"`;
      console.log(`Command: ${rundllCommand}`);
      execSync(rundllCommand, { stdio: 'inherit' });
      console.log('✅ Rundll32 automatic print executed!');
      console.log('🖨️ This should print automatically with your optimized settings');
    } catch (error) {
      console.log('❌ Rundll32 automatic print failed:', error.message);
    }
    
    // Method 3: Try Windows print command
    console.log('\n3️⃣ Attempting automatic print with Windows print command:');
    try {
      const winPrintCommand = `print "${ticketFile}"`;
      console.log(`Command: ${winPrintCommand}`);
      execSync(winPrintCommand, { stdio: 'inherit' });
      console.log('✅ Windows print command executed!');
      console.log('🖨️ This should print automatically');
    } catch (error) {
      console.log('❌ Windows print command failed:', error.message);
    }
    
    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    console.log('🎉 All automatic printing methods attempted!');
    console.log('🖨️ Check your printer for the output');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testActualPrint();
