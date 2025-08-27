// Test Exact Format - Matching SREELEKHA THEATER.txt
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

function testExactFormat() {
  console.log('🎯 Testing Exact Format - Matching SREELEKHA THEATER.txt\n');
  console.log('Based on your exact format requirements:\n');
  console.log('✅ Left-aligned headers (no centering)');
  console.log('✅ Compact format (no extra blank lines)');
  console.log('✅ Exact spacing and indentation');
  console.log('✅ Full-width separators');
  console.log('✅ Optimized printer settings applied\n');
  
  try {
    // Create ticket content with exact format
    const ticketContent = createExactTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `exact_format_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Show preview
    console.log('\n📄 Ticket Preview:');
    console.log('='.repeat(50));
    console.log(ticketContent);
    console.log('='.repeat(50));
    
    // Method 1: Open file for manual printing (recommended)
    console.log('\n1️⃣ Opening file for manual printing:');
    try {
      const openCommand = `start "" "${ticketFile}"`;
      console.log(`Command: ${openCommand}`);
      execSync(openCommand, { stdio: 'inherit' });
      console.log('✅ File opened! Now press Ctrl+P to print with your optimized settings');
      console.log('📝 This should match your exact format requirements');
    } catch (error) {
      console.log('❌ Failed to open file:', error.message);
    }
    
    // Method 2: Direct print with rundll32
    console.log('\n2️⃣ Direct print with saved preferences:');
    try {
      const printerName = 'EPSON TM-T81 ReceiptE4';
      const rundllCommand = `rundll32 printui.dll,PrintUIEntry /k /n "${printerName}" "${ticketFile}"`;
      console.log(`Command: ${rundllCommand}`);
      execSync(rundllCommand, { stdio: 'inherit' });
      console.log('✅ Direct print executed!');
    } catch (error) {
      console.log('❌ Direct print failed:', error.message);
    }
    
    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    console.log('🖨️ Both methods should now print with your exact format!');
    console.log('\n🎉 Format Features:');
    console.log('   - Left-aligned headers (no centering)');
    console.log('   - Compact format (no extra blank lines)');
    console.log('   - Exact spacing and indentation');
    console.log('   - Full-width separators');
    console.log('   - Optimized printer settings applied');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testExactFormat();
