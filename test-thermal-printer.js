const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ESC/POS commands for Epson TM-T81 thermal printer
const ESC_POS_COMMANDS = [
  '\x1B\x40',        // Initialize printer
  '\x1B\x61\x01',    // Center alignment
  '\x1B\x21\x10',    // Double height and width
  'SREELEKHA THEATER\n',
  '\x1B\x21\x00',    // Normal size
  'Chickmagalur\n',
  '\x1B\x61\x00',    // Left alignment
  'Date: ' + new Date().toLocaleDateString() + '\n',
  'Time: ' + new Date().toLocaleTimeString() + '\n',
  'Test Ticket\n',
  '\x1B\x61\x01',    // Center alignment
  '₹150.00\n',
  '\x1B\x61\x00',    // Left alignment
  '\n\n\n',          // Feed paper
  '\x1B\x69'         // Cut paper
].join('');

async function testThermalPrinter() {
  console.log('🖨️ Testing thermal printer with ESC/POS commands...');
  
  try {
    // Create temp directory
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create a binary file with ESC/POS commands
    const tempFile = path.join(tempDir, `thermal_test_${Date.now()}.bin`);
    fs.writeFileSync(tempFile, ESC_POS_COMMANDS, 'binary');
    
    console.log('📁 Created binary file:', tempFile);
    console.log('📊 File size:', fs.statSync(tempFile).size, 'bytes');
    
    // Method 1: Try sending binary data directly to printer port
    console.log('\n🔍 Method 1: Sending binary data to printer port...');
    try {
      const copyCommand = `Copy-Item "${tempFile}" "ESDPRT001"`;
      const result = await new Promise((resolve, reject) => {
        exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${copyCommand}"`, (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve({ stdout, stderr });
        });
      });
      
      console.log('✅ Binary data sent successfully');
      console.log('📤 Output:', result.stdout);
      if (result.stderr) console.log('⚠️ Errors:', result.stderr);
      
    } catch (error) {
      console.log('❌ Method 1 failed:', error.message);
      
      // Method 2: Try using PowerShell to send raw bytes
      console.log('\n🔍 Method 2: Using PowerShell to send raw bytes...');
      try {
        const psCommand = `
          $bytes = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '\\\\')}")
          $port = New-Object System.IO.Ports.SerialPort "COM1", 9600, None, 8, One
          $port.Open()
          $port.Write($bytes, 0, $bytes.Length)
          $port.Close()
        `;
        
        const result = await new Promise((resolve, reject) => {
          exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
          });
        });
        
        console.log('✅ Raw bytes sent successfully');
        console.log('📤 Output:', result.stdout);
        if (result.stderr) console.log('⚠️ Errors:', result.stderr);
        
      } catch (error2) {
        console.log('❌ Method 2 failed:', error2.message);
        
        // Method 3: Try using Windows print with raw data
        console.log('\n🔍 Method 3: Using Windows print with raw data...');
        try {
          const printCommand = `print /d:"EPSON TM-T81 ReceiptE4" "${tempFile}"`;
          const result = await new Promise((resolve, reject) => {
            exec(printCommand, (error, stdout, stderr) => {
              if (error) reject(error);
              else resolve({ stdout, stderr });
            });
          });
          
          console.log('✅ Raw data print command executed');
          console.log('📤 Output:', result.stdout);
          if (result.stderr) console.log('⚠️ Errors:', result.stderr);
          
        } catch (error3) {
          console.log('❌ Method 3 failed:', error3.message);
          console.log('\n❌ All methods failed. Please check:');
          console.log('   1. Printer is turned on and connected');
          console.log('   2. Printer has paper loaded');
          console.log('   3. Printer is set as default');
          console.log('   4. USB connection is working');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing thermal printer:', error);
  }
}

// Run the test
testThermalPrinter();
