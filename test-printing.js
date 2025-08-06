// Test script to verify printing functionality
import fetch from 'node-fetch';

async function testPrinting() {
  console.log('🧪 Testing printing functionality...\n');

  try {
    // Test 1: Test printer connection
    console.log('1️⃣ Testing printer connection...');
    const testResponse = await fetch('http://localhost:3001/api/printer/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        printerConfig: {
          port: 'COM1',
          theaterName: 'SREELEKHA THEATER',
          location: 'Chickmagalur',
          gstin: '29AAVFS7423E120'
        }
      })
    });

    const testResult = await testResponse.json();
    console.log('✅ Printer connection test:', testResult.success ? 'PASSED' : 'FAILED');
    console.log('   Message:', testResult.message);

    // Test 2: Test ticket printing
    console.log('\n2️⃣ Testing ticket printing...');
    const printResponse = await fetch('http://localhost:3001/api/printer/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tickets: [{
          commands: 'Test ticket data',
          timestamp: new Date().toISOString(),
          ticketData: {
            theaterName: 'SREELEKHA THEATER',
            location: 'Chickmagalur',
            date: new Date().toLocaleDateString('en-GB'),
            film: 'Test Movie',
            class: 'STAR',
            showtime: new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
            row: 'A',
            seatNumber: '1',
            netAmount: 125.12,
            cgst: 11.44,
            sgst: 11.44,
            mc: 2.00,
            totalAmount: 150.00,
            transactionId: '060812CSH 00290001/001',
            gstin: '29AAVFS7423E120'
          }
        }],
        printerConfig: {
          port: 'COM1',
          theaterName: 'SREELEKHA THEATER',
          location: 'Chickmagalur',
          gstin: '29AAVFS7423E120'
        }
      })
    });

    const printResult = await printResponse.json();
    console.log('✅ Ticket printing test:', printResult.success ? 'PASSED' : 'FAILED');
    console.log('   Message:', printResult.message);

    // Test 3: Test health endpoint
    console.log('\n3️⃣ Testing backend health...');
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthResult = await healthResponse.json();
    console.log('✅ Backend health test:', healthResult.success ? 'PASSED' : 'FAILED');
    console.log('   Status:', healthResult.status);

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - Printer connection:', testResult.success ? '✅ Working' : '❌ Failed');
    console.log('   - Ticket printing:', printResult.success ? '✅ Working' : '❌ Failed');
    console.log('   - Backend health:', healthResult.success ? '✅ Working' : '❌ Failed');

    if (testResult.success && printResult.success && healthResult.success) {
      console.log('\n🚀 The app is ready to print tickets!');
      console.log('   You can now:');
      console.log('   1. Open http://localhost:8080 in your browser');
      console.log('   2. Select seats and click "Print"');
      console.log('   3. Check the Settings → Printer tab for configuration');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the backend server.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 3001');
    console.log('   Run: npm run dev:backend');
  }
}

// Run the test
testPrinting(); 