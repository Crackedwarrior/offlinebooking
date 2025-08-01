import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface ShowReportData {
  date: string;
  show: string;
  showLabel: string;
  stats: {
    total: number;
    available: number;
    booked: number;
    bms: number;
    occupancy: string;
  };
  bookings: Array<{
    id: string;
    customerName?: string;
    customerPhone?: string;
    bookedSeats: string[];
    classLabel: string;
    totalPrice: number;
    status: string;
    movie: string;
    movieLanguage: string;
  }>;
  classCounts: Array<{
    label: string;
    count: number;
  }>;
}

export async function downloadShowReportPdf(reportData: ShowReportData) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let yPosition = height - 50;

  const drawText = (text: string, x: number, y: number, size = 12, isBold = false) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: isBold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
  };

  const drawLine = (y: number) => {
    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
  };

  // Header
  drawText('CINEMA SHOW REPORT', width / 2 - 80, yPosition, 20, true);
  yPosition -= 30;
  
  drawText(`${reportData.showLabel.toUpperCase()}`, width / 2 - 60, yPosition, 16, true);
  yPosition -= 25;
  
  drawText(`Date: ${new Date(reportData.date).toLocaleDateString()}`, 50, yPosition, 12);
  drawText(`Generated: ${new Date().toLocaleString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true 
  })}`, width - 200, yPosition, 10);
  yPosition -= 30;

  // Summary Statistics
  drawText('SUMMARY STATISTICS', 50, yPosition, 14, true);
  yPosition -= 25;
  
  const stats = reportData.stats;
  drawText(`Total Seats: ${stats.total}`, 50, yPosition, 12);
  drawText(`Available: ${stats.available}`, 200, yPosition, 12);
  drawText(`Booked: ${stats.booked}`, 350, yPosition, 12);
  yPosition -= 20;
  
  drawText(`BMS Bookings: ${stats.bms}`, 50, yPosition, 12);
  drawText(`Occupancy Rate: ${stats.occupancy}%`, 200, yPosition, 12);
  yPosition -= 30;

  // Seat Class Breakdown
  drawText('SEAT CLASS BREAKDOWN', 50, yPosition, 14, true);
  yPosition -= 25;
  
  reportData.classCounts.forEach(cls => {
    drawText(`${cls.label}: ${cls.count} seats`, 50, yPosition, 12);
    yPosition -= 18;
  });
  yPosition -= 20;

  // Bookings Details
  if (reportData.bookings.length > 0) {
    drawText('BOOKING DETAILS', 50, yPosition, 14, true);
    yPosition -= 25;

    reportData.bookings.forEach((booking, index) => {
      // Check if we need a new page
      if (yPosition < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }

      drawText(`${index + 1}. Booking ID: ${booking.id}`, 50, yPosition, 12, true);
      yPosition -= 18;
      
      drawText(`   Customer: ${booking.customerName || 'No Name'}`, 70, yPosition, 10);
      drawText(`   Phone: ${booking.customerPhone || 'No Phone'}`, 250, yPosition, 10);
      yPosition -= 15;
      
      drawText(`   Movie: ${booking.movie} (${booking.movieLanguage})`, 70, yPosition, 10);
      drawText(`   Class: ${booking.classLabel}`, 350, yPosition, 10);
      yPosition -= 15;
      
      drawText(`   Seats: ${booking.bookedSeats.join(', ')}`, 70, yPosition, 10);
      drawText(`   Amount: ₹${booking.totalPrice}`, 350, yPosition, 10);
      yPosition -= 15;
      
      drawText(`   Status: ${booking.status}`, 70, yPosition, 10);
      yPosition -= 20;
    });
  } else {
    drawText('NO BOOKINGS FOUND', 50, yPosition, 14, true);
    yPosition -= 25;
    drawText('No bookings have been made for this show.', 50, yPosition, 12);
    yPosition -= 20;
  }

  // Footer
  yPosition -= 30;
  drawLine(yPosition);
  yPosition -= 20;
  drawText('Generated by Cinema Management System', width / 2 - 100, yPosition, 10);
  drawText('This is an automated report', width / 2 - 80, yPosition - 15, 10);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `Show_Report_${reportData.showLabel.replace(/\s+/g, '_')}_${reportData.date}.pdf`;
  link.click();
  
  URL.revokeObjectURL(url);
} 