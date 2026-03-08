import { getTheaterConfig } from '../../../config/theaterConfig';

/**
 * ESC/POS Command Formatter
 * Generates ESC/POS binary commands for thermal printers
 */

/**
 * Create ESC/POS binary commands for thermal printer
 */
export function createEscposCommands(ticketData: any): Buffer {
  // Create proper ESC/POS commands for thermal printer
  const commands: number[] = [];
  
  // Initialize printer
  commands.push(0x1B, 0x40); // ESC @
  
  // Set character code table
  commands.push(0x1B, 0x74, 0x00); // ESC t 0
  
  // Set character set
  commands.push(0x1B, 0x52, 0x00); // ESC R 0
  
  // Set line spacing
  commands.push(0x1B, 0x32); // ESC 2
  
  // Header - Center alignment, bold, double size
  commands.push(0x1B, 0x61, 0x01); // ESC a 1 (center)
  commands.push(0x1B, 0x45, 0x01); // ESC E 1 (bold)
  commands.push(0x1B, 0x21, 0x10); // ESC ! 16 (double height & width)
  
  // Add theater name
  const theaterName = ticketData.theaterName || getTheaterConfig().name;
  commands.push(...Buffer.from(theaterName + '\n', 'ascii'));
  
  // Add location
  const location = ticketData.location || getTheaterConfig().location;
  commands.push(...Buffer.from(location + '\n', 'ascii'));
  
  // Draw line
  commands.push(0x1B, 0x61, 0x00); // ESC a 0 (left align)
  commands.push(0x1B, 0x45, 0x00); // ESC E 0 (normal)
  commands.push(0x1B, 0x21, 0x00); // ESC ! 0 (normal size)
  
  // Draw separator line
  const separator = '='.repeat(42);
  commands.push(...Buffer.from(separator + '\n', 'ascii'));
  
  // Ticket details - left aligned, normal size
  const date = `Date: ${ticketData.date || new Date().toLocaleDateString()}\n`;
  commands.push(...Buffer.from(date, 'ascii'));
  
  const time = `Time: ${ticketData.showTime || '2:00 PM'}\n`;
  commands.push(...Buffer.from(time, 'ascii'));
  
  const film = `Film: ${ticketData.movieName || 'MOVIE'}\n`;
  commands.push(...Buffer.from(film, 'ascii'));
  
  const class_ = `Class: ${ticketData.class || 'CLASS'}\n`;
  commands.push(...Buffer.from(class_, 'ascii'));
  
  const seat = `Seat: ${ticketData.seatId || 'A1'}\n`;
  commands.push(...Buffer.from(seat, 'ascii'));
  
  // Draw separator line
  commands.push(...Buffer.from(separator + '\n', 'ascii'));
  
  // Pricing details - right aligned
  commands.push(0x1B, 0x61, 0x02); // ESC a 2 (right align)
  
  const net = `Net: Rs.${ticketData.netAmount || 0}\n`;
  commands.push(...Buffer.from(net, 'ascii'));
  
  const cgst = `CGST: Rs.${ticketData.cgst || 0}\n`;
  commands.push(...Buffer.from(cgst, 'ascii'));
  
  const sgst = `SGST: Rs.${ticketData.sgst || 0}\n`;
  commands.push(...Buffer.from(sgst, 'ascii'));
  
  const mc = `MC: Rs.${ticketData.mc || 0}\n`;
  commands.push(...Buffer.from(mc, 'ascii'));
  
  // Draw separator line
  commands.push(0x1B, 0x61, 0x00); // ESC a 0 (left align)
  commands.push(...Buffer.from(separator + '\n', 'ascii'));
  
  // Total - center aligned, bold
  commands.push(0x1B, 0x61, 0x01); // ESC a 1 (center)
  commands.push(0x1B, 0x45, 0x01); // ESC E 1 (bold)
  
  const total = `TOTAL: Rs.${ticketData.price || 0}\n`;
  commands.push(...Buffer.from(total, 'ascii'));
  
  const id = `ID: ${ticketData.transactionId || 'TXN' + Date.now()}\n`;
  commands.push(...Buffer.from(id, 'ascii'));
  
  // Draw separator line
  commands.push(0x1B, 0x45, 0x00); // ESC E 0 (normal)
  commands.push(...Buffer.from(separator + '\n', 'ascii'));
  
  // Footer - center aligned
  const footer = 'THANK YOU FOR VISITING\n';
  commands.push(...Buffer.from(footer, 'ascii'));
  
  const footer2 = `${ticketData.theaterName || getTheaterConfig().name}\n`;
  commands.push(...Buffer.from(footer2, 'ascii'));
  
  // Cut paper
  commands.push(0x1D, 0x56, 0x00); // GS V 0 (full cut)
  
  return Buffer.from(commands);
}

