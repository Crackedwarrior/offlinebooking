/**
 * TicketActions Component
 * Displays action buttons (Delete, Print)
 */

import React from 'react';

interface TicketActionsProps {
  canDelete: boolean;
  canPrint: boolean;
  isPrinting: boolean;
  onDelete: () => void;
  onPrint: () => void;
}

export const TicketActions: React.FC<TicketActionsProps> = ({
  canDelete,
  canPrint,
  isPrinting,
  onDelete,
  onPrint
}) => {
  return (
    <div className="px-0 py-0 border-t border-gray-200">
      <div className="w-full flex h-12">
        <button
          className={`flex-1 text-center text-xs font-semibold ${
            canDelete ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          onClick={onDelete}
          disabled={!canDelete}
        >
          Delete
        </button>
        <button
          className={`flex-1 text-center text-xs font-semibold ${
            canPrint && !isPrinting ? 'bg-green-200 text-green-900 hover:bg-green-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          onClick={onPrint}
          disabled={!canPrint || isPrinting}
        >
          {isPrinting ? 'Printing...' : 'Print Ticket'}
        </button>
      </div>
    </div>
  );
};

