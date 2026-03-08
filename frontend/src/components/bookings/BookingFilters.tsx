/**
 * BookingFilters Component
 * Date and show selection filters, plus ticket ID management
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw } from 'lucide-react';
import { SHOW_TIMES } from '@/lib/config';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import '../../styles/datePicker.css';
import StableInput from '@/components/StableInput';

interface BookingFiltersProps {
  localSelectedDate: string;
  localSelectedShow: string;
  loading: boolean;
  isLoaded: boolean;
  onDateChange: (date: Date | null) => void;
  onShowChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onLoadBookings: () => void;
  // Ticket ID props
  currentTicketId: string;
  ticketIdLoading: boolean;
  resetTicketIdValue: string;
  resettingTicketId: boolean;
  onResetTicketIdValueChange: (value: string) => void;
  onLoadCurrentTicketId: () => void;
  onResetTicketId: () => void;
}

export const BookingFilters: React.FC<BookingFiltersProps> = ({
  localSelectedDate,
  localSelectedShow,
  loading,
  isLoaded,
  onDateChange,
  onShowChange,
  onLoadBookings,
  currentTicketId,
  ticketIdLoading,
  resetTicketIdValue,
  resettingTicketId,
  onResetTicketIdValueChange,
  onLoadCurrentTicketId,
  onResetTicketId
}) => {
  const dayClassName = (date: Date) => {
    return ''; // No highlighting for now
  };

  return (
    <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
      {/* First row: Date, Show, Load Bookings */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="date" className="text-xs font-medium text-gray-700 whitespace-nowrap">
            Date
          </Label>
          <DatePicker
            id="date"
            selected={new Date(localSelectedDate)}
            onChange={onDateChange}
            dateFormat="dd/MM/yyyy"
            className="w-32 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-8"
            placeholderText="Select date"
            dayClassName={dayClassName}
            showYearDropdown
            showMonthDropdown
            dropdownMode="select"
            yearDropdownItemNumber={15}
            scrollableYearDropdown
            maxDate={new Date()}
            popperPlacement="bottom-start"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="show" className="text-xs font-medium text-gray-700 whitespace-nowrap">
            Show
          </Label>
          <select
            id="show"
            value={localSelectedShow}
            onChange={onShowChange}
            className="w-40 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-8"
          >
            {SHOW_TIMES.map(show => (
              <option key={show.key} value={show.key}>
                {show.label}
              </option>
            ))}
          </select>
        </div>

        <Button 
          onClick={onLoadBookings} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-4 rounded-full text-xs h-8"
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Loading...
            </>
          ) : (
            'Load Bookings'
          )}
        </Button>
      </div>

      {/* Second row: Current Ticket ID and Reset Ticket ID */}
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">
            Current Ticket ID
          </Label>
          <div className="px-2 py-1 bg-gray-50 border border-gray-300 rounded-md text-xs font-mono text-center max-w-[120px]">
            {ticketIdLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Loading...
              </div>
            ) : (
              currentTicketId || 'TKT000000'
            )}
          </div>
          <Button
            onClick={onLoadCurrentTicketId}
            disabled={ticketIdLoading}
            variant="outline"
            size="sm"
            className="px-2 py-1 h-8 w-8"
            title="Refresh Ticket ID"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="resetTicketId" className="text-xs font-medium text-gray-700 whitespace-nowrap">
            Reset Ticket ID To
          </Label>
          <StableInput
            id="resetTicketId"
            type="number"
            min="0"
            placeholder="Enter new ticket number"
            value={resetTicketIdValue}
            onChange={onResetTicketIdValueChange}
            className="w-32 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 h-8"
          />
          <Button
            onClick={onResetTicketId}
            disabled={resettingTicketId || !resetTicketIdValue}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-4 rounded-full text-xs h-8"
          >
            {resettingTicketId ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Ticket ID'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

