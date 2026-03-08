/**
 * Report Filters Component
 * Extracted from BoxVsOnlineReport.tsx
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface ReportFiltersProps {
  selectedDate: Date;
  currentDate: Date;
  loading: boolean;
  onDateChange: (date: Date | null) => void;
  onRefresh: () => void;
  onPreview?: () => void;
  previewOpen?: boolean;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  selectedDate,
  currentDate,
  loading,
  onDateChange,
  onRefresh,
  onPreview,
  previewOpen = false,
}) => {
  return (
    <div className="flex-shrink-0 p-4 bg-white border-b border-gray-200 w-full" style={{ width: '100%', margin: 0, paddingLeft: '1rem', paddingRight: '1rem' }}>
      <div className="flex items-center gap-4 w-full max-w-none" style={{ width: '100%' }}>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Date:</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(currentDate)}
          className={`text-xs h-8 ${format(selectedDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd') ? 'bg-blue-50 border-blue-200' : ''}`}
        >
          Today
        </Button>
        
        <DatePicker
          selected={selectedDate}
          onChange={onDateChange}
          dateFormat="dd/MM/yyyy"
          placeholderText="Custom Date"
          className="border rounded-md px-2 py-1 text-xs h-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          maxDate={new Date()}
        />
        
        <div className="flex-1"></div>

        {onPreview && (
          <Button
            onClick={onPreview}
            variant={previewOpen ? "default" : "outline"}
            size="sm"
            className={`flex items-center gap-1 text-xs h-8 ${previewOpen ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
          >
            <FileText className="w-3 h-3" />
            Preview
          </Button>
        )}
        
        <Button
          onClick={onRefresh}
          disabled={loading}
          size="sm"
          className="flex items-center gap-1 text-xs h-8"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
};

