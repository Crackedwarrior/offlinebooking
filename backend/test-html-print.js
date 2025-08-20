// Test HTML printing (like browser Ctrl+P)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createHtmlContent() {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Movie Ticket</title>
    <style>
        @media print {
            body {
                width: 80mm;
                margin: 0;
                padding: 5mm;
                font-family: monospace;
                font-size: 12px;
                line-height: 1.2;
            }
            .header {
                text-align: center;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .divider {
                border-top: 1px solid #000;
                margin: 10px 0;
            }
            .left-align {
                text-align: left;
            }
            .right-align {
                text-align: right;
            }
            .center-align {
                text-align: center;
            }
            .seats {
                margin: 10px 0;
            }
            .total {
                font-weight: bold;
                margin-top: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        SREELEKHA THEATER<br>
        Chickmagalur<br>
        GSTIN: 29AAVFS7423E120
    </div>
    
    <div class="divider"></div>
    
    <div class="left-align">
        <strong>Movie:</strong> KALANK<br>
        <strong>Date:</strong> 20/8/2025<br>
        <strong>Time:</strong> 6:00 PM<br>
        <strong>Screen:</strong> Screen 1
    </div>
    
    <div class="seats">
        <strong>Seats:</strong><br>
        &nbsp;&nbsp;A-1 (₹100)<br>
        &nbsp;&nbsp;A-2 (₹100)<br>
        &nbsp;&nbsp;B-5 (₹120)<br>
        &nbsp;&nbsp;B-6 (₹120)
    </div>
    
    <div class="divider"></div>
    
    <div class="right-align total">
        Total: ₹440
    </div>
    
    <div class="center-align">
        Thank you for visiting!<br>
        Enjoy your movie!
    </div>
    
    <div class="divider"></div>
</body>
</html>`;
  
  return html;
}

function testHtmlPrint() {
  console.log('🖨️ Testing HTML Printing (Browser-style)...\n');
  
  try {
    // Create HTML content
    const htmlContent = createHtmlContent();
    
    console.log('📄 HTML Content Preview:');
    console.log('='.repeat(60));
    console.log(htmlContent.substring(0, 500) + '...');
    console.log('='.repeat(60));
    
    // Create HTML file
    const htmlFile = path.join(__dirname, 'temp', `ticket_${Date.now()}.html`);
    fs.writeFileSync(htmlFile, htmlContent);
    console.log(`\n💾 HTML file created: ${htmlFile}`);
    
    // Print using browser-style method
    console.log('\n🔄 Printing HTML content...');
    
    // Method 1: Use Start-Process with Print verb (like browser)
    const command = `powershell -Command "Start-Process -FilePath '${htmlFile}' -Verb Print -WindowStyle Hidden"`;
    
    console.log(`Command: ${command}`);
    execSync(command, { stdio: 'inherit' });
    
    console.log('\n✅ HTML print command executed!');
    console.log('📄 Check your printer - this should use FULL WIDTH like browser printing!');
    console.log('\n🔍 What to look for:');
    console.log('   • Full paper width utilization (like browser Ctrl+P)');
    console.log('   • Proper formatting and alignment');
    console.log('   • Professional appearance');
    console.log('   • Text spanning the entire width');
    
    // Clean up after a delay
    setTimeout(() => {
      if (fs.existsSync(htmlFile)) {
        fs.unlinkSync(htmlFile);
        console.log('\n🧹 HTML file cleaned up');
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testHtmlPrint();
