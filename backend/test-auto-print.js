// Test Auto Print - Direct printer printing without manual steps
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

function testAutoPrint() {
  console.log('🎯 Test Auto Print - Direct Printer Printing\n');
  console.log('No manual steps - automatic printing only\n');
  
  try {
    // Create ticket content with exact format
    const ticketContent = createExactTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `auto_print_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Show preview
    console.log('\n📄 Ticket Preview:');
    console.log('='.repeat(50));
    console.log(ticketContent);
    console.log('='.repeat(50));
    
    const printerName = 'EPSON TM-T81 ReceiptE4';
    
    // Method 1: Try direct copy to printer port
    console.log('\n1️⃣ Attempting direct copy to printer:');
    try {
      const copyCommand = `copy "${ticketFile}" "\\\\localhost\\${printerName}"`;
      console.log(`Command: ${copyCommand}`);
      execSync(copyCommand, { stdio: 'inherit' });
      console.log('✅ Direct copy to printer executed!');
      console.log('🖨️ This should print automatically');
    } catch (error) {
      console.log('❌ Direct copy failed:', error.message);
    }
    
    // Method 2: Try using NET USE to map printer
    console.log('\n2️⃣ Attempting NET USE printer mapping:');
    try {
      const netCommand = `net use lpt1: "\\\\localhost\\${printerName}" && copy "${ticketFile}" lpt1: && net use lpt1: /delete`;
      console.log(`Command: ${netCommand}`);
      execSync(netCommand, { stdio: 'inherit' });
      console.log('✅ NET USE printer mapping executed!');
      console.log('🖨️ This should print automatically');
    } catch (error) {
      console.log('❌ NET USE failed:', error.message);
    }
    
    // Method 3: Try PowerShell Out-Printer (direct)
    console.log('\n3️⃣ Attempting PowerShell Out-Printer:');
    try {
      const psCommand = `powershell -Command "Get-Content '${ticketFile}' | Out-Printer -Name '${printerName}'"`;
      console.log(`Command: ${psCommand}`);
      execSync(psCommand, { stdio: 'inherit' });
      console.log('✅ PowerShell Out-Printer executed!');
      console.log('🖨️ This should print automatically');
    } catch (error) {
      console.log('❌ PowerShell Out-Printer failed:', error.message);
    }
    
    // Method 4: Try using rundll32 with silent flag
    console.log('\n4️⃣ Attempting rundll32 silent print:');
    try {
      const rundllCommand = `rundll32 printui.dll,PrintUIEntry /k /n "${printerName}" "${ticketFile}" /q`;
      console.log(`Command: ${rundllCommand}`);
      execSync(rundllCommand, { stdio: 'inherit' });
      console.log('✅ Rundll32 silent print executed!');
      console.log('🖨️ This should print automatically');
    } catch (error) {
      console.log('❌ Rundll32 silent print failed:', error.message);
    }
    
    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    console.log('🎉 All automatic printing methods attempted!');
    console.log('🖨️ Check your printer for the output');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAutoPrint();
