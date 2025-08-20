// Full ticket test print
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testFullTicket() {
  console.log('🎫 Testing Full Ticket Print...\n');
  
  try {
    // First compile the TypeScript
    console.log('🔧 Compiling TypeScript...');
    execSync('npx tsc src/thermalPrintService.ts --outDir dist --esModuleInterop --target es2017 --module commonjs', { stdio: 'inherit' });
    
    // Import the compiled service
    const ThermalPrintService = require('./dist/thermalPrintService').default;
    const thermalService = new ThermalPrintService();
    
    // Create realistic ticket data
    const ticketData = {
      theaterName: 'SREELEKHA THEATER',
      location: 'Chickmagalur',
      gstin: '29AAVFS7423E120',
      movieName: 'KALANK',
      date: new Date().toLocaleDateString('en-IN'),
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
    
    // Format the ticket content
    const formattedTicket = thermalService.formatTicket(ticketData);
    const ticketContent = thermalService.createTicketContent(formattedTicket);
    
    console.log('\n📄 Full Ticket Content Preview:');
    console.log('='.repeat(50));
    console.log(ticketContent);
    console.log('='.repeat(50));
    
    // Create the test file
    const testFile = path.join(__dirname, 'temp', `full_ticket_${Date.now()}.txt`);
    fs.writeFileSync(testFile, ticketContent);
    console.log(`\n💾 Test file created: ${testFile}`);
    
    // Print the ticket
    console.log('\n🖨️ Printing full ticket...');
    const printCommand = `powershell -Command "Get-Content '${testFile}' | Out-Printer -Name 'EPSON TM-T81'"`;
    console.log(`Command: ${printCommand}`);
    
    try {
      execSync(printCommand, { stdio: 'inherit' });
      console.log('\n✅ Full ticket printed successfully!');
      console.log('📄 Check your printer for the complete ticket output');
      console.log('\n📋 What to check:');
      console.log('   • Full width formatting (should use entire paper width)');
      console.log('   • Centered theater name and details');
      console.log('   • Proper seat listing with prices');
      console.log('   • Correct total amount');
      console.log('   • Clean formatting and alignment');
      
    } catch (printError) {
      console.log('\n❌ Print failed:', printError.message);
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

testFullTicket();
