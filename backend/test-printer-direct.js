// Direct printer test
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function testDirectPrint() {
  console.log('🖨️ Testing Direct Printer Communication...\n');
  
  try {
    // Create a simple test file
    const testContent = `
==========================================
           PRINTER TEST
==========================================
Date: ${new Date().toLocaleString()}
Status: Testing direct communication
==========================================
    `;
    
    const testFile = path.join(__dirname, 'temp', `direct_test_${Date.now()}.txt`);
    fs.writeFileSync(testFile, testContent);
    console.log(`💾 Test file created: ${testFile}`);
    
    // Try different printing methods
    const methods = [
      {
        name: 'Method 1: Out-Printer',
        command: `powershell -Command "Get-Content '${testFile}' | Out-Printer -Name 'EPSON TM-T81'"`
      },
      {
        name: 'Method 2: Start-Process Print',
        command: `powershell -Command "Start-Process -FilePath '${testFile}' -Verb Print"`
      },
      {
        name: 'Method 3: Copy to printer',
        command: `powershell -Command "Copy-Item '${testFile}' -Destination 'EPSON TM-T81'"`
      },
      {
        name: 'Method 4: Raw print',
        command: `powershell -Command "Get-Content '${testFile}' -Raw | Out-Printer -Name 'EPSON TM-T81'"`
      }
    ];
    
    for (const method of methods) {
      console.log(`\n🔄 Trying ${method.name}...`);
      try {
        execSync(method.command, { stdio: 'inherit', timeout: 10000 });
        console.log(`✅ ${method.name} executed successfully`);
        console.log('📄 Check your printer for output!');
        break;
      } catch (error) {
        console.log(`❌ ${method.name} failed: ${error.message}`);
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

testDirectPrint();
