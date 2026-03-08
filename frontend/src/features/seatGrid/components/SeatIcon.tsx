import React from 'react';
import { SeatStatus } from '@/store/bookingStore';

/**
 * Utility function to get fill color for seat based on status
 */
export const getSeatFillColor = (status: SeatStatus): string => {
  switch (status) {
    case 'AVAILABLE': return '#ffe082'; // golden yellow
    case 'SELECTED': return '#e5e7eb'; // light grey (gray-200)
    case 'BOOKED': return '#b87333'; // copper
    case 'BLOCKED': return '#ef4444'; // red-500
    case 'BMS_BOOKED': return '#7dd3fc'; // sky-300 (light blue)
    default: return '#d1d5db'; // gray-300
  }
};

interface SeatIconProps {
  status: SeatStatus;
  seatNumber: number;
}

/**
 * Cinema seat icon component - minimalist line-art style (top-down view)
 * Extracted from SeatGrid for reusability and performance optimization
 */
const SeatIcon: React.FC<SeatIconProps> = ({ status, seatNumber }) => {
  const fillColor = getSeatFillColor(status);
  const isDisabled = status === 'BOOKED' || status === 'BLOCKED' || status === 'BMS_BOOKED';
  const isSelected = status === 'SELECTED';
  
  return (
    <svg 
      width="40" 
      height="40" 
      viewBox="0 0 36 36"
    >
      {/* Backrest: Horizontal rectangular section at the top */}
      <rect x="6" y="4" width="24" height="6" fill={fillColor} stroke="#212121" strokeWidth="1.5" rx="1" />
      
      {/* Seat: Central rectangular section below the backrest */}
      <rect x="8" y="12" width="20" height="16" fill={fillColor} stroke="#212121" strokeWidth="1.5" rx="1" />
      
      {/* Left armrest: Vertical rectangle extending slightly beyond backrest width */}
      <rect x="4" y="10" width="5" height="20" fill={fillColor} stroke="#212121" strokeWidth="1.5" rx="1" />
      
      {/* Right armrest: Vertical rectangle extending slightly beyond backrest width */}
      <rect x="27" y="10" width="5" height="20" fill={fillColor} stroke="#212121" strokeWidth="1.5" rx="1" />
      
      {/* Seat number */}
      <text 
        x="18" 
        y="22" 
        fontSize="14" 
        fontWeight="800" 
        fill={isDisabled ? '#9ca3af' : isSelected ? '#212121' : 'white'} 
        textAnchor="middle" 
        dominantBaseline="middle"
        style={{ textShadow: isDisabled ? 'none' : isSelected ? '0 1px 3px rgba(255,255,255,0.9)' : '0 1px 3px rgba(0,0,0,0.5)' }}
      >
        {seatNumber}
      </text>
    </svg>
  );
};

export default React.memo(SeatIcon);

