/**
 * HTML Export Module
 * Handles HTML content generation for Box vs Online Report (legacy - kept for reference)
 */

import { format } from 'date-fns';
import { ShowSummary, GrandTotal } from '@/types/report';

/**
 * Generate PDF/HTML content for export (legacy - kept for reference)
 */
export const generatePDFContent = (
  selectedDate: Date,
  showSummaries: ShowSummary[],
  grandTotal: GrandTotal
): string => {
  const nextDate = new Date(selectedDate);
  nextDate.setDate(nextDate.getDate() + 1);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Box vs Online Sale Report</title>
      <style>
        @page {
          margin: 1in;
          size: A4;
        }
        
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 0;
          color: #333;
          line-height: 1.4;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }
        
        .header h1 {
          color: #1e40af;
          font-size: 28px;
          font-weight: bold;
          margin: 0 0 10px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .header h2 {
          color: #374151;
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 15px 0;
        }
        
        .header .date-range {
          background: #f3f4f6;
          padding: 10px 20px;
          border-radius: 8px;
          display: inline-block;
          font-weight: 500;
          color: #4b5563;
        }
        
        .report-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        
        .report-info .generated {
          font-size: 12px;
          color: #6b7280;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 11px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        th {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          font-weight: 600;
          padding: 12px 8px;
          text-align: center;
          border: 1px solid #1e40af;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        th:first-child, th:nth-child(2), th:nth-child(3) {
          text-align: left;
        }
        
        td {
          padding: 10px 8px;
          border: 1px solid #e5e7eb;
          text-align: center;
          vertical-align: middle;
        }
        
        td:first-child, td:nth-child(2), td:nth-child(3) {
          text-align: left;
          font-weight: 500;
        }
        
        .show-total {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          font-weight: bold;
          color: #374151;
        }
        
        .show-total td {
          border: 1px solid #d1d5db;
        }
        
        .grand-total {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          font-weight: bold;
          font-size: 12px;
        }
        
        .grand-total td {
          border: 1px solid #059669;
          padding: 15px 8px;
        }
        
        .amount {
          text-align: right;
          font-family: 'Courier New', monospace;
          font-weight: 500;
        }
        
        .quantity {
          text-align: center;
          font-weight: 500;
        }
        
        .zero-value {
          color: #9ca3af;
        }
        
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
        }
        
        .summary-box {
          margin-top: 20px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .summary-box h3 {
          margin: 0 0 10px 0;
          color: #374151;
          font-size: 14px;
          font-weight: 600;
        }
        
        .summary-stats {
          display: flex;
          justify-content: space-around;
          text-align: center;
        }
        
        .stat-item {
          padding: 10px;
        }
        
        .stat-value {
          font-size: 18px;
          font-weight: bold;
          color: #1e40af;
        }
        
        .stat-label {
          font-size: 10px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Box vs Online Sale Report</h1>
        <h2>Sreelekha Theatre Chikmagaluru</h2>
        <div class="date-range">
          From ${format(selectedDate, 'dd/MM/yyyy')} Until ${format(nextDate, 'dd/MM/yyyy')}
        </div>
      </div>
      
      <div class="report-info">
        <div>
          <strong>Report Type:</strong> Daily Sales Summary
        </div>
        <div class="generated">
          Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>MOVIE DATE</th>
            <th>MOVIE NAME</th>
            <th>ScreenClass</th>
            <th>ONLINE Qty</th>
            <th>BMS POS QTY</th>
            <th>COUNTER QTY</th>
            <th>Total Qty</th>
            <th>ONLINE AMT</th>
            <th>BMS POS AMT</th>
            <th>COUNTER AMT</th>
            <th>Total AMT</th>
          </tr>
        </thead>
        <tbody>
          ${showSummaries.map(summary => {
            let rows = '';
            
            // Add all class breakdown rows for this show first
            summary.classBreakdown.forEach(item => {
              const isZeroRow = item.total_qty === 0;
              rows += `
                <tr class="${isZeroRow ? 'zero-value' : ''}">
                  <td>${format(new Date(item.movie_date), 'dd-MMM-yyyy')}</td>
                  <td>${item.movie}</td>
                  <td>${item.classLabel}</td>
                  <td class="quantity">${item.online_qty}</td>
                  <td class="quantity">${item.bms_pos_qty}</td>
                  <td class="quantity">${item.counter_qty}</td>
                  <td class="quantity">${item.total_qty}</td>
                  <td class="amount">₹${item.online_amt.toFixed(2)}</td>
                  <td class="amount">₹${item.bms_pos_amt.toFixed(2)}</td>
                  <td class="amount">₹${item.counter_amt.toFixed(2)}</td>
                  <td class="amount">₹${item.total_amt.toFixed(2)}</td>
                </tr>
              `;
            });
            
            // Add show total row after all class breakdowns
            rows += `
              <tr class="show-total">
                <td>${format(selectedDate, 'dd-MMM-yyyy')}</td>
                <td>Show Total (${summary.show_label})</td>
                <td></td>
                <td class="quantity">${summary.online_qty}</td>
                <td class="quantity">${summary.bms_pos_qty}</td>
                <td class="quantity">${summary.counter_qty}</td>
                <td class="quantity">${summary.total_qty}</td>
                <td class="amount">₹${summary.online_amt.toFixed(2)}</td>
                <td class="amount">₹${summary.bms_pos_amt.toFixed(2)}</td>
                <td class="amount">₹${summary.counter_amt.toFixed(2)}</td>
                <td class="amount">₹${summary.total_amt.toFixed(2)}</td>
              </tr>
            `;
            
            return rows;
          }).join('')}
          
          <!-- Grand Total Row -->
          <tr class="grand-total">
            <td>${format(selectedDate, 'dd-MMM-yyyy')}</td>
            <td>GRAND TOTAL (All Shows)</td>
            <td></td>
            <td class="quantity">${grandTotal.online_qty}</td>
            <td class="quantity">${grandTotal.bms_pos_qty}</td>
            <td class="quantity">${grandTotal.counter_qty}</td>
            <td class="quantity">${grandTotal.total_qty}</td>
            <td class="amount">₹${grandTotal.online_amt.toFixed(2)}</td>
            <td class="amount">₹${grandTotal.bms_pos_amt.toFixed(2)}</td>
            <td class="amount">₹${grandTotal.counter_amt.toFixed(2)}</td>
            <td class="amount">₹${grandTotal.total_amt.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="summary-box">
        <h3>Daily Summary</h3>
        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-value">${grandTotal.total_qty}</div>
            <div class="stat-label">Total Tickets</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">₹${grandTotal.total_amt.toFixed(2)}</div>
            <div class="stat-label">Total Revenue</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${showSummaries.length}</div>
            <div class="stat-label">Active Shows</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${grandTotal.online_qty + grandTotal.bms_pos_qty}</div>
            <div class="stat-label">Online Sales</div>
          </div>
        </div>
      </div>
      
      <div class="footer">
        <p>This report was generated automatically by Sreelekha Theatre Management System</p>
        <p>For any queries, please contact the management team</p>
      </div>
    </body>
    </html>
  `;
};

