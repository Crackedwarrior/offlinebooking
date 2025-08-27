// Test Box Format with straight lines
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createBoxTicketContent() {
  // Helper function to create exact width line (25 dashes as per specification)
  const fullWidthLine = (char = '-') => char.repeat(25);
  
  // Helper function to create straight line (same length as dotted line)
  const straightLine = (char = '_') => char.repeat(25);
  
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
  
  // Box format with straight lines
  const lines = [
    '┌─────────────────────────┐',
    '│    SREELEKHA THEATER    │',
    '│       Chickmagalur      │',
    '│   GSTIN:29AAVFS7423E120 │',
    '└─────────────────────────┘',
    fullWidthLine('-'),
    '    Date:06/08/2025',
    ' SHOWTIME:02:45PM',
    'Film:Mahavatar Narsimha',
    straightLine('_'),
    '     Class:STAR',
    '     Seat:A-18',
    straightLine('_'),
    'Ticket Cost:₹150.0',
    fullWidthLine('-'),
    `[NET: ${net}]`,
    `[CGST: ${cgst}]`,
    `[SGST: ${sgst}]`,
    `[MC: ${mc.toFixed(2)}]`,
    straightLine('_'),
    fullWidthLine('-'),
    `${ticketDate} / ${currentTime}`,
    ticketId,
    ''
  ];
  
  return lines.join('\n');
}

function testBoxFormat() {
  console.log('🎯 Test Box Format with Straight Lines\n');
  
  try {
    // Create ticket content with box format
    const ticketContent = createBoxTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `box_format_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Show preview
    console.log('\n📄 Ticket Preview:');
    console.log('='.repeat(50));
    console.log(ticketContent);
    console.log('='.repeat(50));
    
    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    console.log('🎉 Box format test completed!');
    console.log('📝 Review the format above and let me know if you want to implement it');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBoxFormat();
