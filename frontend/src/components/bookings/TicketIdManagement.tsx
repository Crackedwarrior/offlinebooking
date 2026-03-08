/**
 * TicketIdManagement Component
 * Manages ticket ID display and reset
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Hash, RefreshCw, Loader2 } from 'lucide-react';
import StableInput from '@/components/StableInput';

interface TicketIdManagementProps {
  currentTicketId: string;
  ticketIdLoading: boolean;
  resetTicketIdValue: string;
  resettingTicketId: boolean;
  onResetTicketIdValueChange: (value: string) => void;
  onLoadCurrentTicketId: () => void;
  onResetTicketId: () => void;
}

export const TicketIdManagement: React.FC<TicketIdManagementProps> = ({
  currentTicketId,
  ticketIdLoading,
  resetTicketIdValue,
  resettingTicketId,
  onResetTicketIdValueChange,
  onLoadCurrentTicketId,
  onResetTicketId
}) => {
  return (
    <div className="bg-[#F7F8FA] p-3 rounded-md border border-gray-200 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">
            Current Ticket ID
          </Label>
          <div className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded-md text-xs font-mono text-center max-w-[120px]">
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

        <div className="flex items-center gap-2 flex-1">
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

