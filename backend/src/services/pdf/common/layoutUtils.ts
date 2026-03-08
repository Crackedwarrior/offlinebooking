/**
 * Common layout utilities for PDF generation
 * Extracted from kannadaPdfKitService.ts and pdfPrintService.ts
 */

import type PDFDocument from 'pdfkit';

/**
 * Draw centered text on PDF document
 * @param doc - PDFDocument instance
 * @param text - Text to draw
 * @param y - Y position
 * @param centerX - Center X coordinate
 * @param fontSize - Font size
 * @param font - Font name to use
 * @returns New Y position after text
 */
export function drawCenteredText(
  doc: typeof PDFDocument,
  text: string,
  y: number,
  centerX: number,
  fontSize: number = 10,
  font: string = 'Helvetica'
): number {
  doc.font(font).fontSize(fontSize);
  const textWidth = doc.widthOfString(text);
  const x = centerX - (textWidth / 2);
  doc.text(text, x, y);
  return y + fontSize + 8;
}

/**
 * Draw left-aligned text on PDF document
 * @param doc - PDFDocument instance
 * @param text - Text to draw
 * @param y - Y position
 * @param leftMargin - Left margin X coordinate
 * @param fontSize - Font size
 * @param font - Font name to use
 * @returns New Y position after text
 */
export function drawLeftText(
  doc: typeof PDFDocument,
  text: string,
  y: number,
  leftMargin: number,
  fontSize: number = 10,
  font: string = 'Helvetica'
): number {
  doc.font(font).fontSize(fontSize);
  doc.text(text, leftMargin, y);
  return y + fontSize + 5;
}

/**
 * Draw a rectangle box on PDF document
 * @param doc - PDFDocument instance
 * @param x - X position
 * @param y - Y position
 * @param width - Box width
 * @param height - Box height
 */
export function drawBox(
  doc: typeof PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  doc.rect(x, y, width, height).stroke();
}

/**
 * Draw a round dots line (for tear-off lines)
 * @param doc - PDFDocument instance
 * @param x1 - Start X position
 * @param y1 - Y position
 * @param x2 - End X position
 * @param y2 - Y position (same as y1 for horizontal line)
 * @param dotSpacing - Spacing between dots (default: 2)
 * @param dotRadius - Radius of each dot (default: 0.5)
 */
export function drawRoundDotsLine(
  doc: typeof PDFDocument,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dotSpacing: number = 2,
  dotRadius: number = 0.5
): void {
  for (let x = x1; x <= x2; x += dotSpacing) {
    doc.circle(x, y1, dotRadius).fill();
  }
}

/**
 * Calculate tax breakdown from individual ticket price
 * @param individualTicketPrice - Price per ticket
 * @param mcAmount - Municipal Corporation tax amount
 * @returns Tax breakdown object
 */
export function calculateTax(
  individualTicketPrice: number,
  mcAmount: number
): {
  net: number;
  cgst: number;
  sgst: number;
  mc: number;
} {
  // Remove MC and divide by 1.18 (1 + 0.18 GST)
  const baseAmount = (individualTicketPrice - mcAmount) / 1.18;
  const net = baseAmount;
  const cgst = baseAmount * 0.09; // 9% CGST
  const sgst = baseAmount * 0.09; // 9% SGST
  const mc = mcAmount;
  
  return {
    net,
    cgst,
    sgst,
    mc
  };
}

