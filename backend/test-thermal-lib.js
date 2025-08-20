// Test using node-thermal-printer library
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

async function testThermalLib() {
  console.log('🖨️ Testing with node-thermal-printer library...\n');
  
  try {
    // Create thermal printer instance
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: 'ESDPRT001', // Use the EPSON port
      driver: require('printer'),
      width: 48, // Set width to 48 characters (standard for 80mm paper)
      characterSet: 'SLOVENIA',
      removeSpecialCharacters: false,
      lineCharacter: '='
    });

    // Check if printer is connected
    const isConnected = await printer.isPrinterConnected();
    console.log('🔌 Printer connected:', isConnected);

    if (!isConnected) {
      console.log('❌ Printer not connected. Trying alternative configuration...');
      
      // Try alternative configuration
      const printer2 = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'EPSON TM-T81', // Use printer name instead
        driver: require('printer'),
        width: 48,
        characterSet: 'SLOVENIA',
        removeSpecialCharacters: false,
        lineCharacter: '='
      });
      
      const isConnected2 = await printer2.isPrinterConnected();
      console.log('🔌 Printer connected (alt):', isConnected2);
      
      if (isConnected2) {
        await printTicket(printer2);
      } else {
        console.log('❌ Could not connect to printer');
      }
    } else {
      await printTicket(printer);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔄 Trying fallback method...');
    
    // Fallback: Try with basic configuration
    try {
      const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'ESDPRT001',
        width: 48
      });
      
      await printTicket(printer);
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
    }
  }
}

async function printTicket(printer) {
  try {
    console.log('🎫 Printing ticket with thermal library...');
    
    // Print ticket content
    await printer.alignCenter();
    await printer.bold(true);
    await printer.println('SREELEKHA THEATER');
    await printer.bold(false);
    await printer.println('Chickmagalur');
    await printer.println('GSTIN: 29AAVFS7423E120');
    await printer.println('');
    
    await printer.drawLine();
    
    await printer.alignLeft();
    await printer.println('Movie: KALANK');
    await printer.println('Date: 20/8/2025');
    await printer.println('Time: 6:00 PM');
    await printer.println('Screen: Screen 1');
    await printer.println('');
    
    await printer.println('Seats:');
    await printer.println('  A-1 (₹100)');
    await printer.println('  A-2 (₹100)');
    await printer.println('  B-5 (₹120)');
    await printer.println('  B-6 (₹120)');
    await printer.println('');
    
    await printer.drawLine();
    
    await printer.alignRight();
    await printer.println('Total: ₹440');
    await printer.println('');
    
    await printer.alignCenter();
    await printer.println('Thank you for visiting!');
    await printer.println('Enjoy your movie!');
    await printer.println('');
    
    await printer.drawLine();
    await printer.println('');
    await printer.println('');
    
    // Cut the paper
    await printer.cut();
    
    console.log('✅ Ticket printed successfully with thermal library!');
    console.log('📄 Check your printer - this should use the ACTUAL full width!');
    console.log('\n🔍 What to look for:');
    console.log('   • Full paper width utilization');
    console.log('   • Proper thermal printer formatting');
    console.log('   • Professional appearance');
    console.log('   • Text spanning edge-to-edge');
    
  } catch (error) {
    console.error('❌ Print failed:', error.message);
  }
}

testThermalLib();
