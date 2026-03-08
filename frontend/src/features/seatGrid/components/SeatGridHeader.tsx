import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Globe, X, Move } from 'lucide-react';

interface SeatGridHeaderProps {
  showRefreshButton: boolean;
  hideRefreshButton: boolean;
  hideBMSMarking: boolean;
  externalBmsMode: boolean | undefined;
  bmsMode: boolean;
  toggleBmsMode: () => void;
  loadingSeats: boolean;
  fetchSeatStatus: () => Promise<void>;
  moveMode: boolean;
  cancelMoveMode: () => void;
}

/**
 * Header component for SeatGrid
 * Extracted from SeatGrid for reusability
 */
const SeatGridHeader: React.FC<SeatGridHeaderProps> = ({
  showRefreshButton,
  hideRefreshButton,
  hideBMSMarking,
  externalBmsMode,
  bmsMode,
  toggleBmsMode,
  loadingSeats,
  fetchSeatStatus,
  moveMode,
  cancelMoveMode
}) => {
  return (
    <div className="sticky top-0 z-10 bg-[#FAFAFA] flex items-center justify-end mb-0 flex-shrink-0 pb-2">
      {showRefreshButton ? (
        <Button
          onClick={fetchSeatStatus}
          disabled={loadingSeats}
          size="sm"
          variant="outline"
        >
          <RotateCcw className={`w-4 h-4 mr-2 ${loadingSeats ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      ) : !hideRefreshButton && !hideBMSMarking && externalBmsMode === undefined && (
        <Button
          onClick={toggleBmsMode}
          disabled={loadingSeats}
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
      {moveMode && (
        <div className="ml-2 flex items-center gap-2 text-sm text-blue-600">
          <Move className="w-4 h-4" />
          <span>Move Mode Active</span>
          <Button
            onClick={cancelMoveMode}
            size="sm"
            variant="outline"
            className="ml-2"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default React.memo(SeatGridHeader);

