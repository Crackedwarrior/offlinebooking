/**
 * Common types for PDF services
 * Extracted from kannadaPdfKitService.ts and pdfPrintService.ts
 */

export interface PrinterInfo {
  name: string;
  port: string;
  status: string | number;
}

export interface TicketSeat {
  row: string;
  number: string;
  price: number;
  classLabel?: string;
}

export interface TicketData {
  theaterName?: string;
  location?: string;
  gstin?: string;
  movieName?: string;
  movie?: string; // Alternative field name from frontend
  date?: string;
  showTime?: string;
  screen?: string;
  seats?: TicketSeat[];
  totalAmount?: number;
  seatCount?: number;
  individualAmount?: number;
  seatInfo?: string;
  seatClass?: string;
  show?: string;
  movieLanguage?: string;
  ticketId?: string;
  // Tax data from frontend
  net?: number;
  cgst?: number;
  sgst?: number;
  mc?: number;
  // Additional fields
  seatRange?: string;
  classLabel?: string;
  row?: string;
  totalPrice?: number;
  price?: number;
  total?: number;
  seatId?: string;
  seat?: string;
  class?: string;
}

export interface PrintResult {
  success: boolean;
  printer?: string;
  message?: string;
  error?: string;
}

export interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface FormattedTicket {
  theaterName: string;
  location: string;
  gstin: string;
  date: string;
  showTime: string;
  showClass: string;
  movieName: string;
  seatClass: string;
  seatInfo: string;
  totalAmount: number | string;
  individualTicketPrice: number | string;
  seatCount: number;
  net: number | string;
  cgst: number | string;
  sgst: number | string;
  mc: number | string;
  ticketId: string;
  currentTime?: string;
}

