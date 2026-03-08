/**
 * Types for Box vs Online Report
 * Extracted from BoxVsOnlineReport.tsx
 */

export interface SalesData {
  movie_date: string;
  movie: string;
  show: string;
  show_label: string;
  classLabel: string;
  online_qty: number;
  bms_pos_qty: number;
  counter_qty: number;
  total_qty: number;
  online_amt: number;
  bms_pos_amt: number;
  counter_amt: number;
  total_amt: number;
}

export interface ShowSummary {
  show: string;
  show_label: string;
  online_qty: number;
  bms_pos_qty: number;
  counter_qty: number;
  total_qty: number;
  online_amt: number;
  bms_pos_amt: number;
  counter_amt: number;
  total_amt: number;
  classBreakdown: SalesData[];
}

export interface GrandTotal {
  online_qty: number;
  bms_pos_qty: number;
  counter_qty: number;
  total_qty: number;
  online_amt: number;
  bms_pos_amt: number;
  counter_amt: number;
  total_amt: number;
}

