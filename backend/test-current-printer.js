// Test with the current printer configuration
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testCurrentPrinter() {
  console.log('🖨️ Testing Current Printer Configuration...\n');
  
  try {
    // First compile the TypeScript
    console.log('🔧 Compiling TypeScript...');
    execSync('npx tsc src/thermalPrintService.ts --outDir dist --esModuleInterop --target es2017 --module commonjs', { stdio: 'inherit' });
    
    // Import the compiled service
    const ThermalPrintService = require('./dist/thermalPrintService').default;
    const thermalService = new ThermalPrintService();
    
    // Use the current printer name from the system
    const printerName = 'EPSON TM T81';
    console.log(`\n🖨️ Testing with current printer: ${printerName}`);
    
    // Create test ticket data
    const ticketData = {
      theaterName: 'SREELEKHA THEATER',
      location: 'Chickmagalur',
      gstin: '29AAVFS7423E120',
      movieName: 'CURRENT PRINTER TEST',
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
    
    // Create a test file
    const testFile = path.join(__dirname, 'temp', `current_test_${Date.now()}.txt`);
    fs.writeFileSync(testFile, ticketContent);
    console.log(`\n💾 Test file created: ${testFile}`);
    
    // Try printing with the current printer
    console.log('\n🖨️ Attempting to print...');
    const printCommand = `powershell -Command "Get-Content '${testFile}' | Out-Printer -Name '${printerName}'"`;
    console.log(`Command: ${printCommand}`);
    
    try {
      execSync(printCommand, { stdio: 'inherit' });
      console.log('✅ Print command executed successfully');
      console.log('📄 Check your printer for output!');
    } catch (printError) {
      console.log('❌ Print failed:', printError.message);
      
      // Try alternative approach - direct file printing
      console.log('\n🔄 Trying alternative printing method...');
      const altCommand = `powershell -Command "Start-Process -FilePath '${testFile}' -Verb Print"`;
      console.log(`Alternative command: ${altCommand}`);
      
      try {
        execSync(altCommand, { stdio: 'inherit' });
        console.log('✅ Alternative print method executed');
      } catch (altError) {
        console.log('❌ Alternative method also failed:', altError.message);
      }
    }
    
    // Clean up
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
      console.log('\n🧹 Test file cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCurrentPrinter();
