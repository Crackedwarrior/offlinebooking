// Test Connected Boxes Format
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createConnectedBoxesContent() {
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
  
  // Connected boxes format with exact text spacing
  const lines = [
    '┌─────────────────────────┐',
    '│    SREELEKHA THEATER    │',
    '│     Chickmagalur        │',
    '│  GSTIN:29AAVFS7423E120  │',
    '└─────────────────────────┘',
    '    Date:06/08/2025',
    ' SHOWTIME:02:45PM',
    'Film:Mahavatar Narsimha',
    '┌─────────────────────────┐',
    '│     Class:STAR          │',
    '│     Seat:A-18           │',
    '└─────────────────────────┘',
    'Ticket Cost:₹150.0',
    '┌─────────────────────────┐',
    `│[NET: ${net}]            │`,
    `│[CGST: ${cgst}]          │`,
    `│[SGST: ${sgst}]          │`,
    `│[MC: ${mc.toFixed(2)}]   │`,
    '└─────────────────────────┘',
    `${ticketDate} / ${currentTime}`,
    ticketId,
    ''
  ];
  
  return lines.join('\n');
}

function testConnectedBoxes() {
  console.log('🎯 Test Connected Boxes Format\n');
  
  try {
    // Create ticket content with connected boxes
    const ticketContent = createConnectedBoxesContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `connected_boxes_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Show preview
    console.log('\n📄 Ticket Preview:');
    console.log('='.repeat(50));
    console.log(ticketContent);
    console.log('='.repeat(50));
    
    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    console.log('🎉 Connected boxes format test completed!');
    console.log('📝 Review the format above and let me know if you want to implement it');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testConnectedBoxes();
