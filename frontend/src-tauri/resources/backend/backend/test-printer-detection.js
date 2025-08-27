// Test printer detection in detail
const { execSync } = require('child_process');

async function testPrinterDetection() {
  console.log('🔍 Testing Printer Detection in Detail...\n');
  
  try {
    // First compile the TypeScript
    console.log('🔧 Compiling TypeScript...');
    execSync('npx tsc src/thermalPrintService.ts --outDir dist --esModuleInterop --target es2017 --module commonjs', { stdio: 'inherit' });
    
    // Import the compiled service
    const ThermalPrintService = require('./dist/thermalPrintService').default;
    const thermalService = new ThermalPrintService();
    
    // Get all printers
    console.log('🔍 Getting all printers...');
    const allPrinters = await thermalService.getAllPrinters();
    console.log('✅ All printers found:');
    allPrinters.forEach((printer, index) => {
      console.log(`  ${index + 1}. ${printer.name} (Port: ${printer.port}, Status: ${printer.status})`);
    });
    
    // Check thermal classification
    console.log('\n🔍 Checking thermal printer classification...');
    const thermalKeywords = ['thermal', 'pos', 'receipt', 'epson', 'star', 'citizen'];
    
    allPrinters.forEach(printer => {
      const matches = thermalKeywords.filter(keyword => 
        printer.name.toLowerCase().includes(keyword)
      );
      console.log(`  ${printer.name}: ${matches.length > 0 ? '✅ Thermal (' + matches.join(', ') + ')' : '❌ Not thermal'}`);
    });
    
    // Get thermal printers
    console.log('\n🔍 Getting thermal printers...');
    const thermalPrinters = await thermalService.getThermalPrinters();
    console.log('✅ Thermal printers found:', thermalPrinters.map(p => p.name));
    
    // Test raw PowerShell command
    console.log('\n🔍 Testing raw PowerShell command...');
    try {
      const { stdout } = require('child_process').execSync(
        'powershell -Command "Get-Printer | Select-Object Name, Port, PrinterStatus | ConvertTo-Json"',
        { encoding: 'utf8', windowsHide: true }
      );
      console.log('✅ Raw PowerShell output:');
      console.log(stdout);
    } catch (error) {
      console.log('❌ Raw PowerShell failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPrinterDetection();
