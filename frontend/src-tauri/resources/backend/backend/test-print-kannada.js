const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Test ticket data - mixed Kannada and English
const ticketData = {
  theaterName: 'ಶ್ರೀಲೇಖಾ ಥಿಯೇಟರ್',
  location: 'ಚಿಕ್ಕಮಗಳೂರು',
  gstin: '29AAVFS7423E120',
  date: '06/08/2025',
  showTime: '02:45PM',
  showClass: 'ಮ್ಯಾಟಿನಿ ಶೋ',
  movieName: 'ಅವೆಂಜರ್ಸ್ ಇನ್ಫಿನಿಟಿ ವಾರ್ (ಇಂಗ್ಲಿಷ್) (3-D) 4 ಶೋಗಳು',
  seatClass: 'ಕ್ಲಾಸಿಕ್ ಬಾಲ್ಕನಿ',
  seatInfo: 'A 15-16 (2)', // This will be in English
  net: '250.24',
  cgst: '22.88',
  sgst: '22.88',
  mc: '4.00',
  totalAmount: '300.00',
  ticketId: 'TKT1000000', // This will be in English
  currentTime: '10:07AM'
};

async function createAndPrintPDFTicket(ticketData) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport for thermal printer size
  await page.setViewport({ width: 250, height: 500 });
  
  // Create HTML content with proper Unicode support
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Movie Ticket</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;700&display=swap');
        
        body {
          font-family: 'Noto Sans Kannada', 'Arial Unicode MS', 'Segoe UI', sans-serif;
          margin: 0;
          padding: 10px;
          font-size: 12px;
          line-height: 1.2;
          color: black;
          background: white;
          width: 230px;
        }
        
        .ticket {
          border: 1px solid #000;
          padding: 5px;
          margin-bottom: 10px;
        }
        
        .theater-box {
          border: 1px solid #000;
          padding: 5px;
          text-align: center;
          margin-bottom: 10px;
        }
        
        .theater-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .location {
          font-size: 10px;
          margin-bottom: 5px;
        }
        
        .gstin {
          font-size: 8px;
        }
        
        .info-row {
          margin: 2px 0;
          font-size: 10px;
        }
        
        .class-seat-box {
          border: 1px solid #000;
          padding: 5px;
          margin: 10px 0;
        }
        
        .tax-row {
          margin: 2px 0;
          font-size: 8px;
        }
        
        .total-box {
          border: 1px solid #000;
          padding: 5px;
          text-align: center;
          margin: 10px 0;
        }
        
        .total-amount {
          font-size: 14px;
          font-weight: bold;
        }
        
        .ticket-id {
          text-align: center;
          font-size: 8px;
          margin: 10px 0;
        }
        
        .dotted-line {
          border-top: 2px dotted #000;
          margin: 10px 0;
        }
        
        .stub {
          font-size: 10px;
          text-align: center;
        }
        
        .stub-row {
          margin: 2px 0;
        }
        
        .tax-breakdown {
          display: flex;
          justify-content: space-between;
          font-size: 7px;
          margin: 5px 0;
        }
        
        .tax-item {
          text-align: center;
          flex: 1;
        }
      </style>
    </head>
    <body>
      <!-- Main Ticket Section -->
      <div class="ticket">
        <div class="theater-box">
          <div class="theater-name">${ticketData.theaterName}</div>
          <div class="location">${ticketData.location}</div>
          <div class="gstin">GSTIN:${ticketData.gstin}</div>
        </div>
        
        <div class="info-row">ದಿನಾಂಕ: ${ticketData.date}</div>
        <div class="info-row">ಮ್ಯಾಟಿನಿ ಶೋ: ${ticketData.showTime}</div>
        <div class="info-row">ಚಲನಚಿತ್ರ: ${ticketData.movieName}</div>
        
        <div class="class-seat-box">
          <div class="info-row">ವರ್ಗ: ${ticketData.seatClass}</div>
          <div class="info-row">ಸೀಟ್: ${ticketData.seatInfo}</div>
        </div>
        
        <div class="tax-row">ನಿವ್ವಳ: ₹${ticketData.net}</div>
        <div class="tax-row">ಸಿಜಿಎಸ್ಟಿ: ₹${ticketData.cgst}</div>
        <div class="tax-row">ಎಸ್ಜಿಎಸ್ಟಿ: ₹${ticketData.sgst}</div>
        <div class="tax-row">ಎಂಸಿ: ₹${ticketData.mc}</div>
        
        <div class="total-box">
          <div class="total-amount">ಒಟ್ಟು: ₹${ticketData.totalAmount}</div>
        </div>
        
        <div class="ticket-id">S.No: ${ticketData.ticketId} / ${ticketData.currentTime}</div>
      </div>
      
      <!-- Tear-off Stub Section -->
      <div class="dotted-line"></div>
      
      <div class="stub">
        <div class="stub-row">${ticketData.theaterName}</div>
        <div class="stub-row">${ticketData.movieName.split(' ').slice(0, 3).join(' ')}</div>
        <div class="stub-row">ದಿನಾಂಕ: ${ticketData.date} | ಮ್ಯಾಟಿನಿ ಶೋ: ${ticketData.showTime}</div>
        <div class="stub-row">ವರ್ಗ: ${ticketData.seatClass} | ಸೀಟ್: ${ticketData.seatInfo}</div>
        
        <div class="tax-breakdown">
          <div class="tax-item">ನಿವ್ವಳ:₹${ticketData.net}</div>
          <div class="tax-item">ಸಿಜಿಎಸ್ಟಿ:₹${ticketData.cgst}</div>
          <div class="tax-item">ಎಸ್ಜಿಎಸ್ಟಿ:₹${ticketData.sgst}</div>
          <div class="tax-item">ಎಂಸಿ:₹${ticketData.mc}</div>
        </div>
        
        <div class="stub-row" style="font-weight: bold; font-size: 12px;">ಒಟ್ಟು: ₹${ticketData.totalAmount}</div>
        <div class="stub-row" style="font-size: 8px;">S.No: ${ticketData.ticketId}</div>
      </div>
    </body>
    </html>
  `;
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  // Generate PDF
  const outputFilePath = path.join(__dirname, 'temp', `test_print_kannada_${Date.now()}.pdf`);
  if (!fs.existsSync(path.join(__dirname, 'temp'))) {
    fs.mkdirSync(path.join(__dirname, 'temp'));
  }
  
  await page.pdf({
    path: outputFilePath,
    width: '250px',
    height: '500px',
    printBackground: true,
    margin: {
      top: '0',
      right: '0',
      bottom: '0',
      left: '0'
    }
  });
  
  await browser.close();
  console.log(`PDF generated at: ${outputFilePath}`);
  
  // Print the PDF using SumatraPDF
  const sumatraPath = 'C:\\Users\\Hi\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\SumatraPDF\\SumatraPDF.exe';
  
  console.log('🖨️ Printing Kannada ticket...');
  
  exec(`"${sumatraPath}" -print-to-default "${outputFilePath}"`, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Print error:', error.message);
      console.log('📄 PDF saved at:', outputFilePath);
      console.log('💡 You can print it manually by opening the PDF');
    } else {
      console.log('✅ Print command sent successfully!');
      console.log('📄 PDF also saved at:', outputFilePath);
    }
  });
}

createAndPrintPDFTicket(ticketData).catch(console.error);
