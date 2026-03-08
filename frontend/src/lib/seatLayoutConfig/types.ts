// Type definitions for seat layout system

export interface SeatLayout {
  id: string;
  name: string;
  description: string;
  totalSeats: number;
  sections: TheaterSection[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface TheaterSection {
  id: string;
  name: string;
  classKey: string;
  classLabel: string;
  price: number;
  color: string;
  rows: TheaterRow[];
  totalSeats: number;
}

export interface TheaterRow {
  id: string;
  name: string;
  seats: (number | string)[]; // number for seat, string for empty space
  totalSeats: number;
}

export interface SeatPosition {
  rowId: string;
  seatNumber: number;
  position: number; // position in the row (for gaps)
}

