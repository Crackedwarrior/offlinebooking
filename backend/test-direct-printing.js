// Test Direct Printing Methods (No PowerShell)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createTicketContent() {
  const PAPER_WIDTH = 40;
  
  // Helper function to center text
  const centerText = (text) => {
    const padding = Math.max(0, Math.floor((PAPER_WIDTH - text.length) / 2));
    return ' '.repeat(padding) + text;
  };
  
  // Helper function to create full-width line
  const fullWidthLine = (char = '-') => char.repeat(PAPER_WIDTH);
  
  // Helper function to create label-value pairs (label left, value right)
  const labelValue = (label, value) => {
    const padding = Math.max(0, PAPER_WIDTH - label.length - value.length);
    return label + ' '.repeat(padding) + value;
  };
  
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
  
  const lines = [
    centerText('SREELEKHA THEATER'),
    centerText('Chickmagalur'),
    centerText('GSTIN: 29AAVFS7423E120'),
    fullWidthLine('-'),
    labelValue('Date:', '06/08/2025'),
    labelValue('SHOWTIME:', '02:45 PM'),
    labelValue('Film:', 'Mahavatar Narsimha'),
    labelValue('Class:', 'STAR'),
    labelValue('Row:', 'A'),
    labelValue('SeatNo:', '18'),
    fullWidthLine('-'),
    `[NET: ${net}]`,
    `[CGST: ${cgst}]`,
    `[SGST: ${sgst}]`,
    `[MC: ${mc.toFixed(2)}]`,
    fullWidthLine('-'),
    centerText(`Ticket Cost: ₹${totalAmount.toFixed(2)}`),
    fullWidthLine('-'),
    `${ticketDate} / ${currentTime}`,
    ticketId,
    fullWidthLine('-')
  ];
  
  return lines.join('\n');
}

function testDirectPrinting() {
  console.log('🖨️ Testing Direct Printing Methods (No PowerShell)...\n');
  
  try {
    // Create ticket content
    const ticketContent = createTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `direct_print_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Method 1: Try Windows CMD print command
    console.log('\n1️⃣ Testing Windows CMD print command:');
    try {
      const cmdPrint = `print "${ticketFile}"`;
      console.log(`Command: ${cmdPrint}`);
      execSync(cmdPrint, { stdio: 'inherit' });
      console.log('✅ CMD print executed!');
    } catch (error) {
      console.log('❌ CMD print failed:', error.message);
    }
    
    // Method 2: Try direct copy to printer port
    console.log('\n2️⃣ Testing direct copy to printer port:');
    try {
      const copyCommand = `copy "${ticketFile}" "\\\\localhost\\EPSON TM-T81"`;
      console.log(`Command: ${copyCommand}`);
      execSync(copyCommand, { stdio: 'inherit' });
      console.log('✅ Copy to printer executed!');
    } catch (error) {
      console.log('❌ Copy to printer failed:', error.message);
    }
    
    // Method 3: Try using rundll32 with different approach
    console.log('\n3️⃣ Testing rundll32 direct print:');
    try {
      const rundllCommand = `rundll32 msvcrt.dll,system print "${ticketFile}"`;
      console.log(`Command: ${rundllCommand}`);
      execSync(rundllCommand, { stdio: 'inherit' });
      console.log('✅ Rundll32 direct print executed!');
    } catch (error) {
      console.log('❌ Rundll32 direct print failed:', error.message);
    }
    
    // Method 4: Try NET USE approach
    console.log('\n4️⃣ Testing NET USE printer approach:');
    try {
      const netCommand = `net use lpt1: "\\\\localhost\\EPSON TM-T81" && copy "${ticketFile}" lpt1: && net use lpt1: /delete`;
      console.log(`Command: ${netCommand}`);
      execSync(netCommand, { stdio: 'inherit' });
      console.log('✅ NET USE print executed!');
    } catch (error) {
      console.log('❌ NET USE print failed:', error.message);
    }
    
    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    console.log('🖨️ Try opening the file manually and print with Ctrl+P to compare');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDirectPrinting();
