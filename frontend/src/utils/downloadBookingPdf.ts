import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function downloadBookingPdf(booking: any) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const drawText = (text: string, x: number, y: number, size = 12) => {
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };

  drawText(`Booking Report`, 50, height - 50, 18);
  drawText(`Theatre: ${booking.theatreName || ''}`, 50, height - 80);
  drawText(`Date: ${new Date(booking.date).toLocaleDateString()}`, 50, height - 100);
  drawText(`Show: ${booking.show}`, 50, height - 120);
  drawText(`Total Booked Seats: ${booking.bookedSeats?.length || 0}`, 50, height - 140);
  drawText(`Total Income: ₹${booking.totalIncome || 0}`, 50, height - 160);

  // Optional: Loop through bookedSeats for a breakdown
  // You can also print seat matrix, etc.

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `Booking_${booking.show}_${booking.date}.pdf`;
  link.click();
} 