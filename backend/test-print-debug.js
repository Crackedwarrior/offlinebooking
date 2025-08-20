// Debug test script to see exactly what's happening with printing
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function debugPrinting() {
  console.log('🔍 Debugging Thermal Printer...\n');
  
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
        movieName: 'DEBUG TEST',
        date: new Date().toLocaleDateString(),
        showTime: '6:00 PM',
        screen: 'Screen 1',
        seats: [
          { row: 'A', number: '1', price: 100 }
        ],
        totalAmount: 100
      };
      
      // Format the ticket content
      const formattedTicket = thermalService.formatTicket(ticketData);
      const ticketContent = thermalService.createTicketContent(formattedTicket);
      
      console.log('\n📄 Ticket Content Preview:');
      console.log('='.repeat(50));
      console.log(ticketContent);
      console.log('='.repeat(50));
      
      // Create a test file manually to see what's being sent
      const testFile = path.join(__dirname, 'temp', `debug_test_${Date.now()}.txt`);
      fs.writeFileSync(testFile, ticketContent);
      console.log(`\n💾 Test file created: ${testFile}`);
      
      // Try printing manually with PowerShell
      console.log('\n🖨️ Attempting manual print...');
      const printCommand = `powershell -Command "Get-Content '${testFile}' | Out-Printer -Name '${printerName}'"`;
      console.log(`Command: ${printCommand}`);
      
      try {
        execSync(printCommand, { stdio: 'inherit' });
        console.log('✅ Manual print command executed successfully');
      } catch (printError) {
        console.log('❌ Manual print failed:', printError.message);
      }
      
      // Check if file exists and show its contents
      if (fs.existsSync(testFile)) {
        console.log('\n📄 File contents:');
        const fileContent = fs.readFileSync(testFile, 'utf8');
        console.log(fileContent);
        
        // Clean up
        fs.unlinkSync(testFile);
        console.log('\n🧹 Test file cleaned up');
      }
      
    } else {
      console.log('❌ No thermal printers found');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugPrinting();
