const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Test scenarios with different ticket data
const testScenarios = [
  {
    name: 'Single Ticket - Kannada',
    tickets: [{
      theaterName: 'ಶ್ರೀಲೇಖಾ ಚಿತ್ರಮಂದಿರ',
      location: 'ಚಿಕ್ಕಮಗಳೂರು',
      gstin: '29AAVFS7423E120',
      date: '06/08/2025',
      showTime: '02:45PM',
      showClass: 'ಮ್ಯಾಟಿನಿ ಶೋ',
      movieName: 'ಅವೆಂಜರ್ಸ್ ಇನ್ಫಿನಿಟಿ ವಾರ್ (ಇಂಗ್ಲಿಷ್) (3-D) 4 ಶೋಗಳು',
      seatClass: 'ಕ್ಲಾಸಿಕ್ ಬಾಲ್ಕನಿ',
      seatInfo: 'A 15-16 (2)', // English seat numbers
      net: '250.24',
      cgst: '22.88',
      sgst: '22.88',
      mc: '4.00',
      totalAmount: '300.00',
      ticketId: 'TKT1000000', // English ticket ID
      currentTime: '10:07AM'
    }]
  },
  {
    name: 'Multiple Tickets - Different Classes',
    tickets: [
      {
        theaterName: 'ಶ್ರೀಲೇಖಾ ಚಿತ್ರಮಂದಿರ',
        location: 'ಚಿಕ್ಕಮಗಳೂರು',
        gstin: '29AAVFS7423E120',
        date: '06/08/2025',
        showTime: '06:30PM',
        showClass: 'ಸಂಜೆ ಶೋ',
        movieName: 'ಮಹಾವತಾರ್ ನರಸಿಂಹ (ಕನ್ನಡ) (2-D)',
        seatClass: 'ಸ್ಟಾರ್',
        seatInfo: 'B 5 (1)',
        net: '125.12',
        cgst: '11.44',
        sgst: '11.44',
        mc: '2.00',
        totalAmount: '150.00',
        ticketId: 'TKT1000001',
        currentTime: '02:15PM'
      },
      {
        theaterName: 'ಶ್ರೀಲೇಖಾ ಚಿತ್ರಮಂದಿರ',
        location: 'ಚಿಕ್ಕಮಗಳೂರು',
        gstin: '29AAVFS7423E120',
        date: '06/08/2025',
        showTime: '06:30PM',
        showClass: 'ಸಂಜೆ ಶೋ',
        movieName: 'ಮಹಾವತಾರ್ ನರಸಿಂಹ (ಕನ್ನಡ) (2-D)',
        seatClass: 'ಕ್ಲಾಸಿಕ್ ಬಾಲ್ಕನಿ',
        seatInfo: 'C 12-14 (3)',
        net: '375.36',
        cgst: '34.32',
        sgst: '34.32',
        mc: '6.00',
        totalAmount: '450.00',
        ticketId: 'TKT1000002',
        currentTime: '02:15PM'
      }
    ]
  },
  {
    name: 'Long Movie Name Test',
    tickets: [{
      theaterName: 'ಶ್ರೀಲೇಖಾ ಚಿತ್ರಮಂದಿರ',
      location: 'ಚಿಕ್ಕಮಗಳೂರು',
      gstin: '29AAVFS7423E120',
      date: '06/08/2025',
      showTime: '10:30AM',
      showClass: 'ಬೆಳಗಿನ ಶೋ',
      movieName: 'ಸೂಪರ್ ಹೀರೋ ಅಡ್ವೆಂಚರ್ ಮೂವಿ ಟೈಟಲ್ ವಿತ್ ವೆರಿ ಲಾಂಗ್ ನೇಮ್ (ಇಂಗ್ಲಿಷ್) (3-D) 4 ಶೋಗಳು',
      seatClass: 'ವಿಐಪಿ',
      seatInfo: 'D 1-2 (2)',
      net: '500.48',
      cgst: '45.76',
      sgst: '45.76',
      mc: '8.00',
      totalAmount: '600.00',
      ticketId: 'TKT1000003',
      currentTime: '08:45AM'
    }]
  }
];

// HTML template for ticket
function generateTicketHTML(ticketData) {
  return `
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
          padding-left: 70px;
          font-size: 40px;
          line-height: 1.2;
          color: black;
          background: white;
          width: 280px;
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
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .location {
          font-size: 22px;
          margin-bottom: 5px;
        }
        
        .gstin {
          font-size: 20px;
        }
        
        .info-row {
          margin: 4px 0;
          font-size: 22px;
        }
        
        .class-seat-box {
          border: 1px solid #000;
          padding: 5px;
          margin: 10px 0;
        }
        
        .tax-row {
          margin: 4px 0;
          font-size: 20px;
        }
        
        .tax-row-container {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
          align-items: baseline;
        }
        
        .tax-item-main {
          font-size: 20px;
          width: 48%;
          text-align: left;
          display: inline-block;
          white-space: nowrap;
        }
        
        .total-box {
          border: 1px solid #000;
          padding: 5px;
          text-align: center;
          margin: 10px 0;
        }
        
        .total-amount {
          font-size: 32px;
          font-weight: bold;
        }
        
        .ticket-id {
          text-align: center;
          font-size: 22px;
          margin: 10px 0;
        }
        
        .dotted-line {
          border-top: 2px dotted #000;
          margin: 10px 0;
        }
        
        .stub {
          font-size: 24px;
          text-align: center;
        }
        
        .stub-row {
          margin: 2px 0;
          line-height: 1.2;
          font-size: 20px;
        }
        
        .tax-breakdown {
          display: flex;
          justify-content: space-between;
          font-size: 18px;
          margin: 5px 0;
        }
        
        .tax-item {
          text-align: center;
          flex: 1;
          font-size: 18px;
        }
        
        .page-break {
          page-break-after: always;
        }
      </style>
    </head>
    <body>
      ${ticketData.map((ticket, index) => `
        <!-- Ticket ${index + 1} -->
        <div class="ticket ${index < ticketData.length - 1 ? 'page-break' : ''}">
          <div class="theater-box">
            <div class="theater-name">${ticket.theaterName}</div>
            <div class="location">${ticket.location}</div>
            <div class="gstin">GSTIN:${ticket.gstin}</div>
          </div>
          
          <div class="info-row"><span style="font-weight: bold;">ದಿನಾಂಕ:</span> ${ticket.date}</div>
          <div class="info-row"><span style="font-weight: bold;">${ticket.showClass}:</span> ${ticket.showTime}</div>
          <div class="info-row"><span style="font-weight: bold;">ಚಲನಚಿತ್ರ:</span> ${ticket.movieName}</div>
          
          <div class="class-seat-box">
            <div class="info-row" style="font-weight: bold;">ವರ್ಗ: ${ticket.seatClass}</div>
            <div class="info-row" style="font-weight: bold;">ಸೀಟ್: ${ticket.seatInfo}</div>
          </div>
          
          <div class="tax-row-container">
            <div class="tax-item-main">ನಿವ್ವಳ: ₹${ticket.net}</div>
            <div class="tax-item-main">ಸಿಜಿಎಸ್ಟಿ: ₹${ticket.cgst}</div>
          </div>
          <div class="tax-row-container">
            <div class="tax-item-main">ಎಸ್ಜಿಎಸ್ಟಿ: ₹${ticket.sgst}</div>
            <div class="tax-item-main">ಎಂಸಿ: ₹${ticket.mc}</div>
          </div>
          
          <div class="total-box">
            <div class="total-amount">ಒಟ್ಟು: ₹${ticket.totalAmount}</div>
          </div>
          
          <div class="ticket-id">S.No: ${ticket.ticketId} / ${ticket.currentTime}</div>
        </div>
        
        <!-- Tear-off Stub Section -->
        <div class="dotted-line"></div>
        
        <div class="stub">
          <div class="stub-row" style="font-weight: bold;">${ticket.theaterName}</div>
          <div class="stub-row">${ticket.movieName.split(' ').slice(0, 3).join(' ')}</div>
          <div class="stub-row">ದಿನಾಂಕ: ${ticket.date} | ${ticket.showClass}: ${ticket.showTime}</div>
          <div class="stub-row">ವರ್ಗ: ${ticket.seatClass} | ಸೀಟ್: ${ticket.seatInfo}</div>
          
          <div class="tax-breakdown">
            <div class="tax-item">ನಿವ್ವಳ:₹${ticket.net}</div>
            <div class="tax-item">ಸಿಜಿಎಸ್ಟಿ:₹${ticket.cgst}</div>
            <div class="tax-item">ಎಸ್ಜಿಎಸ್ಟಿ:₹${ticket.sgst}</div>
            <div class="tax-item">ಎಂಸಿ:₹${ticket.mc}</div>
          </div>
          
          <div class="stub-row" style="font-weight: bold; font-size: 18px;">ಒಟ್ಟು: ₹${ticket.totalAmount}</div>
          <div class="stub-row" style="font-size: 14px;">S.No: ${ticket.ticketId} / ${ticket.currentTime}</div>
        </div>
      `).join('')}
    </body>
    </html>
  `;
}

async function generateTestTickets() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport for thermal printer size
      await page.setViewport({ width: 320, height: 1500 });
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, 'temp'))) {
    fs.mkdirSync(path.join(__dirname, 'temp'));
  }
  
  console.log('🎟️ Generating test tickets...\n');
  
  for (const scenario of testScenarios) {
    console.log(`📄 Generating: ${scenario.name}`);
    
    const htmlContent = generateTicketHTML(scenario.tickets);
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const outputFilePath = path.join(__dirname, 'temp', `test_${scenario.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.pdf`);
    
    await page.pdf({
      path: outputFilePath,
      width: '320px',
      height: '1500px',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      }
    });
    
         console.log(`✅ Generated: ${outputFilePath}`);
     
     // Print the PDF using SumatraPDF
     console.log('🖨️ Printing ticket...');
     exec(`"C:\\Program Files\\SumatraPDF\\SumatraPDF.exe" -print-to-default "${outputFilePath}"`, (error, stdout, stderr) => {
       if (error) {
         console.log(`❌ Print error: ${error.message}`);
         console.log('💡 Trying alternative SumatraPDF path...');
         // Try alternative path
         exec(`"C:\\Users\\Hi\\AppData\\Local\\SumatraPDF\\SumatraPDF.exe" -print-to-default "${outputFilePath}"`, (error2, stdout2, stderr2) => {
           if (error2) {
             console.log(`❌ Alternative print error: ${error2.message}`);
             console.log('💡 You can print it manually by opening the PDF');
           } else {
             console.log('✅ Print command sent successfully!');
           }
         });
       } else {
         console.log('✅ Print command sent successfully!');
       }
     });
     
           // PDF generated and sent to print - no preview needed
    
    console.log('');
  }
  
  await browser.close();
  console.log('🎉 All test tickets generated successfully!');
  console.log('📁 Check the "temp" folder for all PDF files');
  console.log('🖨️ You can print them manually or test the layout');
}

// Run the test
generateTestTickets().catch(console.error);
