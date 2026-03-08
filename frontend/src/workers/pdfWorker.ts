/**
 * Web Worker for PDF Generation
 * Prevents UI blocking during PDF generation
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';

// Types
interface ShowSummary {
  show_label: string;
  online_qty: number;
  bms_pos_qty: number;
  counter_qty: number;
  total_qty: number;
  online_amt: number;
  bms_pos_amt: number;
  counter_amt: number;
  total_amt: number;
  classBreakdown: Array<{
    movie_date: Date;
    movie: string;
    classLabel: string;
    online_qty: number;
    bms_pos_qty: number;
    counter_qty: number;
    total_qty: number;
    online_amt: number;
    bms_pos_amt: number;
    counter_amt: number;
    total_amt: number;
  }>;
}

interface GrandTotal {
  online_qty: number;
  bms_pos_qty: number;
  counter_qty: number;
  total_qty: number;
  online_amt: number;
  bms_pos_amt: number;
  counter_amt: number;
  total_amt: number;
}

interface PDFGenerationMessage {
  type: 'GENERATE_PDF';
  payload: {
    selectedDate: string; // ISO string
    showSummaries: ShowSummary[];
    grandTotal: GrandTotal;
  };
}

interface PDFGenerationResponse {
  type: 'PDF_GENERATED' | 'PDF_ERROR';
  payload?: {
    pdfBytes?: Uint8Array;
    error?: string;
  };
}

/**
 * Generate PDF document using pdf-lib
 */
async function generatePDFDocument(
  selectedDate: Date,
  showSummaries: ShowSummary[],
  grandTotal: GrandTotal
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = height - 50;
  const lineHeight = 15;
  const margin = 50;
  const tableStartY = yPosition - 100;
  
  // Helper function to draw text with color support
  const drawText = (text: string, x: number, y: number, size = 10, isBold = false, align: 'left' | 'center' | 'right' = 'left', textColor = rgb(0, 0, 0)) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    let xPos = x;
    if (align === 'center') {
      xPos = x - textWidth / 2;
    } else if (align === 'right') {
      xPos = x - textWidth;
    }
    
    page.drawText(text, {
      x: xPos,
      y: y,
      size,
      font: isBold ? boldFont : font,
      color: textColor,
    });
  };

  // Helper function to format zero values
  const formatValue = (value: number | string, isZero: boolean): string => {
    if (isZero && typeof value === 'number') {
      return '--';
    }
    return typeof value === 'number' ? value.toString() : value;
  };
  
  // Helper function to draw line
  const drawLine = (y: number) => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
  };
  
  // Header
  drawText('BOX VS ONLINE SALE REPORT', width / 2, yPosition, 18, true, 'center');
  yPosition -= 25;
  drawText('Sreelekha Theatre, Chikmagaluru', width / 2, yPosition, 14, true, 'center');
  yPosition -= 20;
  
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);
  drawText(`From ${format(selectedDate, 'dd/MM/yyyy')} to ${format(nextDate, 'dd/MM/yyyy')} | Generated at ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, width / 2, yPosition, 9, false, 'center');
  yPosition -= 25;
  
  drawLine(yPosition);
  yPosition -= 15;
  
  // Table header with modern styling
  const colPositions = [margin + 3, margin + 60, margin + 165, margin + 220, margin + 260, margin + 300, margin + 340, margin + 380, margin + 435, margin + 490, width - margin - 50];
  const headers = ['DATE', 'MOVIE NAME', 'CLASS', 'ONL Qty', 'BMS Qty', 'CNT Qty', 'TOT Qty', 'ONL Rs', 'BMS Rs', 'CNT Rs', 'TOT Rs'];
  const alignments: ('left' | 'right')[] = ['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'];
  
  // Draw header background
  page.drawRectangle({
    x: margin,
    y: yPosition - 14,
    width: width - 2 * margin,
    height: 22,
    color: rgb(0.75, 0.75, 0.75),
  });
  
  headers.forEach((header, index) => {
    drawText(header, colPositions[index], yPosition, 8, true, alignments[index], rgb(0, 0, 0));
  });
  
  yPosition -= 22;
  drawLine(yPosition);
  yPosition -= 10;
  
  // Table data with alternating row backgrounds
  let rowIndex = 0;
  for (const summary of showSummaries) {
    // Add class breakdown rows
    for (const item of summary.classBreakdown) {
      if (yPosition < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
        rowIndex = 0;
      }
      
      // Draw alternating row background
      const isEvenRow = rowIndex % 2 === 0;
      if (isEvenRow) {
        page.drawRectangle({
          x: margin,
          y: yPosition - 12,
          width: width - 2 * margin,
          height: 16,
          color: rgb(0.96, 0.96, 0.96),
        });
      }
      
      yPosition -= 16;
      const rowData = [
        format(new Date(item.movie_date), 'dd-MMM'),
        item.movie.substring(0, 18),
        item.classLabel.substring(0, 10),
        formatValue(item.online_qty, item.online_qty === 0),
        formatValue(item.bms_pos_qty, item.bms_pos_qty === 0),
        formatValue(item.counter_qty, item.counter_qty === 0),
        formatValue(item.total_qty, item.total_qty === 0),
        formatValue(item.online_amt.toFixed(0), item.online_amt === 0),
        formatValue(item.bms_pos_amt.toFixed(0), item.bms_pos_amt === 0),
        formatValue(item.counter_amt.toFixed(0), item.counter_amt === 0),
        formatValue(item.total_amt.toFixed(0), item.total_amt === 0),
      ];
      
      rowData.forEach((data, index) => {
        const isZero = (index >= 3 && index <= 6 && data === '0') || (index >= 7 && data === '0');
        const textColor = isZero ? rgb(0.5, 0.5, 0.5) : rgb(0, 0, 0);
        const isBold = index === 1; // Bold for movie names
        drawText(data, colPositions[index], yPosition, 7, isBold, alignments[index], textColor);
      });
      
      rowIndex++;
    }
    
    // Add show total row with highlighted background
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
    }
    
    yPosition -= 5;
    drawLine(yPosition);
    yPosition -= 10;
    
    // Draw show total background
    page.drawRectangle({
      x: margin,
      y: yPosition - 12,
      width: width - 2 * margin,
      height: 18,
      color: rgb(0.85, 0.92, 0.88),
    });
    
    const showTotalData = [
      format(selectedDate, 'dd-MMM'),
      `Show Total (${summary.show_label})`,
      '',
      summary.online_qty.toString(),
      summary.bms_pos_qty.toString(),
      summary.counter_qty.toString(),
      summary.total_qty.toString(),
      summary.online_amt.toFixed(0),
      summary.bms_pos_amt.toFixed(0),
      summary.counter_amt.toFixed(0),
      summary.total_amt.toFixed(0),
    ];
    
    showTotalData.forEach((data, index) => {
      drawText(data, colPositions[index], yPosition, 8, true, alignments[index], rgb(0, 0, 0));
    });
    
    yPosition -= 20;
    drawLine(yPosition);
    yPosition -= 10;
  }
  
  // Grand total
  if (yPosition < 150) {
    page = pdfDoc.addPage([595, 842]);
    yPosition = height - 50;
  }
  
  yPosition -= 10;
  drawLine(yPosition);
  yPosition -= 12;
  
  // Draw grand total background
  page.drawRectangle({
    x: margin,
    y: yPosition - 14,
    width: width - 2 * margin,
    height: 20,
    color: rgb(0.7, 0.85, 0.75),
  });
  
  const grandTotalData = [
    format(selectedDate, 'dd-MMM'),
    'GRAND TOTAL (All Shows)',
    '',
    grandTotal.online_qty.toString(),
    grandTotal.bms_pos_qty.toString(),
    grandTotal.counter_qty.toString(),
    grandTotal.total_qty.toString(),
    grandTotal.online_amt.toFixed(0),
    grandTotal.bms_pos_amt.toFixed(0),
    grandTotal.counter_amt.toFixed(0),
    grandTotal.total_amt.toFixed(0),
  ];
  
  grandTotalData.forEach((data, index) => {
    drawText(data, colPositions[index], yPosition, 9, true, alignments[index], rgb(0, 0, 0));
  });
  
  yPosition -= 35;
  
  // Summary statistics in a distinct box
  const summaryBoxHeight = 80;
  const summaryBoxY = yPosition - summaryBoxHeight;
  
  // Draw summary box background
  page.drawRectangle({
    x: margin,
    y: summaryBoxY,
    width: width - 2 * margin,
    height: summaryBoxHeight,
    color: rgb(0.9, 0.95, 0.9),
  });
  
  // Draw summary box border
  page.drawRectangle({
    x: margin,
    y: summaryBoxY,
    width: width - 2 * margin,
    height: summaryBoxHeight,
    borderColor: rgb(0.5, 0.7, 0.6),
    borderWidth: 2,
  });
  
  let summaryY = yPosition - 15;
  drawText('DAILY SUMMARY', margin + 10, summaryY, 14, true, 'left');
  summaryY -= 22;
  drawText(`Total Tickets: ${grandTotal.total_qty}`, margin + 10, summaryY, 11, true, 'left');
  summaryY -= 18;
  drawText(`Total Revenue: Rs ${grandTotal.total_amt.toFixed(2)}`, margin + 10, summaryY, 11, true, 'left');
  summaryY -= 18;
  drawText(`Active Shows: ${showSummaries.length}`, margin + 10, summaryY, 11, true, 'left');
  summaryY -= 18;
  drawText(`Online Sales: ${grandTotal.online_qty + grandTotal.bms_pos_qty}`, margin + 10, summaryY, 11, true, 'left');
  
  // Footer
  yPosition = 50;
  drawText('This report was generated automatically by Sreelekha Theatre Management System', width / 2, yPosition, 8, false, 'center');
  yPosition -= 15;
  drawText('For any queries, please contact the management team', width / 2, yPosition, 8, false, 'center');
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// Listen for messages from main thread
self.addEventListener('message', async (event: MessageEvent<PDFGenerationMessage>) => {
  const { type, payload } = event.data;
  
  if (type === 'GENERATE_PDF') {
    try {
      const { selectedDate, showSummaries, grandTotal } = payload;
      const dateObj = new Date(selectedDate);
      
      const pdfBytes = await generatePDFDocument(dateObj, showSummaries, grandTotal);
      
      const response: PDFGenerationResponse = {
        type: 'PDF_GENERATED',
        payload: { pdfBytes }
      };
      
      self.postMessage(response);
    } catch (error) {
      const response: PDFGenerationResponse = {
        type: 'PDF_ERROR',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
      
      self.postMessage(response);
    }
  }
});

