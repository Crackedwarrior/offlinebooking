import React from 'react';
import { Seat } from '@/store/bookingStore';
import SeatIcon from './SeatIcon';

interface SeatButtonProps {
  seat: Seat;
  bmsMode: boolean;
  onSeatClick: (seat: Seat) => void;
}

/**
 * Seat button component - wraps SeatIcon with click handling
 * Extracted from SeatGrid for reusability and performance optimization
 * No hover state for performance in Electron environment
 */
const SeatButton: React.FC<SeatButtonProps> = ({ seat, bmsMode, onSeatClick }) => {
  const isDisabled = seat.status === 'BOOKED' || seat.status === 'BLOCKED' || (!bmsMode && seat.status === 'BMS_BOOKED');
  
  return (
    <button
      className="w-10 h-10 p-0 border-0 bg-transparent select-none focus:outline-none rounded"
      style={{ 
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1
      }}
      title={`${seat.id} - ${seat.status}${bmsMode ? ' (BMS Mode)' : ''}`}
      onClick={() => onSeatClick(seat)}
      disabled={isDisabled}
    >
      <SeatIcon status={seat.status} seatNumber={seat.number} />
    </button>
  );
};

export default React.memo(SeatButton);

