/**
 * ESC/POS Conversion Utilities
 * Converts ESC/POS commands to different formats
 */

/**
 * Convert ESC/POS commands to plain text format
 */
export function convertEscposToPlainText(escposData: string): string {
  // Convert ESC/POS commands to plain text format
  let plainText = '';
  let isCentered = false;
  let isBold = false;
  let isDoubleSize = false;
  
  // Split by lines and process each line
  const lines = escposData.split('\n');
  
  for (const line of lines) {
    let processedLine = line;
    
    // Remove ESC/POS commands and replace with plain text formatting
    processedLine = processedLine
      .replace(/\x1B\x40/g, '') // Initialize printer
      .replace(/\x1B\x74\x00/g, '') // Set code page
      .replace(/\x1B\x52\x00/g, '') // Select character set
      .replace(/\x1B\x61\x01/g, '') // Center alignment
      .replace(/\x1B\x61\x00/g, '') // Left alignment
      .replace(/\x1B\x21\x10/g, '') // Double height and width
      .replace(/\x1B\x21\x00/g, '') // Normal size
      .replace(/\x1B\x2D\x01/g, '') // Underline on
      .replace(/\x1B\x2D\x00/g, '') // Underline off
      .replace(/\x1B\x45\x01/g, '') // Bold on
      .replace(/\x1B\x45\x00/g, '') // Bold off
      .replace(/\x1D\x21\x01/g, '') // Double height
      .replace(/\x1D\x21\x00/g, '') // Normal size
      .replace(/\x1D\x56\x00/g, '') // Cut paper
      .replace(/\x1B\x69/g, ''); // Cut paper
    
    // Handle centering for plain text
    if (line.includes('\x1B\x61\x01')) {
      isCentered = true;
    } else if (line.includes('\x1B\x61\x00')) {
      isCentered = false;
    }
    
    // Handle bold formatting
    if (line.includes('\x1B\x45\x01')) {
      isBold = true;
    } else if (line.includes('\x1B\x45\x00')) {
      isBold = false;
    }
    
    // Handle double size
    if (line.includes('\x1B\x21\x10') || line.includes('\x1D\x21\x01')) {
      isDoubleSize = true;
    } else if (line.includes('\x1B\x21\x00') || line.includes('\x1D\x21\x00')) {
      isDoubleSize = false;
    }
    
    // If line contains actual text (not just commands), add it
    if (processedLine.trim() && !processedLine.match(/^[\x00-\x1F\x7F-\x9F]*$/)) {
      // Center the text if needed
      if (isCentered && processedLine.trim()) {
        const maxWidth = 42; // Standard thermal printer width
        const padding = Math.max(0, Math.floor((maxWidth - processedLine.length) / 2));
        processedLine = ' '.repeat(padding) + processedLine;
      }
      
      // Add formatting markers for plain text
      if (isBold) {
        processedLine = `**${processedLine}**`;
      }
      
      if (isDoubleSize) {
        processedLine = `#${processedLine}#`;
      }
      
      plainText += processedLine + '\n';
    }
  }
  
  return plainText;
}

/**
 * Convert ESC/POS commands to printer operations
 */
export function convertEscposToPrinterCommands(printer: any, escposData: string): void {
  // Parse ESC/POS commands and convert to printer operations
  const commands = escposData.split('\n');
  
  for (const command of commands) {
    if (command.includes('\x1B\x40')) {
      // Initialize printer
      printer.initialize();
    } else if (command.includes('\x1B\x61\x01')) {
      // Center alignment
      printer.align('center');
    } else if (command.includes('\x1B\x61\x00')) {
      // Left alignment
      printer.align('left');
    } else if (command.includes('\x1B\x21\x10')) {
      // Double height and width
      printer.style('b');
      printer.size(2, 2);
    } else if (command.includes('\x1B\x21\x00')) {
      // Normal size
      printer.style('normal');
      printer.size(1, 1);
    } else if (command.includes('\x1B\x2D\x01')) {
      // Underline on
      printer.style('u');
    } else if (command.includes('\x1B\x2D\x00')) {
      // Underline off
      printer.style('normal');
    } else if (command.includes('\x1B\x69')) {
      // Cut paper
      printer.cut();
    } else if (command.trim() && !command.startsWith('\x1B')) {
      // Regular text (not ESC commands)
      printer.text(command);
    }
  }
}

