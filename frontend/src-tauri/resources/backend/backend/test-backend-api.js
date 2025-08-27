// Use built-in fetch or axios alternative
const https = require('https');
const http = require('http');

async function testBackendAPI() {
  console.log('🎯 Testing Backend API with New Format');
  
  const testData = {
    ticketData: {
      theaterName: 'SREELEKHA THEATER',
      location: 'Chickmagalur',
      date: '2025-08-22',
      showTime: '02:45PM',
      movieName: 'AVENGERS: ENDGAME',
      class: 'BOX',
      seatId: 'BOX-A5',
      price: 150,
      transactionId: 'TXN' + Date.now()
    },
    printerName: 'EPSON TM-T81 ReceiptE4'
  };

  try {
    console.log('📡 Sending API request...');
    
    const postData = JSON.stringify(testData);
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
          console.log('📋 API Response:', result);

          if (result.success) {
            console.log('✅ Backend API test successful!');
            console.log('🖨️ Check your printer for the new format output');
          } else {
            console.log('❌ Backend API test failed:', result.error);
          }
        } catch (parseError) {
          console.log('❌ Failed to parse response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ API test failed:', error.message);
    });

    req.write(postData);
    req.end();

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testBackendAPI();
