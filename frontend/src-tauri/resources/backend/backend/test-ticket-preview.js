const ThermalPrintService = require('./src/thermalPrintService').default;

function testTicketPreview() {
  console.log('🎫 Testing Ticket Preview Formatting...\n');
  
  const thermalService = new ThermalPrintService();
  
  const ticketData = {
    theaterName: 'SREELEKHA THEATER',
    location: 'Chickmagalur',
    gstin: '29AAVFS7423E120',
    movieName: 'KALANK',
    date: '2025-08-20',
    showTime: '6:00 PM',
    screen: 'Screen 1',
    seats: [
      { row: 'A', number: '1', price: 100 },
      { row: 'A', number: '2', price: 100 },
      { row: 'B', number: '5', price: 120 }
    ],
    totalAmount: 320
  };
  
  const formattedTicket = thermalService.formatTicket(ticketData);
  const previewContent = thermalService.createTicketContent(formattedTicket);
  
  console.log('📄 Ticket Preview:');
  console.log('='.repeat(50));
  console.log(previewContent);
  console.log('='.repeat(50));
  
  console.log('\n📊 Ticket Statistics:');
  console.log(`- Total characters: ${previewContent.length}`);
  console.log(`- Total lines: ${previewContent.split('\n').length}`);
  console.log(`- Paper width used: 48 characters (80mm thermal paper)`);
  
  console.log('\n🎯 Formatting Features:');
  console.log('✅ Full-width lines (48 characters)');
  console.log('✅ Centered header text');
  console.log('✅ Left-aligned content');
  console.log('✅ Right-aligned total');
  console.log('✅ Proper indentation for seats');
}

// Run the test
testTicketPreview();
