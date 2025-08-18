// Test script to configure printer and test printing
const testPrinterConfig = async () => {
  console.log('🔧 Testing printer configuration...');
  
  // Test 1: Check available printers
  console.log('\n📋 Step 1: Checking available printers...');
  try {
    const response = await fetch('http://localhost:3001/api/printer/list');
    const data = await response.json();
    
    if (data.success && data.printers) {
      console.log('✅ Available printers:');
      data.printers.forEach(printer => {
        console.log(`  - ${printer.name} (${printer.port}) - Status: ${printer.status}`);
      });
      
      // Find the EPSON printer
      const epsonPrinter = data.printers.find(p => p.name.includes('EPSON'));
      if (epsonPrinter) {
        console.log(`\n🎯 Found EPSON printer: ${epsonPrinter.name} on port ${epsonPrinter.port}`);
        
        // Test 2: Configure printer
        console.log('\n🔧 Step 2: Configuring printer...');
        const printerConfig = {
          name: epsonPrinter.name,
          port: epsonPrinter.port,
          theaterName: 'SREELEKHA THEATER',
          location: 'Chickmagalur',
          gstin: '29AAVFS7423E120'
        };
        
        // Save to localStorage (simulating frontend behavior)
        localStorage.setItem('selectedPrinter', JSON.stringify(printerConfig));
        console.log('✅ Printer configuration saved to localStorage');
        
        // Test 3: Test printer connection
        console.log('\n🔍 Step 3: Testing printer connection...');
        const testResponse = await fetch('http://localhost:3001/api/printer/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ printerConfig })
        });
        
        const testData = await testResponse.json();
        if (testData.success) {
          console.log('✅ Printer connection test successful');
        } else {
          console.log('❌ Printer connection test failed:', testData.message);
        }
        
        // Test 4: Print test ticket
        console.log('\n🖨️ Step 4: Printing test ticket...');
        const printResponse = await fetch('http://localhost:3001/api/printer/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tickets: [{
              commands: `================================
       SREELEKHA THEATER        
          Chickmagalur          
--------------------------------
Date    : ${new Date().toLocaleDateString()}
Film    : TEST MOVIE
Class   : TEST
Showtime: 10:00 AM
Row     : TEST-Seats: [1]
--------------------------------
NET     : 100.00
CGST    : 9.00
SGST    : 9.00
MC      : 2.00
--------------------------------
Total   : 120.00
--------------------------------
${new Date().toLocaleDateString()} / 10:00 AM
ID: TEST123456789
================================

`,
              timestamp: new Date().toISOString()
            }],
            printerConfig
          })
        });
        
        const printData = await printResponse.json();
        if (printData.success) {
          console.log('✅ Test ticket printed successfully!');
          console.log('📄 Check your printer for the test ticket');
        } else {
          console.log('❌ Test ticket printing failed:', printData.message);
        }
        
      } else {
        console.log('❌ No EPSON printer found');
      }
    } else {
      console.log('❌ Failed to get printer list:', data.message);
    }
  } catch (error) {
    console.error('❌ Error testing printer configuration:', error);
  }
};

// Run the test
console.log('🚀 Starting printer configuration test...');
console.log('📝 This script will:');
console.log('  1. Check available printers');
console.log('  2. Configure the EPSON printer');
console.log('  3. Test printer connection');
console.log('  4. Print a test ticket');
console.log('');

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  // Browser environment
  testPrinterConfig();
} else {
  // Node.js environment
  console.log('❌ This script needs to run in a browser environment');
  console.log('💡 Open your browser and go to: http://localhost:8081');
  console.log('💡 Then open the browser console and run this script');
}
