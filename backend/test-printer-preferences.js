// Test Printer Preferences Setup (Based on successful manual settings)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createTicketContent() {
  const PAPER_WIDTH = 48; // Increased for better alignment
  
  // Helper function to center text
  const centerText = (text) => {
    const padding = Math.max(0, Math.floor((PAPER_WIDTH - text.length) / 2));
    return ' '.repeat(padding) + text;
  };
  
  // Helper function to create full-width line
  const fullWidthLine = (char = '-') => char.repeat(PAPER_WIDTH);
  
  // Helper function to create label-value pairs (label left, value right)
  const labelValue = (label, value) => {
    const padding = Math.max(0, PAPER_WIDTH - label.length - value.length);
    return label + ' '.repeat(padding) + value;
  };
  
  // Generate ticket ID
  const ticketId = `TKT${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
  
  // Calculate tax breakdown
  const totalAmount = 150.00;
  const baseAmount = totalAmount / 1.18;
  const cgst = (baseAmount * 0.09).toFixed(2);
  const sgst = (baseAmount * 0.09).toFixed(2);
  const mc = 2.00;
  const net = (baseAmount - mc).toFixed(2);
  
  const ticketDate = '06/08/2025';
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour12: true, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const lines = [
    centerText('SREELEKHA THEATER'),
    centerText('Chickmagalur'),
    centerText('GSTIN: 29AAVFS7423E120'),
    fullWidthLine('-'),
    labelValue('Date:', '06/08/2025'),
    labelValue('SHOWTIME:', '02:45 PM'),
    labelValue('Film:', 'Mahavatar Narsimha'),
    labelValue('Class:', 'STAR'),
    labelValue('Row:', 'A'),
    labelValue('SeatNo:', '18'),
    fullWidthLine('-'),
    `[NET: ${net}]`,
    `[CGST: ${cgst}]`,
    `[SGST: ${sgst}]`,
    `[MC: ${mc.toFixed(2)}]`,
    fullWidthLine('-'),
    centerText(`Ticket Cost: ₹${totalAmount.toFixed(2)}`),
    fullWidthLine('-'),
    `${ticketDate} / ${currentTime}`,
    ticketId,
    fullWidthLine('-')
  ];
  
  return lines.join('\n');
}

function setPrinterPreferences() {
  console.log('🔧 Setting Printer Preferences...\n');
  
  const printerName = 'EPSON TM-T81 ReceiptE4';
  
  try {
    // Method 1: Use rundll32 to open printer properties
    console.log('1️⃣ Opening printer properties dialog...');
    const propertiesCommand = `rundll32 printui.dll,PrintUIEntry /p /n "${printerName}"`;
    console.log(`Command: ${propertiesCommand}`);
    execSync(propertiesCommand, { stdio: 'inherit' });
    console.log('✅ Printer properties dialog opened!');
    console.log('📝 Please manually set:');
    console.log('   - Paper Conservation: Top & Bottom');
    console.log('   - Paper Size: 100mm × 95mm');
    console.log('   - Print Position: 0.0mm');
    console.log('   - Click OK to save settings');
    
  } catch (error) {
    console.log('❌ Failed to open printer properties:', error.message);
  }
}

function testPrintWithPreferences() {
  console.log('\n🖨️ Testing Print with Optimized Preferences...\n');
  
  try {
    // Create ticket content
    const ticketContent = createTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `preferences_test_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Method 1: Use Start-Process to print with current preferences
    console.log('\n1️⃣ Testing print with current preferences:');
    try {
      const printCommand = `start "" "${ticketFile}"`;
      console.log(`Command: ${printCommand}`);
      execSync(printCommand, { stdio: 'inherit' });
      console.log('✅ File opened! Now press Ctrl+P to print with your optimized settings');
    } catch (error) {
      console.log('❌ Failed to open file:', error.message);
    }
    
    // Method 2: Try direct print with rundll32 (should use saved preferences)
    console.log('\n2️⃣ Testing direct print (should use saved preferences):');
    try {
      const rundllCommand = `rundll32 printui.dll,PrintUIEntry /k /n "${printerName}" "${ticketFile}"`;
      console.log(`Command: ${rundllCommand}`);
      execSync(rundllCommand, { stdio: 'inherit' });
      console.log('✅ Direct print executed!');
    } catch (error) {
      console.log('❌ Direct print failed:', error.message);
    }
    
    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    console.log('🖨️ The file should now print with your optimized settings!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function main() {
  console.log('🎯 Printer Preferences Optimization Test\n');
  console.log('Based on your successful manual settings:\n');
  console.log('✅ Paper Conservation: Top & Bottom');
  console.log('✅ Paper Size: 100mm × 95mm');
  console.log('✅ Print Position: 0.0mm\n');
  
  // First, help set up the preferences
  setPrinterPreferences();
  
  // Wait a bit for user to configure
  console.log('\n⏳ Waiting 10 seconds for you to configure printer settings...');
  setTimeout(() => {
    testPrintWithPreferences();
  }, 10000);
}

main();
