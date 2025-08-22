// Simple Print Test - Just open file for manual printing
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

function testSimplePrint() {
  console.log('🎯 Simple Print Test - Exact Format\n');
  console.log('Format matches SREELEKHA THEATER.txt exactly:\n');
  console.log('✅ Left-aligned headers (no centering)');
  console.log('✅ Compact format (no extra blank lines)');
  console.log('✅ Exact spacing and indentation');
  console.log('✅ Full-width separators');
  console.log('✅ Just opening file for manual printing\n');
  
  try {
    // Create ticket content with exact format
    const ticketContent = createExactTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `simple_print_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Show preview
    console.log('\n📄 Ticket Preview:');
    console.log('='.repeat(50));
    console.log(ticketContent);
    console.log('='.repeat(50));
    
    // Just open file for manual printing (no direct print commands)
    console.log('\n🖨️ Opening file for manual printing:');
    try {
      const openCommand = `start "" "${ticketFile}"`;
      console.log(`Command: ${openCommand}`);
      execSync(openCommand, { stdio: 'inherit' });
      console.log('✅ File opened successfully!');
      console.log('📝 Now press Ctrl+P to print with your optimized settings');
      console.log('🖨️ This should print with full width and no wasted space');
    } catch (error) {
      console.log('❌ Failed to open file:', error.message);
    }
    
    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    console.log('🎉 Format is now exactly as per your specification!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimplePrint();
