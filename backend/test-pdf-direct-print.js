// Test direct PDF printing to EPSON printer
const puppeteer = require('puppeteer');
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
        body {
            width: 80mm;
            margin: 0;
            padding: 5mm;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.2;
            background: white;
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

async function testPdfDirectPrint() {
  console.log('🖨️ Testing Direct PDF Printing to EPSON...\n');
  
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
    
    // Generate PDF using Puppeteer
    console.log('\n🔄 Generating PDF...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Load HTML content
    await page.setContent(htmlContent);
    
    // Generate PDF with FIXED parameters
    const pdfFile = path.join(__dirname, 'temp', `ticket_${Date.now()}.pdf`);
    await page.pdf({
      path: pdfFile,
      width: '80mm',
      height: '200mm',
      printBackground: true,
      margin: {
        top: '5mm',
        right: '5mm',
        bottom: '5mm',
        left: '5mm'
      }
    });
    
    await browser.close();
    console.log(`💾 PDF file created: ${pdfFile}`);
    
    // Method 1: Use Adobe Reader with direct printer specification
    console.log('\n🔄 Printing PDF directly to EPSON printer...');
    try {
      const adobeCommand = `"C:\\Program Files (x86)\\Adobe\\Acrobat Reader DC\\Reader\\AcroRd32.exe" /t "${pdfFile}" "EPSON TM-T81"`;
      execSync(adobeCommand, { stdio: 'inherit' });
      console.log('✅ Adobe Reader direct print executed!');
    } catch (adobeError) {
      console.log('❌ Adobe Reader not found, trying alternative...');
      
      // Method 2: Use PowerShell to print PDF directly to printer
      try {
        const psCommand = `powershell -Command "Add-Type -AssemblyName System.Printing; $printer = New-Object System.Printing.PrintServer; $queue = $printer.GetPrintQueue('EPSON TM-T81'); $queue.AddJob('${pdfFile}')"`;
        execSync(psCommand, { stdio: 'inherit' });
        console.log('✅ PowerShell direct print executed!');
      } catch (psError) {
        console.log('❌ PowerShell method failed, trying Edge with printer...');
        
        // Method 3: Use Edge with specific printer
        try {
          const edgeCommand = `start msedge --kiosk-printing "${pdfFile}" --printer-name="EPSON TM-T81"`;
          execSync(edgeCommand, { stdio: 'inherit' });
          console.log('✅ Edge direct print executed!');
        } catch (edgeError) {
          console.log('❌ Edge method failed, trying manual approach...');
          
          // Method 4: Open PDF and instruct user to print manually
          console.log('\n📄 PDF generated successfully!');
          console.log(`📁 PDF location: ${pdfFile}`);
          console.log('\n🖨️ To print manually:');
          console.log('1. Open the PDF file above');
          console.log('2. Press Ctrl+P');
          console.log('3. Select "EPSON TM-T81" as printer');
          console.log('4. Click Print');
          console.log('\nThis should give you the same full-width results as browser Ctrl+P!');
        }
      }
    }
    
    console.log('\n📄 Check your printer - this should use FULL WIDTH like browser printing!');
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
      if (fs.existsSync(pdfFile)) {
        fs.unlinkSync(pdfFile);
        console.log('🧹 PDF file cleaned up');
      }
    }, 20000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPdfDirectPrint();
