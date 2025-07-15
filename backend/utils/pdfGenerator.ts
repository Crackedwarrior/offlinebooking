import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Booking } from '@prisma/client';

export async function generateBookingPDF(booking: Booking) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  page.drawText(`Booking Report`, { x: 50, y: height - 50, size: 20, font });

  page.drawText(`Date: ${new Date(booking.date).toLocaleDateString()}`, { x: 50, y: height - 90, size: 12, font });
  page.drawText(`Show: ${booking.show}`, { x: 50, y: height - 110, size: 12, font });
  page.drawText(`Total Income: ₹${booking.totalIncome ?? 0}`, { x: 50, y: height - 130, size: 12, font });

  page.drawText(`Local: ₹${booking.localIncome ?? 0}`, { x: 50, y: height - 160, size: 12, font });
  page.drawText(`BMS: ₹${booking.bmsIncome ?? 0}`, { x: 50, y: height - 180, size: 12, font });
  page.drawText(`VIP: ₹${booking.vipIncome ?? 0}`, { x: 50, y: height - 200, size: 12, font });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
} 