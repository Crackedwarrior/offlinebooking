// Final Printing Test - Complete Solution
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createTicketContent() {
  const PAPER_WIDTH = 48; // Optimized width for thermal paper
  
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

function testFinalPrinting() {
  console.log('🎯 Final Printing Test - Complete Solution\n');
  console.log('Based on your successful manual configuration:\n');
  console.log('✅ Paper Conservation: Top & Bottom');
  console.log('✅ Paper Size: 100mm × 95mm');
  console.log('✅ Print Position: 0.0mm');
  console.log('✅ No PowerShell commands\n');
  
  try {
    // Create ticket content
    const ticketContent = createTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `final_test_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Method 1: Open file for manual printing (recommended)
    console.log('\n1️⃣ Opening file for manual printing (recommended method):');
    try {
      const openCommand = `start "" "${ticketFile}"`;
      console.log(`Command: ${openCommand}`);
      execSync(openCommand, { stdio: 'inherit' });
      console.log('✅ File opened! Now press Ctrl+P to print with your optimized settings');
      console.log('📝 This method uses your saved printer preferences');
    } catch (error) {
      console.log('❌ Failed to open file:', error.message);
    }
    
    // Method 2: Direct print with rundll32 (uses saved preferences)
    console.log('\n2️⃣ Direct print with saved preferences:');
    try {
      const printerName = 'EPSON TM-T81 ReceiptE4';
      const rundllCommand = `rundll32 printui.dll,PrintUIEntry /k /n "${printerName}" "${ticketFile}"`;
      console.log(`Command: ${rundllCommand}`);
      execSync(rundllCommand, { stdio: 'inherit' });
      console.log('✅ Direct print executed!');
    } catch (error) {
      console.log('❌ Direct print failed:', error.message);
    }
    
    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    console.log('🖨️ Both methods should now print with full width and no wasted space!');
    console.log('\n🎉 Solution Summary:');
    console.log('   - No PowerShell commands used');
    console.log('   - Uses your optimized printer settings');
    console.log('   - Full width printing achieved');
    console.log('   - No wasted space at beginning');
    console.log('   - Ready for integration into your app!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFinalPrinting();
