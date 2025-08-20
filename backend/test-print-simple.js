// Simple test script for thermal printing
const { execSync } = require('child_process');

async function testPrinting() {
  console.log('🖨️ Testing Thermal Printer with Full-Width Formatting...\n');
  
  try {
    // First compile the TypeScript
    console.log('🔧 Compiling TypeScript...');
    execSync('npx tsc src/thermalPrintService.ts --outDir dist --esModuleInterop --target es2017 --module commonjs', { stdio: 'inherit' });
    
    // Import the compiled service
    const ThermalPrintService = require('./dist/thermalPrintService').default;
    const thermalService = new ThermalPrintService();
    
    // Test printer detection
    console.log('🔍 Getting available printers...');
    const allPrinters = await thermalService.getAllPrinters();
    console.log('✅ Found printers:', allPrinters.map(p => p.name));
    
    const thermalPrinters = await thermalService.getThermalPrinters();
    console.log('✅ Thermal printers:', thermalPrinters.map(p => p.name));
    
    if (thermalPrinters.length > 0) {
      const printerName = thermalPrinters[0].name;
      console.log(`\n🖨️ Testing with printer: ${printerName}`);
      
      // Create test ticket data
      const ticketData = {
        theaterName: 'SREELEKHA THEATER',
        location: 'Chickmagalur',
        gstin: '29AAVFS7423E120',
        movieName: 'KALANK (Full Width Test)',
        date: new Date().toLocaleDateString(),
        showTime: '6:00 PM',
        screen: 'Screen 1',
        seats: [
          { row: 'A', number: '1', price: 100 },
          { row: 'A', number: '2', price: 100 },
          { row: 'B', number: '5', price: 120 }
        ],
        totalAmount: 320
      };
      
      // Print test ticket
      console.log('🎫 Printing full-width test ticket...');
      const printResult = await thermalService.printTicket(ticketData, printerName);
      
      if (printResult.success) {
        console.log('✅ Full-width ticket printed successfully!');
        console.log('📏 The ticket should now use the complete width of your thermal paper');
      } else {
        console.log('❌ Print failed:', printResult.error);
      }
    } else {
      console.log('❌ No thermal printers found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPrinting();
