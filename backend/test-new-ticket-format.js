// Test New Ticket Format
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function createTicketContent() {
  const PAPER_WIDTH = 40; // Optimal width for thermal paper
  
  // Helper function to center text
  const centerText = (text) => {
    const padding = Math.max(0, Math.floor((PAPER_WIDTH - text.length) / 2));
    return ' '.repeat(padding) + text;
  };
  
  // Helper function to create full-width line
  const fullWidthLine = (char = '=') => char.repeat(PAPER_WIDTH);
  
  // Helper function to create label-value pairs (label left, value right)
  const labelValue = (label, value) => {
    const padding = Math.max(0, PAPER_WIDTH - label.length - value.length);
    return label + ' '.repeat(padding) + value;
  };
  
  // Generate ticket ID in correct format (TKT + 6 digits)
  const ticketId = `TKT${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
  
  // Calculate tax breakdown (assuming 18% GST)
  const totalAmount = 150.00;
  const baseAmount = totalAmount / 1.18;
  const cgst = (baseAmount * 0.09).toFixed(2);
  const sgst = (baseAmount * 0.09).toFixed(2);
  const mc = 2.00; // Merchant commission
  const net = (baseAmount - mc).toFixed(2);
  
  // Format date and time - use the ticket date, not current date
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

function testNewTicketFormat() {
  console.log('🖨️ Testing New Ticket Format...\n');
  
  try {
    // Create ticket content with new format
    const ticketContent = createTicketContent();
    
    // Save to file
    const ticketFile = path.join(__dirname, 'temp', `new_format_${Date.now()}.txt`);
    fs.writeFileSync(ticketFile, ticketContent);
    console.log(`💾 Ticket file created: ${ticketFile}`);
    
    // Show preview
    console.log('\n📄 New Ticket Format Preview:');
    console.log('='.repeat(50));
    console.log(ticketContent);
    console.log('='.repeat(50));
    
    // Print using PowerShell Start-Process
    console.log('\n🔄 Printing new format ticket...');
    try {
      const printCommand = `powershell -Command "Start-Process -FilePath '${ticketFile}' -Verb Print"`;
      execSync(printCommand, { stdio: 'inherit' });
      console.log('✅ New format ticket printed!');
      console.log('📄 Check your printer for the new ticket format');
    } catch (error) {
      console.log('❌ Print failed:', error.message);
      console.log(`\n📄 Ticket file created: ${ticketFile}`);
      console.log('🖨️ Please open the file and try Ctrl+P manually');
    }
    
    // Keep file for manual testing
    console.log(`\n📄 Ticket file preserved: ${ticketFile}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewTicketFormat();
