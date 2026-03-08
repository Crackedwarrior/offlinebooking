import { getTheaterConfig } from '../../../config/theaterConfig';

/**
 * Ticket Formatter for ESC/POS Printing
 * Formats ticket data into text suitable for thermal printers
 */

/**
 * Helper function to center text within a given width
 */
function centerText(text: string, maxWidth: number): string {
  const padding = Math.max(0, Math.floor((maxWidth - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Helper function to right-align text with label and value
 */
function rightText(label: string, value: string, maxWidth: number): string {
  const text = `${label}: Rs.${value}`;
  const padding = Math.max(0, maxWidth - text.length);
  return ' '.repeat(padding) + text;
}

/**
 * Helper function to left-align text with padding
 */
function leftText(text: string, maxWidth: number): string {
  return text + ' '.repeat(Math.max(0, maxWidth - text.length));
}

/**
 * Create simple formatted ticket for PowerShell printing (58 char width)
 * Used for fallback printing when USB is not available
 */
export function createSimpleFormattedTicket(ticketData: any): string {
  // Create simple, wide text format for thermal printers
  const maxWidth = 58; // Wider format to fill thermal printer width
  
  let ticket = '';
  
  // Header - double lines
  ticket += '='.repeat(maxWidth) + '\n';
  ticket += centerText(getTheaterConfig().name, maxWidth) + '\n';
  ticket += centerText(getTheaterConfig().location, maxWidth) + '\n';
  ticket += '='.repeat(maxWidth) + '\n';
  
  // Ticket details
  ticket += leftText(`Date: ${ticketData.date || new Date().toLocaleDateString()}`, maxWidth) + '\n';
  ticket += leftText(`Time: ${ticketData.showTime || '2:00 PM'}`, maxWidth) + '\n';
  ticket += leftText(`Film: ${ticketData.movieName || 'MOVIE'}`, maxWidth) + '\n';
  ticket += leftText(`Class: ${ticketData.class || 'CLASS'}`, maxWidth) + '\n';
  ticket += leftText(`Seat: ${ticketData.seatId || 'A1'}`, maxWidth) + '\n';
  ticket += '-'.repeat(maxWidth) + '\n';
  
  // Pricing - right aligned
  ticket += rightText('Net', (ticketData.netAmount || 0).toString(), maxWidth) + '\n';
  ticket += rightText('CGST', (ticketData.cgst || 0).toString(), maxWidth) + '\n';
  ticket += rightText('SGST', (ticketData.sgst || 0).toString(), maxWidth) + '\n';
  ticket += rightText('MC', (ticketData.mc || 0).toString(), maxWidth) + '\n';
  ticket += '-'.repeat(maxWidth) + '\n';
  
  // Total
  ticket += centerText(`TOTAL: Rs.${ticketData.price || 0}`, maxWidth) + '\n';
  ticket += centerText(`ID: ${ticketData.transactionId || 'TXN' + Date.now()}`, maxWidth) + '\n';
  ticket += '-'.repeat(maxWidth) + '\n';
  
  // Footer
  ticket += centerText('THANK YOU FOR VISITING', maxWidth) + '\n';
  ticket += centerText(getTheaterConfig().name, maxWidth) + '\n';
  ticket += '='.repeat(maxWidth) + '\n';
  
  return ticket;
}

/**
 * Create formatted ticket for thermal printer (42 char width)
 * Optimized for EPSON TM-T81 thermal printer
 */
export function createFormattedTicket(ticketData: any): string {
  // Create properly formatted ticket text for thermal printer
  // EPSON TM-T81 supports 42 chars at 12 CPI (characters per inch) for 58mm paper
  const maxWidth = 42; // Optimized for EPSON TM-T81 thermal printer
  
  // Create separator line
  const separator = '='.repeat(maxWidth);
  const doubleLine = '█'.repeat(maxWidth);
  
  // Build formatted ticket
  let formatted = '';
  
  // Header with full width - centered and emphasized
  formatted += doubleLine + '\n';
  formatted += centerText(ticketData.theaterName || getTheaterConfig().name, maxWidth) + '\n';
  formatted += centerText(ticketData.location || getTheaterConfig().location, maxWidth) + '\n';
  formatted += doubleLine + '\n';
  
  // Movie and show details with full width formatting
  formatted += `Date: ${(ticketData.date || new Date().toLocaleDateString()).padEnd(maxWidth - 6)}\n`;
  formatted += `Time: ${(ticketData.showTime || '2:00 PM').padEnd(maxWidth - 6)}\n`;
  formatted += `Film: ${(ticketData.movieName || 'MOVIE').padEnd(maxWidth - 6)}\n`;
  formatted += `Class: ${(ticketData.class || 'CLASS').padEnd(maxWidth - 7)}\n`;
  formatted += `Seat: ${(ticketData.seatId || 'A1').padEnd(maxWidth - 6)}\n`;
  formatted += separator + '\n';
  
  // Pricing details with right alignment for professional look
  formatted += rightText('Net', (ticketData.netAmount || 0).toString(), maxWidth) + '\n';
  formatted += rightText('CGST', (ticketData.cgst || 0).toString(), maxWidth) + '\n';
  formatted += rightText('SGST', (ticketData.sgst || 0).toString(), maxWidth) + '\n';
  formatted += rightText('MC', (ticketData.mc || 0).toString(), maxWidth) + '\n';
  formatted += separator + '\n';
  
  // Total with emphasis and full width
  const totalText = `TOTAL: Rs.${ticketData.price || 0}`;
  formatted += centerText(totalText, maxWidth) + '\n';
  formatted += centerText(`ID: ${ticketData.transactionId || 'TXN' + Date.now()}`, maxWidth) + '\n';
  formatted += separator + '\n';
  
  // Footer with full width
  formatted += centerText('THANK YOU FOR VISITING', maxWidth) + '\n';
  formatted += centerText(ticketData.theaterName || getTheaterConfig().name, maxWidth) + '\n';
  formatted += doubleLine + '\n';
  
  // Debug: Log the formatted ticket to see what's actually being generated
  // Note: This debug logging is removed in production - use logger.debug() if needed
  
  return formatted;
}

