/**
 * PDF Export Module
 * Handles PDF generation for Box vs Online Report using pdf-lib
 */

import { format } from 'date-fns';
import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import { ShowSummary, GrandTotal } from '@/types/report';

/**
 * Generate PDF document using pdf-lib
 */
export const generatePDFDocument = async (
  selectedDate: Date,
  showSummaries: ShowSummary[],
  grandTotal: GrandTotal
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = height - 50;
  const margin = 50;
  
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

  // Helper function to redraw headers on new page
  const redrawHeaders = (currentPage: PDFPage, currentY: number) => {
    const colWidths = [55, 100, 50, 35, 35, 35, 35, 50, 50, 50, 50];
    const headers = ['DATE', 'MOVIE NAME', 'CLASS', 'ONL Qty', 'BMS Qty', 'CNT Qty', 'TOT Qty', 'ONL Rs', 'BMS Rs', 'CNT Rs', 'TOT Rs'];
    const alignments: ('left' | 'center' | 'right')[] = ['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'];
    
    // Draw header background with solid gray fill
    currentPage.drawRectangle({
      x: margin,
      y: currentY - 14,
      width: width - 2 * margin,
      height: 22,
      color: rgb(0.75, 0.75, 0.75), // Darker gray for better contrast
    });
    
    let xPos = margin;
    headers.forEach((header, index) => {
      const xOffset = alignments[index] === 'left' ? 3 : alignments[index] === 'right' ? colWidths[index] - 3 : colWidths[index] / 2;
      drawText(header, xPos + xOffset, currentY, 8, true, alignments[index], rgb(0, 0, 0));
      xPos += colWidths[index];
    });
    
    return currentY - 22;
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
  
  // Table headers - optimized column widths for A4
  const colWidths = [55, 100, 50, 35, 35, 35, 35, 50, 50, 50, 50];
  const headers = ['DATE', 'MOVIE NAME', 'CLASS', 'ONL Qty', 'BMS Qty', 'CNT Qty', 'TOT Qty', 'ONL Rs', 'BMS Rs', 'CNT Rs', 'TOT Rs'];
  const alignments: ('left' | 'center' | 'right')[] = ['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'];
  let xPos = margin;
  
  // Draw header background with solid gray fill
  page.drawRectangle({
    x: margin,
    y: yPosition - 14,
    width: width - 2 * margin,
    height: 22,
    color: rgb(0.75, 0.75, 0.75), // Darker gray for better contrast
  });
  
  headers.forEach((header, index) => {
    const xOffset = alignments[index] === 'left' ? 3 : alignments[index] === 'right' ? colWidths[index] - 3 : colWidths[index] / 2;
    drawText(header, xPos + xOffset, yPosition, 8, true, alignments[index], rgb(0, 0, 0));
    xPos += colWidths[index];
  });
  
  yPosition -= 22;
  drawLine(yPosition);
  yPosition -= 10;
  
  // Table data with alternating row backgrounds
  let rowIndex = 0;
  showSummaries.forEach((summary) => {
    // Check if we need a new page
    if (yPosition < 120) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
      yPosition = redrawHeaders(page, yPosition);
      drawLine(yPosition);
      yPosition -= 10;
      rowIndex = 0; // Reset row index on new page
    }
    
    // Class breakdown rows with alternating backgrounds
    summary.classBreakdown.forEach((item) => {
      if (yPosition < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
        yPosition = redrawHeaders(page, yPosition);
        drawLine(yPosition);
        yPosition -= 10;
        rowIndex = 0; // Reset row index on new page
      }
      
      // Draw alternating row background
      const isEvenRow = rowIndex % 2 === 0;
      if (isEvenRow) {
        page.drawRectangle({
          x: margin,
          y: yPosition - 12,
          width: width - 2 * margin,
          height: 16,
          color: rgb(0.96, 0.96, 0.96), // Very light gray for banding
        });
      }
      
      xPos = margin;
      const rowData = [
        format(new Date(item.movie_date), 'dd-MMM'),
        item.movie.length > 18 ? item.movie.substring(0, 15) + '...' : item.movie,
        item.classLabel.length > 10 ? item.classLabel.substring(0, 8) + '..' : item.classLabel,
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
        const xOffset = alignments[index] === 'left' ? 3 : alignments[index] === 'right' ? colWidths[index] - 3 : colWidths[index] / 2;
        const isZero = (index >= 3 && index <= 6 && data === '0') || (index >= 7 && data === '0');
        const textColor = isZero ? rgb(0.5, 0.5, 0.5) : rgb(0, 0, 0); // Gray for zeros
        const isBold = index === 1; // Bold for movie names
        drawText(data, xPos + xOffset, yPosition, 7, isBold, alignments[index], textColor);
        xPos += colWidths[index];
      });
      
      yPosition -= 16;
      rowIndex++;
    });
    
    // Show total row with highlighted background
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
      yPosition = redrawHeaders(page, yPosition);
      drawLine(yPosition);
      yPosition -= 10;
    }
    
    yPosition -= 5;
    drawLine(yPosition);
    yPosition -= 10;
    
    // Draw show total background with pale blue/green shade
    page.drawRectangle({
      x: margin,
      y: yPosition - 12,
      width: width - 2 * margin,
      height: 18,
      color: rgb(0.85, 0.92, 0.88), // Pale green for show totals
    });
    
    xPos = margin;
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
      const xOffset = alignments[index] === 'left' ? 3 : alignments[index] === 'right' ? colWidths[index] - 3 : colWidths[index] / 2;
      drawText(data, xPos + xOffset, yPosition, 8, true, alignments[index], rgb(0, 0, 0));
      xPos += colWidths[index];
    });
    
    yPosition -= 20; // Extra spacing between show groups
    drawLine(yPosition);
    yPosition -= 10;
  });
  
  // Grand total
  if (yPosition < 150) {
    page = pdfDoc.addPage([595, 842]);
    yPosition = height - 50;
  }
  
  yPosition -= 10;
  drawLine(yPosition);
  yPosition -= 12;
  
  // Draw grand total background with distinct color
  page.drawRectangle({
    x: margin,
    y: yPosition - 14,
    width: width - 2 * margin,
    height: 20,
    color: rgb(0.7, 0.85, 0.75), // More prominent green for grand total
  });
  
  xPos = margin;
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
    const xOffset = alignments[index] === 'left' ? 3 : alignments[index] === 'right' ? colWidths[index] - 3 : colWidths[index] / 2;
    drawText(data, xPos + xOffset, yPosition, 9, true, alignments[index], rgb(0, 0, 0));
    xPos += colWidths[index];
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
    color: rgb(0.9, 0.95, 0.9), // Light green background
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
  
  yPosition = summaryBoxY - 20;
  
  // Footer
  yPosition = 50;
  drawText('This report was generated automatically by Sreelekha Theatre Management System', width / 2, yPosition, 8, false, 'center');
  yPosition -= 12;
  drawText('For any queries, please contact the management team', width / 2, yPosition, 8, false, 'center');
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

/**
 * Export PDF file using Web Worker (non-blocking)
 * Prevents UI freeze during PDF generation
 */
export const exportToPDF = async (
  selectedDate: Date, 
  showSummaries: ShowSummary[], 
  grandTotal: GrandTotal,
  onProgress?: (loading: boolean) => void
): Promise<void> => {
  try {
    // Show loading indicator
    if (onProgress) {
      onProgress(true);
    }

    // Create Web Worker for PDF generation
    // Fallback to synchronous generation if worker fails
    let worker: Worker | null = null;
    try {
      worker = new Worker(
        new URL('../../workers/pdfWorker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch (error) {
      console.warn('[PDF] Web Worker not available, using synchronous generation:', error);
      // Fallback to synchronous generation
      const pdfBytes = await generatePDFDocument(selectedDate, showSummaries, grandTotal);
      if (onProgress) {
        onProgress(false);
      }
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `box_vs_online_report_${format(selectedDate, 'dd-MM-yyyy')}.pdf`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // Convert Date to ISO string for worker
    const selectedDateISO = selectedDate.toISOString();

    // Send message to worker
    worker.postMessage({
      type: 'GENERATE_PDF',
      payload: {
        selectedDate: selectedDateISO,
        showSummaries,
        grandTotal
      }
    });

    // Wait for worker response
    const pdfBytes = await new Promise<Uint8Array>((resolve, reject) => {
      if (!worker) {
        reject(new Error('Worker not available'));
        return;
      }

      worker.onmessage = (event) => {
        const { type, payload } = event.data;
        
        if (type === 'PDF_GENERATED' && payload?.pdfBytes) {
          worker.terminate();
          resolve(payload.pdfBytes);
        } else if (type === 'PDF_ERROR') {
          worker.terminate();
          reject(new Error(payload?.error || 'PDF generation failed'));
        }
      };

      worker.onerror = (error) => {
        if (worker) {
          worker.terminate();
        }
        reject(error);
      };
    });

    // Hide loading indicator
    if (onProgress) {
      onProgress(false);
    }

    // Download PDF
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `box_vs_online_report_${format(selectedDate, 'dd-MM-yyyy')}.pdf`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    // Hide loading indicator on error
    if (onProgress) {
      onProgress(false);
    }
    console.error('Export error:', error);
    throw error;
  }
};

