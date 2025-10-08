import React from 'react';

interface SeatIconProps {
  className?: string;
}

/**
 * Minimal top-view chair icon approximating the provided image.
 * Uses currentColor for stroke so it inherits from parent (e.g., text-white).
 */
const SeatIcon: React.FC<SeatIconProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Outer couch/seat frame */}
      <rect x="4" y="8" width="56" height="48" rx="8" />

      {/* Left armrest */}
      <rect x="8" y="16" width="14" height="32" rx="6" />
      {/* Right armrest */}
      <rect x="42" y="16" width="14" height="32" rx="6" />

      {/* Back cushion */}
      <rect x="16" y="12" width="32" height="14" rx="6" />
      {/* Seat cushion */}
      <rect x="16" y="26" width="32" height="22" rx="6" />
    </svg>
  );
};

export default React.memo(SeatIcon);


