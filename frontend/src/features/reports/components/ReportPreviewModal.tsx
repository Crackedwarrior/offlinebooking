/**
 * Report Preview Modal Component
 * Extracted from BoxVsOnlineReport.tsx
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ShowSummary, GrandTotal } from '@/types/report';

interface ReportPreviewModalProps {
  isOpen: boolean;
  selectedDate: Date;
  showSummaries: ShowSummary[];
  grandTotal: GrandTotal;
  onClose: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  inline?: boolean;
  showHeader?: boolean;
  showGrandTotalCard?: boolean;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  selectedDate,
  showSummaries,
  grandTotal,
  onClose,
  onExportExcel,
  onExportPDF,
  inline = false,
  showHeader = true,
  showGrandTotalCard = true,
}) => {
  const cellPadding: React.CSSProperties = { padding: '12px' };

  const columnConfig = {
    movieDate: {
      className: 'border-b border-gray-200 sticky left-0 bg-inherit z-10 text-sm',
      style: { ...cellPadding, textAlign: 'left' as const, width: '140px', maxWidth: '140px', minWidth: '140px' }, // Narrower date column
    },
    movieName: {
      className: 'border-b border-gray-200 sticky left-[140px] bg-inherit z-10 font-medium text-sm',
      style: { ...cellPadding, textAlign: 'left' as const, wordBreak: 'normal' as const, overflowWrap: 'break-word' as const, whiteSpace: 'normal' as const, width: '380px', maxWidth: '380px', minWidth: '380px' }, // Wider width starting earlier, wraps after "JEWS"
    },
    screenClass: {
      className: 'border-b border-gray-200 text-sm',
      style: { ...cellPadding, textAlign: 'left' as const }, // Change 'left' to 'right' or 'center'
    },
    qty: {
      className: 'border-b border-gray-200 text-sm',
      style: { ...cellPadding, textAlign: 'right' as const }, // Change 'right' to 'left' or 'center'
    },
    qtyStrong: {
      className: 'border-b border-gray-200 font-semibold text-sm',
      style: { ...cellPadding, textAlign: 'right' as const }, // Change 'right' to 'left' or 'center'
    },
  };

  const summaryColumnConfig = {
    movieDate: {
      className: 'border-b-2 border-green-200 sticky left-0 bg-green-50 z-10 text-sm',
      style: { ...cellPadding, textAlign: 'left' as const, width: '140px', maxWidth: '140px', minWidth: '140px' }, // Narrower date column
    },
    movieName: {
      className: 'border-b-2 border-green-200 sticky left-[140px] bg-green-50 z-10 text-sm font-bold',
      style: { ...cellPadding, textAlign: 'left' as const, wordBreak: 'normal' as const, overflowWrap: 'break-word' as const, whiteSpace: 'normal' as const, width: '380px', maxWidth: '380px', minWidth: '380px' }, // Wider width starting earlier, wraps after "JEWS"
    },
    spacer: {
      className: 'border-b-2 border-green-200 bg-green-50',
      style: { ...cellPadding, textAlign: 'left' as const },
    },
    qty: {
      className: 'border-b-2 border-green-200 bg-green-50 text-sm',
      style: { ...cellPadding, textAlign: 'right' as const }, // Change 'right' to 'left' or 'center'
    },
    qtyStrong: {
      className: 'border-b-2 border-green-200 bg-green-50 font-bold text-sm',
      style: { ...cellPadding, textAlign: 'right' as const }, // Change 'right' to 'left' or 'center'
    },
  };

  if (inline) {
    // Always show inline preview
    return (
      <div className="h-full flex flex-col bg-white w-full">
        {/* Header - Sticky */}
        {showHeader && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 bg-white w-full sticky top-0 z-40" style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Box vs Online Sale Report</h2>
              <p className="text-sm text-gray-500">
                {format(selectedDate, 'dd/MM/yyyy')}
              </p>
            </div>
          </div>
        )}

        {/* Content - Scrollable with hidden scrollbars */}
        <div className="flex-1 min-h-0 w-full overflow-auto" style={{ width: '100%', margin: 0, padding: 0, paddingBottom: showGrandTotalCard ? '200px' : '0' }}>
          <div className="p-0 w-full" style={{ width: '100%', margin: 0, padding: 0 }}>
            <div className="overflow-x-auto w-full hide-scrollbar" style={{ width: '100%' }}>
              <table className="w-full border-collapse text-sm" style={{ width: '100%', tableLayout: 'auto', margin: 0, borderSpacing: 0 }}>
                <tbody>
                  {showSummaries.map((summary, summaryIndex) => {
                    // Group classBreakdown by movie name first
                    const moviesMap = new Map<string, typeof summary.classBreakdown>();
                    summary.classBreakdown.forEach(item => {
                      const movie = item.movie || 'No Movie Assigned';
                      if (!moviesMap.has(movie)) {
                        moviesMap.set(movie, []);
                      }
                      moviesMap.get(movie)!.push(item);
                    });
                    
                    // Sort movies alphabetically
                    const sortedMovies = Array.from(moviesMap.keys()).sort();
                    
                    // For each movie, create complete class breakdown
                    const allClasses = ['BOX', 'STAR CLASS', 'CLASSIC', 'FIRST CLASS', 'SECOND CLASS'];
                    const allMovieRows: typeof summary.classBreakdown = [];
                    
                    sortedMovies.forEach(movieName => {
                      const movieItems = moviesMap.get(movieName)!;
                      const classBreakdownMap = new Map(movieItems.map(item => [item.classLabel, item]));
                      
                      // Create entries for all classes for this movie
                      allClasses.forEach(classLabel => {
                        const existing = classBreakdownMap.get(classLabel);
                        if (existing) {
                          allMovieRows.push(existing);
                        } else {
                          // Create zero entry for missing class
                          allMovieRows.push({
                            movie_date: selectedDate.toISOString().split('T')[0],
                            movie: movieName,
                            show: summary.show,
                            show_label: summary.show_label,
                            classLabel: classLabel,
                            online_qty: 0,
                            bms_pos_qty: 0,
                            counter_qty: 0,
                            total_qty: 0,
                            online_amt: 0,
                            bms_pos_amt: 0,
                            counter_amt: 0,
                            total_amt: 0
                          });
                        }
                      });
                    });
                    
                    return (
                      <React.Fragment key={summary.show}>
                        {/* Class breakdown rows - grouped by movie, then by class */}
                        {allMovieRows.map((item, index) => {
                          const isEvenRow = index % 2 === 0;
                          const formatValue = (val: number) => val === 0 ? '--' : val.toString();
                          const formatAmount = (val: number) => val === 0 ? '--' : `₹${val.toFixed(2)}`;
                          return (
                            <tr key={`${summary.show}-${item.movie}-${item.classLabel}-${index}`} className={isEvenRow ? 'bg-white' : 'bg-gray-50'}>
                              <td {...columnConfig.movieDate}>
                                {format(new Date(item.movie_date), 'dd-MMM-yyyy')}
                              </td>
                              <td {...columnConfig.movieName}>
                                {item.movie}
                              </td>
                              <td {...columnConfig.screenClass}>{item.classLabel}</td>
                              <td {...columnConfig.qty}>{formatValue(item.bms_pos_qty)}</td>
                              <td {...columnConfig.qty}>{formatValue(item.counter_qty)}</td>
                              <td {...columnConfig.qtyStrong}>{formatValue(item.total_qty)}</td>
                              <td {...columnConfig.qty}>{formatAmount(item.bms_pos_amt)}</td>
                              <td {...columnConfig.qty}>{formatAmount(item.counter_amt)}</td>
                              <td {...columnConfig.qtyStrong}>{formatAmount(item.total_amt)}</td>
                            </tr>
                          );
                        })}
                        {/* Show total row */}
                        <tr className="bg-green-50 border-b-2 border-green-200 font-semibold">
                          <td {...summaryColumnConfig.movieDate}>
                            {format(selectedDate, 'dd-MMM-yyyy')}
                          </td>
                          <td {...summaryColumnConfig.movieName}>
                            Show Total ({summary.show_label})
                          </td>
                          <td {...summaryColumnConfig.spacer}></td>
                          <td {...summaryColumnConfig.qty}>{summary.bms_pos_qty === 0 ? '--' : summary.bms_pos_qty}</td>
                          <td {...summaryColumnConfig.qty}>{summary.counter_qty === 0 ? '--' : summary.counter_qty}</td>
                          <td {...summaryColumnConfig.qtyStrong}>{summary.total_qty === 0 ? '--' : summary.total_qty}</td>
                          <td {...summaryColumnConfig.qty}>{summary.bms_pos_amt === 0 ? '--' : `₹${summary.bms_pos_amt.toFixed(2)}`}</td>
                          <td {...summaryColumnConfig.qty}>{summary.counter_amt === 0 ? '--' : `₹${summary.counter_amt.toFixed(2)}`}</td>
                          <td {...summaryColumnConfig.qtyStrong}>{summary.total_amt === 0 ? '--' : `₹${summary.total_amt.toFixed(2)}`}</td>
                        </tr>
                        {/* Add spacing between shows (except for the last one) */}
                        {summaryIndex < showSummaries.length - 1 && (
                          <tr>
                            <td colSpan={9} className="h-3 bg-white" style={{ padding: 0, margin: 0 }}></td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sticky Grand Total Row */}
        {showGrandTotalCard && (
          <div className="sticky bottom-0 z-20" style={{ marginTop: 0, paddingTop: 0 }}>
            <div className="mx-auto max-w-full" style={{ margin: 0, padding: 0, width: '100%' }}>
              <div className="rounded-none border-0 border-t border-green-300 bg-gradient-to-r from-green-50 via-white to-green-50 shadow-none" style={{ margin: 0, padding: 0, width: '100%' }}>
                <div className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-[0.2em]">Grand Total</p>
                    <p className="text-lg font-bold text-green-900">{format(selectedDate, 'dd MMM yyyy')}</p>
                  </div>
                  <div className="flex flex-1 min-w-[200px] gap-4">
                    <div className="flex-1 rounded-xl bg-white/80 border border-green-200 p-3">
                      <p className="text-[11px] font-semibold text-green-700 uppercase tracking-widest">Total Qty</p>
                      <p className="text-2xl font-bold text-green-900">{grandTotal.total_qty === 0 ? '--' : grandTotal.total_qty}</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-white/80 border border-green-200 p-3">
                      <p className="text-[11px] font-semibold text-green-700 uppercase tracking-widest">Counter Qty</p>
                      <p className="text-2xl font-bold text-green-900">{grandTotal.counter_qty === 0 ? '--' : grandTotal.counter_qty}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 min-w-[200px] gap-4">
                    <div className="flex-1 rounded-xl bg-white p-3 border border-green-200">
                      <p className="text-[11px] font-semibold text-green-700 uppercase tracking-widest">BMS POS AMT</p>
                      <p className="text-2xl font-bold text-green-900">₹{grandTotal.bms_pos_amt.toFixed(2)}</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-white p-3 border border-green-200">
                      <p className="text-[11px] font-semibold text-green-700 uppercase tracking-widest">COUNTER AMT</p>
                      <p className="text-2xl font-bold text-green-900">₹{grandTotal.counter_amt.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[220px] rounded-2xl border border-green-400 bg-green-600 text-white p-4 shadow-lg">
                    <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-green-100">Total Revenue</p>
                    <p className="text-3xl font-black tracking-wide">₹{grandTotal.total_amt.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Box vs Online Sale Report</h2>
            <p className="text-gray-600">Sreelekha Theatre Chikmagaluru</p>
            <p className="text-sm text-gray-500">
              From {format(selectedDate, 'dd/MM/yyyy')} Until {format(selectedDate, 'dd/MM/yyyy')}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
          >
            Close
          </Button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left font-bold sticky left-0 bg-gray-100 z-20">MOVIE DATE</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">MOVIE NAME</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">ScreenClass</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">BMS POS QTY</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">COUNTER Qty</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">Total Qty</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">BMS POS AMT</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">COUNTER AMT</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">Total AMT</th>
                  </tr>
                </thead>
                <tbody>
                  {showSummaries.map((summary, summaryIndex) => (
                    <React.Fragment key={summary.show}>
                      {/* Class breakdown rows */}
                      {summary.classBreakdown.map((item, index) => (
                        <tr key={`${summary.show}-${item.classLabel}-${index}`} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-3 sticky left-0 bg-white z-10">
                            {format(new Date(item.movie_date), 'dd-MMM-yyyy')}
                          </td>
                          <td className="border border-gray-300 p-3">{item.movie}</td>
                          <td className="border border-gray-300 p-3">{item.classLabel}</td>
                          <td className="border border-gray-300 p-3 text-center">{item.bms_pos_qty}</td>
                          <td className="border border-gray-300 p-3 text-center">{item.counter_qty}</td>
                          <td className="border border-gray-300 p-3 text-center font-semibold">{item.total_qty}</td>
                          <td className="border border-gray-300 p-3 text-center">₹{item.bms_pos_amt.toFixed(2)}</td>
                          <td className="border border-gray-300 p-3 text-center">₹{item.counter_amt.toFixed(2)}</td>
                          <td className="border border-gray-300 p-3 text-center font-semibold">₹{item.total_amt.toFixed(2)}</td>
                        </tr>
                      ))}
                      {/* Show total row */}
                      <tr className="bg-gray-100 font-bold">
                        <td className="border border-gray-300 p-3 sticky left-0 bg-gray-100 z-10">
                          {format(selectedDate, 'dd-MMM-yyyy')}
                        </td>
                        <td className="border border-gray-300 p-3">
                          Show Total ({summary.show_label})
                        </td>
                        <td className="border border-gray-300 p-3"></td>
                        <td className="border border-gray-300 p-3 text-center">{summary.bms_pos_qty}</td>
                        <td className="border border-gray-300 p-3 text-center">{summary.counter_qty}</td>
                        <td className="border border-gray-300 p-3 text-center">{summary.total_qty}</td>
                        <td className="border border-gray-300 p-3 text-center">₹{summary.bms_pos_amt.toFixed(2)}</td>
                        <td className="border border-gray-300 p-3 text-center">₹{summary.counter_amt.toFixed(2)}</td>
                        <td className="border border-gray-300 p-3 text-center">₹{summary.total_amt.toFixed(2)}</td>
                      </tr>
                      {/* Add spacing between shows (except for the last one) */}
                      {summaryIndex < showSummaries.length - 1 && (
                        <tr>
                          <td colSpan={11} className="h-2 bg-gray-50"></td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sticky Grand Total Row */}
        <div className="border-t bg-green-100 flex-shrink-0">
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <tbody>
                  <tr className="bg-green-100 font-bold text-green-800">
                    <td className="border border-gray-300 p-3">
                      {format(selectedDate, 'dd-MMM-yyyy')}
                    </td>
                    <td className="border border-gray-300 p-3">
                      GRAND TOTAL (All Shows)
                    </td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3 text-center">{grandTotal.bms_pos_qty}</td>
                    <td className="border border-gray-300 p-3 text-center">{grandTotal.counter_qty}</td>
                    <td className="border border-gray-300 p-3 text-center">{grandTotal.total_qty}</td>
                    <td className="border border-gray-300 p-3 text-center">₹{grandTotal.bms_pos_amt.toFixed(2)}</td>
                    <td className="border border-gray-300 p-3 text-center">₹{grandTotal.counter_amt.toFixed(2)}</td>
                    <td className="border border-gray-300 p-3 text-center">₹{grandTotal.total_amt.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
          <Button onClick={onExportExcel} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export to Excel
          </Button>
          <Button onClick={onExportPDF} variant="outline" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

