// HTML Ticket Generator Utility
// Creates styled HTML tickets that work with browser's native print dialog

export interface TicketData {
  bookingId: string;
  date: string;
  show: string;
  movie: string;
  screen: string;
  seatId: string;
  classLabel: string;
  price: number;
  timestamp: string;
}

export interface BookingPdfData {
  bookingId: string;
  date: string;
  show: string;
  movie: string;
  screen: string;
  seats: Array<{
    seatId: string;
    classLabel: string;
    price: number;
  }>;
  totalAmount: number;
  totalTickets: number;
  timestamp: string;
}

export class TicketPdfGenerator {
  /**
   * Generate HTML content for a single ticket
   */
  private static generateTicketHtml(ticketData: TicketData): string {
    const ticketHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Movie Ticket</title>
        <style>
          @media print {
            @page {
              margin: 0;
              size: 80mm 200mm;
            }
            body {
              margin: 0;
              padding: 5mm;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              width: 70mm;
              max-width: 70mm;
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 10px;
            background: white;
            color: black;
            width: 70mm;
            max-width: 70mm;
          }
          
          .ticket {
            text-align: center;
            border: 1px solid #000;
            padding: 5px;
            margin: 0;
          }
          
          .header {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .location {
            font-size: 12px;
            margin-bottom: 5px;
          }
          
          .separator {
            border-top: 1px solid #000;
            margin: 5px 0;
          }
          
          .info-row {
            text-align: left;
            margin: 2px 0;
            font-size: 11px;
          }
          
          .price-row {
            font-weight: bold;
            text-align: left;
            margin: 2px 0;
            font-size: 11px;
          }
          
          .total {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin: 5px 0;
          }
          
          .footer {
            text-align: center;
            font-size: 12px;
            margin-top: 5px;
          }
          
          .id {
            font-size: 10px;
            text-align: left;
            margin: 2px 0;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">SREELEKHA THEATER</div>
          <div class="location">Chickmagalur</div>
          <div class="separator">==========================================</div>
          
          <div class="info-row">Date: ${ticketData.date}</div>
          <div class="info-row">Time: ${ticketData.show}</div>
          <div class="info-row">Film: ${ticketData.movie}</div>
          <div class="info-row">Class: ${ticketData.classLabel}</div>
          <div class="info-row">Seat: ${ticketData.seatId}</div>
          
          <div class="separator">==========================================</div>
          
          <div class="price-row">Net: Rs.${(ticketData.price * 0.84).toFixed(2)}</div>
          <div class="price-row">CGST: Rs.${(ticketData.price * 0.08).toFixed(2)}</div>
          <div class="price-row">SGST: Rs.${(ticketData.price * 0.08).toFixed(2)}</div>
          
          <div class="separator">==========================================</div>
          
          <div class="total">TOTAL: Rs.${ticketData.price.toFixed(2)}</div>
          
          <div class="separator">==========================================</div>
          
          <div class="id">ID: ${ticketData.bookingId}</div>
          
          <div class="footer">
            <div style="font-size: 14px; font-weight: bold; margin: 5px 0;">THANK YOU!</div>
            <div>SREELEKHA THEATER</div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return ticketHtml;
  }

  /**
   * Generate HTML content for a booking summary
   */
  private static generateBookingSummaryHtml(bookingData: BookingPdfData): string {
    const summaryHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Booking Summary</title>
        <style>
          @media print {
            @page {
              margin: 10mm;
              size: A4;
            }
            body {
              margin: 0;
              padding: 10mm;
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
            }
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            background: white;
            color: black;
          }
          
          .header {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #333;
          }
          
          .booking-info {
            border: 2px solid #333;
            padding: 15px;
            margin-bottom: 20px;
            background: #f9f9f9;
          }
          
          .info-row {
            margin: 5px 0;
            font-size: 14px;
          }
          
          .tickets-section {
            margin: 20px 0;
          }
          
          .ticket-item {
            border: 1px solid #ccc;
            padding: 10px;
            margin: 5px 0;
            background: white;
          }
          
          .total-section {
            border-top: 2px solid #333;
            padding-top: 15px;
            margin-top: 20px;
            text-align: right;
            font-size: 16px;
            font-weight: bold;
          }
          
          .footer {
            text-align: center;
            margin-top: 30px;
            font-style: italic;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">SREELEKHA THEATER - BOOKING SUMMARY</div>
        
        <div class="booking-info">
          <div class="info-row"><strong>Booking ID:</strong> ${bookingData.bookingId}</div>
          <div class="info-row"><strong>Date:</strong> ${new Date(bookingData.date).toLocaleDateString()}</div>
          <div class="info-row"><strong>Show:</strong> ${bookingData.show}</div>
          <div class="info-row"><strong>Movie:</strong> ${bookingData.movie}</div>
          <div class="info-row"><strong>Screen:</strong> ${bookingData.screen}</div>
        </div>
        
        <div class="tickets-section">
          <h3>Tickets:</h3>
          ${bookingData.seats.map((seat, index) => `
            <div class="ticket-item">
              <strong>Ticket ${index + 1}:</strong> Seat ${seat.seatId} (${seat.classLabel}) - ₹${seat.price.toFixed(2)}
            </div>
          `).join('')}
        </div>
        
        <div class="total-section">
          <div>Total Tickets: ${bookingData.totalTickets}</div>
          <div>Total Amount: ₹${bookingData.totalAmount.toFixed(2)}</div>
        </div>
        
        <div class="footer">
          <div>Booked on: ${new Date(bookingData.timestamp).toLocaleString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true 
          })}</div>
          <div>Thank you for your booking!</div>
        </div>
      </body>
      </html>
    `;
    
    return summaryHtml;
  }

  /**
   * Generate a single ticket HTML and return as blob
   */
  static async generateSingleTicket(ticketData: TicketData): Promise<Blob> {
    const htmlContent = this.generateTicketHtml(ticketData);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return blob;
  }

  /**
   * Generate a booking summary HTML and return as blob
   */
  static async generateBookingSummary(bookingData: BookingPdfData): Promise<Blob> {
    const htmlContent = this.generateBookingSummaryHtml(bookingData);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return blob;
  }

  /**
   * Download an HTML blob as file
   */
  static downloadPdf(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Print an HTML blob using browser's native print dialog
   */
  static printPdf(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 1000);
    };
  }

  /**
   * Print multiple tickets using browser's native print dialog
   */
  static printMultipleTickets(tickets: TicketData[]): void {
    const ticketsHtml = tickets.map(ticket => this.generateTicketHtml(ticket)).join('<div style="page-break-after: always;"></div>');
    
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Movie Tickets</title>
        <style>
          @media print {
            @page {
              margin: 0;
              size: 80mm 200mm;
            }
            body {
              margin: 0;
              padding: 5mm;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              width: 70mm;
              max-width: 70mm;
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 10px;
            background: white;
            color: black;
            width: 70mm;
            max-width: 70mm;
          }
          
          .ticket {
            text-align: center;
            border: 1px solid #000;
            padding: 5px;
            margin: 0 0 10px 0;
          }
          
          .header {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .location {
            font-size: 12px;
            margin-bottom: 5px;
          }
          
          .separator {
            border-top: 1px solid #000;
            margin: 5px 0;
          }
          
          .info-row {
            text-align: left;
            margin: 2px 0;
            font-size: 11px;
          }
          
          .price-row {
            font-weight: bold;
            text-align: left;
            margin: 2px 0;
            font-size: 11px;
          }
          
          .total {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin: 5px 0;
          }
          
          .footer {
            text-align: center;
            font-size: 12px;
            margin-top: 5px;
          }
          
          .id {
            font-size: 10px;
            text-align: left;
            margin: 2px 0;
          }
        </style>
      </head>
      <body>
        ${ticketsHtml}
      </body>
      </html>
    `;
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
    this.printPdf(blob);
  }
}

// Convenience functions
export const generateTicketPdf = (ticketData: TicketData) => TicketPdfGenerator.generateSingleTicket(ticketData);
export const generateBookingPdf = (bookingData: BookingPdfData) => TicketPdfGenerator.generateBookingSummary(bookingData);
export const downloadTicketPdf = (blob: Blob, filename: string) => TicketPdfGenerator.downloadPdf(blob, filename);
export const printTicketPdf = (blob: Blob) => TicketPdfGenerator.printPdf(blob);
export const printMultipleTickets = (tickets: TicketData[]) => TicketPdfGenerator.printMultipleTickets(tickets); 