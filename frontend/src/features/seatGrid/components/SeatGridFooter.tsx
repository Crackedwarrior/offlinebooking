import React from 'react';
import { Button } from '@/components/ui/button';
import { Seat } from '@/store/bookingStore';

interface SeatGridFooterProps {
  hideProceedButton: boolean;
  showExchangeButton: boolean;
  selectedSeats: Seat[];
  totalAmount: number;
  availableCount: number;
  bookedCount: number;
  bmsBookedCount: number;
  onProceed?: (data: any) => void;
  onExchange?: () => void;
  seats: Seat[];
  sidebarCollapsed: boolean;
}

/**
 * Footer component for SeatGrid
 * Extracted from SeatGrid for reusability
 */
const SeatGridFooter: React.FC<SeatGridFooterProps> = ({
  hideProceedButton,
  showExchangeButton,
  selectedSeats,
  totalAmount,
  availableCount,
  bookedCount,
  bmsBookedCount,
  onProceed,
  onExchange,
  seats,
  sidebarCollapsed
}) => {
  if (hideProceedButton) return null;

  return (
    <div 
      className="fixed bottom-0 z-[9999] bg-white border-t border-gray-200 flex flex-row items-center justify-between px-6 py-8 shadow-lg"
      style={{ 
        zIndex: 9999, 
        position: 'fixed', 
        bottom: 0,
        left: sidebarCollapsed ? '4rem' : '16rem',
        right: 0,
        height: '80px'
      }}
    >
      {/* Left side - Proceed to Checkout button and info */}
      <div className="flex items-center gap-6 flex-1">
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded cursor-pointer"
          style={{ 
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 9999
          }}
          onClick={() => {
            if (onProceed) {
              onProceed({ selectedSeats, totalAmount, seats });
            }
          }}
        >
          Proceed to Checkout
        </Button>
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Selected: {selectedSeats.length} seats</span>
          <span className="font-medium text-gray-700">Total: ₹{totalAmount}</span>
        </div>
      </div>

      {/* Right side - Legend (or Exchange button if in exchange mode) */}
      {showExchangeButton ? (
        <div className="relative w-1/2" style={{ height: '80px' }}>
          {/* Vertical divider line */}
          <div className="absolute left-0 top-0 w-px h-full bg-gray-300 z-20"></div>
          
          {/* Clickable print area - entire right half */}
          <button
            className="absolute inset-0 w-full h-full bg-transparent hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              console.log('[PRINT] SeatGrid Print area clicked');
              if (onExchange) {
                onExchange();
              }
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
              </svg>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 bg-[#ffe082] rounded"></div>
            <span className="text-xs text-gray-600">Available ({availableCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <span className="text-xs text-gray-600">Selected ({selectedSeats.length})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 bg-[#b87333] rounded"></div>
            <span className="text-xs text-gray-600">Booked ({bookedCount})</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 bg-sky-300 rounded"></div>
            <span className="text-xs text-gray-600">BMS ({bmsBookedCount})</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SeatGridFooter);

