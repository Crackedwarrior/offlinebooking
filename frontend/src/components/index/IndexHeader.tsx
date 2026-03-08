/**
 * Header component for Index page
 * Extracted from Index.tsx
 */

import React from 'react';
import { format } from 'date-fns';
import { Globe, X, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface IndexHeaderProps {
  collapsed: boolean;
  activeView: 'booking' | 'checkout' | 'confirmation' | 'history' | 'reports' | 'settings';
  selectedDate: string;
  currentShowLabel: string;
  bmsMode: boolean;
  onBmsModeToggle: () => void;
  // For history view
  historyDate?: string;
  onHistoryDateChange?: (date: Date | null) => void;
  historyDatesWithBookings?: Set<string>;
  historyDayClassName?: (date: Date) => string;
  // For reports view
  reportsDate?: Date;
  onReportsDateChange?: (date: Date | null) => void;
  onReportsRefresh?: () => void;
  reportsLoading?: boolean;
}

export const IndexHeader: React.FC<IndexHeaderProps> = ({
  collapsed,
  activeView,
  selectedDate,
  currentShowLabel,
  bmsMode,
  onBmsModeToggle,
  historyDate,
  onHistoryDateChange,
  historyDatesWithBookings,
  historyDayClassName,
  reportsDate,
  onReportsDateChange,
  onReportsRefresh,
  reportsLoading
}) => {
  if (activeView === 'checkout') {
    return null;
  }

  const getTitle = () => {
    switch (activeView) {
      case 'booking':
        return 'SEAT GRID';
      case 'confirmation':
        return 'BOOKING CONFIRMATION';
      case 'history':
        return 'BOOKING HISTORY';
      case 'reports':
        return 'REPORTS & ANALYTICS';
      case 'settings':
        return 'SETTINGS';
      default:
        return '';
    }
  };

  return (
    <div className={`fixed top-0 right-0 z-50 h-20 bg-white border-b border-gray-200 flex items-center px-6 transition-all duration-300 ${collapsed ? 'left-16' : 'left-64'}`}>
      <div className="flex items-center justify-between w-full">
        <div>
          <h1 className="text-2xl font-bold text-black tracking-wide">{getTitle()}</h1>
          {activeView === 'booking' && (
            <p className="text-gray-600 mt-1">
              {format(new Date(selectedDate), 'dd/MM/yyyy')} • {currentShowLabel}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {activeView === 'reports' && reportsDate && onReportsDateChange && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReportsDateChange(new Date())}
                className={`text-xs h-8 ${format(reportsDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-blue-50 border-blue-200' : ''}`}
              >
                Today
              </Button>
              <DatePicker
                selected={reportsDate}
                onChange={onReportsDateChange}
                dateFormat="dd/MM/yyyy"
                className="border rounded-md px-2 py-1 text-xs h-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholderText="Custom Date"
                maxDate={new Date()}
              />
              {onReportsRefresh && (
                <Button
                  onClick={onReportsRefresh}
                  disabled={reportsLoading}
                  size="sm"
                  className="flex items-center gap-1 text-xs h-8"
                >
                  <RefreshCw className={`w-3 h-3 ${reportsLoading ? 'animate-spin' : ''}`} />
                  {reportsLoading ? 'Loading...' : 'Refresh'}
                </Button>
              )}
            </div>
          )}
          {activeView === 'history' && historyDate && onHistoryDateChange && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <DatePicker
                selected={new Date(historyDate)}
                onChange={onHistoryDateChange}
                dateFormat="dd/MM/yyyy"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-0 focus:border-gray-300 hover:border-gray-400 transition-colors w-40"
                placeholderText="Select date"
                dayClassName={historyDayClassName}
                highlightDates={historyDatesWithBookings ? Array.from(historyDatesWithBookings).map(date => new Date(date)) : []}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                yearDropdownItemNumber={15}
                scrollableYearDropdown
                maxDate={new Date()}
                popperPlacement="bottom-end"
                onCalendarOpen={() => {
                  setTimeout(() => {
                    const calendar = document.querySelector('.react-datepicker');
                    if (calendar) {
                      calendar.setAttribute('data-popper-placement', 'bottom-end');
                    }
                  }, 0);
                }}
              />
            </div>
          )}
          {activeView === 'booking' && (
            <Button
              onClick={onBmsModeToggle}
              size="sm"
              variant={bmsMode ? "default" : "outline"}
              className={bmsMode ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {bmsMode ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Exit BMS Mode
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Mark BMS
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

