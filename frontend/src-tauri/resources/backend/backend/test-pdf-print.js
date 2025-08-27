// Test PDF printing using PDF viewer (like browser Ctrl+P)
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

async function testPdfPrint() {
  console.log('🖨️ Testing PDF Printing with PDF Viewer...\n');
  
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
    
    // Method 1: Try using Adobe Reader (if installed)
    console.log('\n🔄 Printing PDF via Adobe Reader...');
    try {
      const adobeCommand = `"C:\\Program Files (x86)\\Adobe\\Acrobat Reader DC\\Reader\\AcroRd32.exe" /t "${pdfFile}" "EPSON TM-T81"`;
      execSync(adobeCommand, { stdio: 'inherit' });
      console.log('✅ Adobe Reader print command executed!');
    } catch (adobeError) {
      console.log('❌ Adobe Reader not found, trying alternative...');
      
      // Method 2: Try using Microsoft Edge (built-in PDF viewer)
      try {
        const edgeCommand = `start msedge --kiosk-printing "${pdfFile}"`;
        execSync(edgeCommand, { stdio: 'inherit' });
        console.log('✅ Microsoft Edge print command executed!');
      } catch (edgeError) {
        console.log('❌ Microsoft Edge method failed, trying Chrome...');
        
        // Method 3: Try using Chrome
        try {
          const chromeCommand = `start chrome --kiosk-printing "${pdfFile}"`;
          execSync(chromeCommand, { stdio: 'inherit' });
          console.log('✅ Chrome print command executed!');
        } catch (chromeError) {
          console.log('❌ Chrome method failed, trying direct print...');
          
          // Method 4: Try direct print command
          try {
            const directCommand = `rundll32 printui.dll,PrintUIEntry /k /n "EPSON TM-T81" "${pdfFile}"`;
            execSync(directCommand, { stdio: 'inherit' });
            console.log('✅ Direct print command executed!');
          } catch (directError) {
            console.log('❌ All PDF printing methods failed');
            console.log('📄 PDF file created successfully. You can manually open and print it.');
            console.log(`📁 PDF location: ${pdfFile}`);
          }
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
    }, 15000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPdfPrint();
