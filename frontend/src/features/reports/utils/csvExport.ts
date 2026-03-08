/**
 * CSV Export Module
 * Handles CSV content generation for Box vs Online Report
 */

import { format } from 'date-fns';
import { ShowSummary, GrandTotal } from '@/types/report';

/**
 * Generate CSV content for export
 */
export const generateCSVContent = (
  selectedDate: Date,
  showSummaries: ShowSummary[],
  grandTotal: GrandTotal
): string => {
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);
  
  // Create CSV header with report information
  const csvHeader = [
    ['BOX VS ONLINE SALE REPORT'],
    ['Sreelekha Theatre Chikmagaluru'],
    [`From ${format(selectedDate, 'dd/MM/yyyy')} Until ${format(nextDate, 'dd/MM/yyyy')}`],
    ['Report Type: Daily Sales Summary'],
    [`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
    [], // Empty row for spacing
    ['MOVIE DATE', 'MOVIE NAME', 'ScreenClass', 'ONLINE Qty', 'BMS POS Qty', 'COUNTER Qty', 'Total Qty', 'ONLINE AMT', 'BMS POS AMT', 'COUNTER AMT', 'Total AMT']
  ];
  
  // Create CSV data rows
  const csvData = [];
  
  // Add all show summaries with their class breakdowns
  showSummaries.forEach(summary => {
    // Add all class breakdown rows for this show first
    summary.classBreakdown.forEach(item => {
      csvData.push([
        format(new Date(item.movie_date), 'dd-MMM-yyyy'),
        item.movie,
        item.classLabel,
        item.online_qty,
        item.bms_pos_qty,
        item.counter_qty,
        item.total_qty,
        item.online_amt.toFixed(2),
        item.bms_pos_amt.toFixed(2),
        item.counter_amt.toFixed(2),
        item.total_amt.toFixed(2)
      ]);
    });
    
    // Add show total row after all class breakdowns
    csvData.push([
      format(selectedDate, 'dd-MMM-yyyy'),
      `Show Total (${summary.show_label})`,
      '',
      summary.online_qty,
      summary.bms_pos_qty,
      summary.counter_qty,
      summary.total_qty,
      summary.online_amt.toFixed(2),
      summary.bms_pos_amt.toFixed(2),
      summary.counter_amt.toFixed(2),
      summary.total_amt.toFixed(2)
    ]);
    
    // Add empty row for spacing between shows
    csvData.push([]);
  });
  
  // Add grand total row
  csvData.push([
    format(selectedDate, 'dd-MMM-yyyy'),
    'GRAND TOTAL (All Shows)',
    '',
    grandTotal.online_qty,
    grandTotal.bms_pos_qty,
    grandTotal.counter_qty,
    grandTotal.total_qty,
    grandTotal.online_amt.toFixed(2),
    grandTotal.bms_pos_amt.toFixed(2),
    grandTotal.counter_amt.toFixed(2),
    grandTotal.total_amt.toFixed(2)
  ]);
  
  // Add summary statistics
  csvData.push([]); // Empty row
  csvData.push(['DAILY SUMMARY']);
  csvData.push(['Total Tickets', grandTotal.total_qty]);
  csvData.push(['Total Revenue', `₹${grandTotal.total_amt.toFixed(2)}`]);
  csvData.push(['Active Shows', showSummaries.length]);
  csvData.push(['Online Sales', grandTotal.online_qty + grandTotal.bms_pos_qty]);
  
  // Add footer
  csvData.push([]); // Empty row
  csvData.push(['This report was generated automatically by Sreelekha Theatre Management System']);
  csvData.push(['For any queries, please contact the management team']);
  
  // Convert to CSV format
  const csvContent = [...csvHeader, ...csvData]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  return csvContent;
};

/**
 * Export CSV file
 */
export const exportToCSV = (selectedDate: Date, showSummaries: ShowSummary[], grandTotal: GrandTotal): void => {
  try {
    const csvContent = generateCSVContent(selectedDate, showSummaries, grandTotal);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `box_vs_online_report_${format(selectedDate, 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

