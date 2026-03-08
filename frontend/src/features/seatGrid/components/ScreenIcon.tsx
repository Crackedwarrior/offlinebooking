import React from 'react';

/**
 * Screen icon component - concave curve with straight line
 * Extracted from SeatGrid for reusability
 */
const ScreenIcon: React.FC = () => {
  return (
    <div className="mt-2 mb-0 w-full px-4 flex flex-col items-center" style={{ paddingBottom: '0px', marginBottom: '0px' }}>
      <svg width="100%" height="40" viewBox="0 0 1000 40" preserveAspectRatio="none" className="opacity-80">
        {/* Straight line connecting the ends */}
        <line 
          x1="40" 
          y1="15" 
          x2="960" 
          y2="15" 
          stroke="#1A1A1A" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />
        {/* Concave curved screen line - curves inward (downward toward seats) - more prominent */}
        <path 
          d="M 40 15 Q 500 30 960 15" 
          stroke="#1A1A1A" 
          strokeWidth="3.5" 
          fill="none" 
          strokeLinecap="round"
        />
      </svg>
      <div className="text-sm font-medium text-gray-600 mt-0.5 mb-0" style={{ paddingBottom: '0px', marginBottom: '0px' }}>SCREEN</div>
    </div>
  );
};

export default React.memo(ScreenIcon);

