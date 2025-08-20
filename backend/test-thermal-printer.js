const ThermalPrintService = require('./src/thermalPrintService').default;

async function testThermalPrinter() {
  console.log('🧪 Testing Thermal Printer Service...\n');
  
  const thermalService = new ThermalPrintService();
  
  try {
    // Test 1: Get all printers
    console.log('1️⃣ Testing printer detection...');
    const allPrinters = await thermalService.getAllPrinters();
    console.log('✅ All printers:', allPrinters);
    
    // Test 2: Get thermal printers
    console.log('\n2️⃣ Testing thermal printer detection...');
    const thermalPrinters = await thermalService.getThermalPrinters();
    console.log('✅ Thermal printers:', thermalPrinters);
    
    // Test 3: Test printer status
    if (thermalPrinters.length > 0) {
      console.log('\n3️⃣ Testing printer status...');
      const firstPrinter = thermalPrinters[0].name;
      const status = await thermalService.getPrinterStatus(firstPrinter);
      console.log(`✅ Status of ${firstPrinter}:`, status);
      
      // Test 4: Test printer connection
      console.log('\n4️⃣ Testing printer connection...');
      const testResult = await thermalService.testPrinter(firstPrinter);
      console.log(`✅ Test result for ${firstPrinter}:`, testResult);
      
      // Test 5: Test ticket printing
      console.log('\n5️⃣ Testing ticket printing...');
      const ticketData = {
        theaterName: 'SREELEKHA THEATER',
        location: 'Chickmagalur',
        gstin: '29AAVFS7423E120',
        movieName: 'Test Movie',
        date: new Date().toLocaleDateString(),
        showTime: '2:00 PM',
        screen: 'Screen 1',
        seats: [
          { row: 'A', number: '1', price: 100 },
          { row: 'A', number: '2', price: 100 }
        ],
        totalAmount: 200
      };
      
      const printResult = await thermalService.printTicket(ticketData, firstPrinter);
      console.log('✅ Print result:', printResult);
    } else {
      console.log('❌ No thermal printers found for testing');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testThermalPrinter();
