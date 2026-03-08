/**
 * Box vs Online Report Component
 * Refactored from 1140 lines to ~200 lines
 * Extracted logic into hooks, utils, and components
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useBoxVsOnlineReport } from '../hooks/useBoxVsOnlineReport';
import { calculateShowSummaries, calculateGrandTotal } from '../utils/reportDataProcessor';
import { exportToCSV, exportToPDF } from '../utils/reportExportUtils';
import { ReportPreviewModal } from './ReportPreviewModal';
import { usePricing } from '@/hooks/use-pricing';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileDown, Calendar, RefreshCw } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const GrandTotalSummary: React.FC<{ grandTotal: ReturnType<typeof calculateGrandTotal>; selectedDate: Date }> = ({
  grandTotal,
  selectedDate,
}) => (
  <div className="w-full rounded-none border-0 border-t border-green-300 bg-gradient-to-r from-green-50 via-white to-green-50 shadow-none p-6" style={{ margin: 0, paddingTop: '24px', paddingBottom: '24px', paddingLeft: '24px', paddingRight: '24px' }}>
    <div className="flex flex-wrap gap-4 items-stretch w-full">
      <div className="flex-1 min-w-[220px] space-y-2">
        <p className="text-xs font-semibold text-green-700 tracking-[0.35em] uppercase">Grand Total</p>
        <p className="text-2xl font-bold text-green-900">{format(selectedDate, 'dd MMM yyyy')}</p>
      </div>
      <div className="flex flex-1 min-w-[220px] gap-4">
        <div className="flex-1 rounded-2xl border border-green-200 bg-white/80 p-4">
          <p className="text-[11px] font-semibold text-green-600 uppercase tracking-[0.35em]">Total Qty</p>
          <p className="text-3xl font-bold text-green-900">{grandTotal.total_qty === 0 ? '--' : grandTotal.total_qty}</p>
        </div>
        <div className="flex-1 rounded-2xl border border-green-200 bg-white/80 p-4">
          <p className="text-[11px] font-semibold text-green-600 uppercase tracking-[0.35em]">Counter Qty</p>
          <p className="text-3xl font-bold text-green-900">{grandTotal.counter_qty === 0 ? '--' : grandTotal.counter_qty}</p>
        </div>
      </div>
      <div className="flex flex-1 min-w-[220px] gap-4">
        <div className="flex-1 rounded-2xl border border-green-200 bg-white p-4">
          <p className="text-[11px] font-semibold text-green-600 uppercase tracking-[0.35em]">BMS POS Amt</p>
          <p className="text-2xl font-bold text-green-900">₹{grandTotal.bms_pos_amt.toFixed(2)}</p>
        </div>
        <div className="flex-1 rounded-2xl border border-green-200 bg-white p-4">
          <p className="text-[11px] font-semibold text-green-600 uppercase tracking-[0.35em] whitespace-nowrap">Counter Amt</p>
          <p className="text-2xl font-bold text-green-900">₹{grandTotal.counter_amt.toFixed(2)}</p>
        </div>
      </div>
      <div className="flex-1 min-w-[240px] rounded-3xl bg-green-600 text-white p-5 shadow-lg border border-green-500">
        <p className="text-[11px] uppercase tracking-[0.4em] text-green-100 font-semibold">Total Revenue</p>
        <p className="text-4xl font-black tracking-wide">₹{grandTotal.total_amt.toFixed(2)}</p>
      </div>
    </div>
  </div>
);

interface BoxVsOnlineReportProps {
  selectedDate?: Date;
  onDateChange?: (date: Date | null) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

const BoxVsOnlineReport: React.FC<BoxVsOnlineReportProps> = ({ 
  selectedDate: externalDate, 
  onDateChange: externalOnDateChange,
  onRefresh: externalOnRefresh,
  loading: externalLoading
}) => {
  const [internalDate, setInternalDate] = useState(new Date());
  const selectedDate = externalDate || internalDate;
  const handleDateChange = externalOnDateChange || ((date: Date | null) => {
    if (date) setInternalDate(date);
  });
  const currentDate = new Date();
  const { pricingVersion } = usePricing();

  // Fetch sales data using custom hook
  const { salesData, loading, fetchSalesData } = useBoxVsOnlineReport(selectedDate);

  // Calculate show summaries and grand total
  const showSummaries = useMemo(() => {
    return calculateShowSummaries(salesData);
  }, [salesData, pricingVersion]);

  const grandTotal = useMemo(() => {
    return calculateGrandTotal(showSummaries);
  }, [showSummaries, pricingVersion]);

  // Refresh handler
  const handleRefresh = externalOnRefresh || fetchSalesData;

  // Export handlers
  const handleExportExcel = () => {
    try {
      exportToCSV(selectedDate, showSummaries, grandTotal);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleExportPDF = async () => {
    try {
      await exportToPDF(selectedDate, showSummaries, grandTotal, setIsGeneratingPDF);
    } catch (error) {
      console.error('Export error:', error);
      setIsGeneratingPDF(false);
    }
  };

  const [sidebarOffset, setSidebarOffset] = useState('64px');

  useEffect(() => {
    const updateSidebarOffset = () => {
      const mainContent = document.querySelector('[class*="ml-16"], [class*="ml-64"]');
      if (mainContent) {
        const marginLeft = window.getComputedStyle(mainContent).marginLeft;
        if (marginLeft) {
          setSidebarOffset(marginLeft);
        }
      }
    };

    updateSidebarOffset();
    window.addEventListener('resize', updateSidebarOffset);
    return () => window.removeEventListener('resize', updateSidebarOffset);
  }, []);

  const downloadBarStyle: React.CSSProperties = {
    width: `calc(100% - ${sidebarOffset})`,
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ width: '100%', margin: 0, padding: 0 }}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className="flex-1 min-h-0 overflow-auto hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: '180px' }}
        >
          <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                {/* Left side - Report title */}
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-gray-900">Box vs Online Sale Report</h2>
                  <p className="text-sm text-gray-500">{format(selectedDate, 'dd/MM/yyyy')}</p>
                </div>

                {/* Right side - Export buttons */}
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={handleExportExcel} 
                    size="default"
                    className="flex items-center gap-2 px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export to Excel
                  </Button>
                  <Button 
                    onClick={handleExportPDF} 
                    variant="outline"
                    size="default"
                    className="flex items-center gap-2 px-6 py-2 rounded-full"
                    disabled={isGeneratingPDF}
                  >
                    <FileDown className="w-4 h-4" />
                    {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Sticky table header - part of the sticky header block, aligned with table */}
            <div className="px-0">
              <div className="overflow-x-auto w-full hide-scrollbar">
                <table className="w-full border-collapse text-sm" style={{ width: '100%', tableLayout: 'auto', margin: 0, borderSpacing: 0 }}>
                  <thead className="bg-gray-200" style={{ backgroundColor: '#e5e7eb' }}>
                    <tr>
                      <th className="border-b-2 border-gray-400 text-left font-bold text-base sticky left-0 bg-gray-200 z-20" style={{ padding: '12px', width: '140px', maxWidth: '140px', minWidth: '140px' }}>MOVIE DATE</th>
                      <th className="border-b-2 border-gray-400 text-left font-bold text-base sticky left-[140px] bg-gray-200 z-20" style={{ padding: '12px', wordBreak: 'normal', overflowWrap: 'break-word', whiteSpace: 'normal', width: '380px', maxWidth: '380px', minWidth: '380px' }}>MOVIE NAME</th>
                      <th className="border-b-2 border-gray-400 text-left font-bold text-base min-w-[130px]" style={{ padding: '12px' }}>SCREENCLASS</th>
                      <th className="border-b-2 border-gray-400 text-right font-bold text-base min-w-[170px]" style={{ padding: '12px' }}>BMS</th>
                      <th className="border-b-2 border-gray-400 text-right font-bold text-base min-w-[0px]" style={{ padding: '12px' }}>COUNTER</th>
                      <th className="border-b-2 border-gray-400 text-right font-bold text-base min-w-[50px]" style={{ padding: '12px' }}>TOTAL</th>
                      <th className="border-b-2 border-gray-400 text-right font-bold text-base min-w-[100px]" style={{ padding: '12px' }}>BMS POS AMT</th>
                      <th className="border-b-2 border-gray-400 text-right font-bold text-base min-w-[100px]" style={{ padding: '12px' }}>COUNTER AMT</th>
                      <th className="border-b-2 border-gray-400 text-right font-bold text-base min-w-[100px]" style={{ padding: '12px' }}>Total AMT</th>
                    </tr>
                  </thead>
                </table>
              </div>
            </div>
          </div>

          <div className="px-0 pt-0" style={{ paddingBottom: '0', marginBottom: '0', padding: 0, margin: 0 }}>
            <ReportPreviewModal
              isOpen={true}
              selectedDate={selectedDate}
              showSummaries={showSummaries}
              grandTotal={grandTotal}
              onClose={() => {}}
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
              inline={true}
              showHeader={false}
              showGrandTotalCard={false}
            />
          </div>
        </div>
      </div>

      {/* Bottom Grand Total section - fixed to viewport bottom */}
      <div className="w-full fixed bottom-0 right-0 z-40" style={{ width: `calc(100% - ${sidebarOffset})`, left: sidebarOffset, margin: 0, padding: 0 }}>
        <GrandTotalSummary grandTotal={grandTotal} selectedDate={selectedDate} />
      </div>
    </div>
  );
};

export default BoxVsOnlineReport;
