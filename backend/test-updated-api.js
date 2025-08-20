// Test Updated API with PowerShell Method
const http = require('http');

async function testUpdatedApi() {
  console.log('🖨️ Testing Updated API (PowerShell Method)...\n');
  
  try {
    // Test data
    const ticketData = {
      theaterName: 'SREELEKHA THEATER',
      location: 'Chickmagalur',
      gstin: '29AAVFS7423E120',
      movieName: 'KALANK',
      date: '20/8/2025',
      showTime: '6:00 PM',
      screen: 'Screen 1',
      seats: [
        { row: 'A', number: '1', price: 100 },
        { row: 'A', number: '2', price: 100 },
        { row: 'B', number: '5', price: 120 },
        { row: 'B', number: '6', price: 120 }
      ],
      totalAmount: 440
    };
    
    console.log('📊 Ticket data prepared');
    console.log('🎬 Movie:', ticketData.movieName);
    console.log('📅 Date:', ticketData.date);
    console.log('🕐 Time:', ticketData.showTime);
    console.log('💺 Seats:', ticketData.seats.length);
    console.log('💰 Total:', `₹${ticketData.totalAmount}`);
    
    // Prepare the request data
    const postData = JSON.stringify({
      ticketData: ticketData,
      printerName: 'EPSON TM-T81'
    });
    
    // Call the API endpoint
    console.log('\n🔄 Calling updated API endpoint...');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/thermal-printer/print',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('📡 API Response:', result);
          
          if (result.success) {
            console.log('✅ API call successful!');
            console.log('📄 Message:', result.message);
            console.log('🖨️ Printer:', result.printer);
            console.log('📄 Check your printer for the actual ticket content');
          } else {
            console.log('❌ API call failed:', result.error);
          }
        } catch (parseError) {
          console.log('❌ Failed to parse response:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
    });
    
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUpdatedApi();
