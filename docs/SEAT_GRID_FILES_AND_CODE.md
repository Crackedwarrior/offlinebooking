# All Files and Code Related to Seat Grid

## File names (full paths)

### Components (inside `frontend/src/features/seatGrid/components/`)
- `frontend/src/features/seatGrid/components/SeatGrid.tsx`
- `frontend/src/features/seatGrid/components/SeatGridRows.tsx`
- `frontend/src/features/seatGrid/components/SeatButton.tsx`
- `frontend/src/features/seatGrid/components/SeatIcon.tsx`
- `frontend/src/features/seatGrid/components/SeatGridHeader.tsx`
- `frontend/src/features/seatGrid/components/SeatGridFooter.tsx`
- `frontend/src/features/seatGrid/components/ScreenIcon.tsx`
- `frontend/src/features/seatGrid/components/CompactSeatGrid.tsx`
- `frontend/src/features/seatGrid/components/SeatGridPreview.tsx`

### Hooks (inside `frontend/src/features/seatGrid/hooks/`)
- `frontend/src/features/seatGrid/hooks/useSeatMap.ts`
- `frontend/src/features/seatGrid/hooks/useSeatSegments.ts`
- `frontend/src/features/seatGrid/hooks/useSeatStatus.ts`
- `frontend/src/features/seatGrid/hooks/useSeatStatistics.ts`
- `frontend/src/features/seatGrid/hooks/useBmsMode.ts`
- `frontend/src/features/seatGrid/hooks/useMoveMode.ts`
- `frontend/src/features/seatGrid/hooks/useSeatClick.ts`
- `frontend/src/features/seatGrid/hooks/useSeatSelection/index.ts`
- `frontend/src/features/seatGrid/hooks/useSeatSelection/useBlockSelection.ts`
- `frontend/src/features/seatGrid/hooks/useSeatSelection/useCarrotSelection.ts`
- `frontend/src/features/seatGrid/hooks/useSeatSelection/useSeatScoring.ts`

### Utils & config (used by seat grid)
- `frontend/src/features/seatGrid/utils/seatUtils.ts`
- `frontend/src/lib/seatMatrix.ts`
- `frontend/src/lib/config.ts` (exports `SEAT_CLASSES` used by `useSeatSegments`)

### Store (seat state)
- `frontend/src/store/bookingStore.ts` (defines `Seat`, `seats`, `toggleSeatStatus`, etc.)

### Error boundary
- `frontend/src/components/SpecializedErrorBoundaries.tsx` (exports `SeatGridErrorBoundary`)

---

## 1. `frontend/src/features/seatGrid/components/SeatGrid.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SeatGridErrorBoundary } from '@/components/SpecializedErrorBoundaries';
import SeatGridHeader from './SeatGridHeader';
import SeatGridRows from './SeatGridRows';
import SeatGridFooter from './SeatGridFooter';
import ScreenIcon from './ScreenIcon';
import { useBmsMode } from '../hooks/useBmsMode';
import { useSeatStatus } from '../hooks/useSeatStatus';
import { useMoveMode } from '../hooks/useMoveMode';
import { useSeatClick } from '../hooks/useSeatClick';
import { useSeatMap } from '../hooks/useSeatMap';
import { useSeatSegments } from '../hooks/useSeatSegments';
import { useSeatStatistics } from '../hooks/useSeatStatistics';
import { SEAT_CLASSES } from '@/lib/config';

export const seatSegments = SEAT_CLASSES.map(cls => ({
  label: cls.label,
  rows: cls.rows
}));

interface SeatGridProps {
  onProceed?: (data: any) => void;
  hideProceedButton?: boolean;
  hideRefreshButton?: boolean;
  showRefreshButton?: boolean;
  disableAutoFetch?: boolean;
  showExchangeButton?: boolean;
  onExchange?: () => void;
  overrideShow?: string;
  overrideDate?: string;
  hideBMSMarking?: boolean;
  bmsMode?: boolean;
  onBmsModeChange?: (mode: boolean) => void;
}

const SeatGrid = ({
  onProceed,
  hideProceedButton = false,
  hideRefreshButton = false,
  showRefreshButton = false,
  disableAutoFetch = false,
  showExchangeButton = false,
  onExchange,
  overrideShow,
  overrideDate,
  hideBMSMarking = false,
  bmsMode: externalBmsMode,
  onBmsModeChange
}: SeatGridProps) => {
  const { selectedDate: globalSelectedDate, selectedShow: globalSelectedShow, seats } = useBookingStore();
  const selectedDate = overrideDate || globalSelectedDate;
  const selectedShow = (overrideShow as any) || globalSelectedShow;
  const { getPriceForClass } = useSettingsStore();

  const { bmsMode, toggleBmsMode, processBmsBatch, pendingBmsUpdates, setPendingBmsUpdates, batchTimeoutRef } = useBmsMode({
    externalBmsMode, onBmsModeChange, selectedDate, selectedShow
  });

  const { fetchSeatStatus, loadingSeats } = useSeatStatus({ selectedDate, selectedShow });

  const { seatMap } = useSeatMap(seats);
  const { seatSegments } = useSeatSegments();
  const { selectedSeats, totalAmount, availableCount, bookedCount, blockedCount, bmsBookedCount } = useSeatStatistics({
    seats, getPriceForClass
  });

  const { moveMode, executeMove, cancelMoveMode, clickCount, setClickCount, clickTimer, setClickTimer } = useMoveMode({
    selectedSeats, seats, selectedDate, selectedShow, bmsMode
  });

  const { handleSeatClick } = useSeatClick({
    bmsMode, moveMode, processBmsBatch, pendingBmsUpdates, setPendingBmsUpdates, batchTimeoutRef,
    executeMove, clickCount, setClickCount, clickTimer, setClickTimer
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    const handleStorage = () => setSidebarCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
    const checkSidebarState = () => {
      const mainContent = document.querySelector('[class*="ml-16"], [class*="ml-64"]');
      if (mainContent) {
        const ml = window.getComputedStyle(mainContent).marginLeft;
        setSidebarCollapsed(ml === '4rem' || ml === '64px');
      } else {
        setSidebarCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    const observer = new MutationObserver(checkSidebarState);
    const mainContent = document.querySelector('main') || document.body;
    observer.observe(mainContent, { attributes: true, attributeFilter: ['class', 'style'] });
    checkSidebarState();
    return () => {
      window.removeEventListener('storage', handleStorage);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedDate && selectedShow && !disableAutoFetch) fetchSeatStatus();
  }, [selectedDate, selectedShow, disableAutoFetch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && moveMode) cancelMoveMode(); };
    if (moveMode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [moveMode, cancelMoveMode]);

  return (
    <SeatGridErrorBoundary>
      <div
        className="bg-[#FAFAFA] rounded-lg shadow-sm border border-gray-200/50 px-2 py-6 flex flex-col min-h-0 overflow-hidden"
        style={{ height: !hideProceedButton ? 'calc(100vh - 160px)' : '100%', maxHeight: !hideProceedButton ? 'calc(100vh - 160px)' : '100%' }}
      >
        <SeatGridHeader
          showRefreshButton={showRefreshButton}
          hideRefreshButton={hideRefreshButton}
          hideBMSMarking={hideBMSMarking}
          externalBmsMode={externalBmsMode}
          bmsMode={bmsMode}
          toggleBmsMode={toggleBmsMode}
          loadingSeats={loadingSeats}
          fetchSeatStatus={fetchSeatStatus}
          moveMode={moveMode}
          cancelMoveMode={cancelMoveMode}
        />
        <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
          <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden hide-scrollbar" style={{ paddingTop: '0px', paddingBottom: '0px', marginBottom: '0px' }}>
            <SeatGridRows seatSegments={seatSegments} seatMap={seatMap} bmsMode={bmsMode} onSeatClick={handleSeatClick} />
            <ScreenIcon />
          </div>
        </div>
        <SeatGridFooter
          hideProceedButton={hideProceedButton}
          showExchangeButton={showExchangeButton}
          selectedSeats={selectedSeats}
          totalAmount={totalAmount}
          availableCount={availableCount}
          bookedCount={bookedCount}
          bmsBookedCount={bmsBookedCount}
          onProceed={onProceed}
          onExchange={onExchange}
          seats={seats}
          sidebarCollapsed={sidebarCollapsed}
        />
        <style>{`.hide-scrollbar::-webkit-scrollbar{width:0;height:0;background:transparent}.hide-scrollbar{scrollbar-width:none;-ms-overflow-style:none}`}</style>
      </div>
    </SeatGridErrorBoundary>
  );
};

export default SeatGrid;
```

---

## 2. `frontend/src/features/seatGrid/components/SeatGridRows.tsx`

```tsx
import React from 'react';
import { Seat } from '@/store/bookingStore';
import { seatsByRow } from '@/lib/seatMatrix';
import SeatButton from './SeatButton';

interface SeatSegment {
  label: string;
  rows: string[];
}

interface SeatGridRowsProps {
  seatSegments: SeatSegment[];
  seatMap: Record<string, Seat>;
  bmsMode: boolean;
  onSeatClick: (seat: Seat) => void;
}

const SeatGridRows: React.FC<SeatGridRowsProps> = ({ seatSegments, seatMap, bmsMode, onSeatClick }) => {
  return (
    <div className="space-y-1 mb-0 w-full px-2">
      {seatSegments.map((segment, segIdx) => {
        const displayLabel = segment.label === 'CLASSIC' ? 'CLASSIC BALCONY' : segment.label;
        return (
          <div key={segment.label} className="mb-1">
            <div className="mb-1">
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#F5F5F6]" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04)', backdropFilter: 'blur(4px)' }}>
                <span className="text-xs font-normal text-[#1A1A1A] whitespace-nowrap" style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}>{displayLabel}</span>
              </div>
            </div>
            <div className="space-y-1">
              {segment.rows.map((row) => (
                <div key={row} className="flex flex-row items-center w-full">
                  <div className="w-16 text-right font-medium text-gray-600 pr-4 text-xs flex-shrink-0">{row.replace(/^[^-]+-/, '')}</div>
                  <div className="flex justify-center flex-1 min-w-0 overflow-hidden">
                    <div
                      className="grid gap-1"
                      style={{
                        maxWidth: '100%',
                        gridTemplateColumns: (() => {
                          const isBoxRow = row.startsWith('BOX');
                          if (!isBoxRow) return `repeat(${(seatsByRow as any)[row].length}, minmax(0, 1fr))`;
                          const starRowKey = Object.keys(seatsByRow).find(k => k.startsWith('SC-')) as string | undefined;
                          const starCols = starRowKey ? (seatsByRow as any)[starRowKey].length : undefined;
                          const boxLen = (seatsByRow as any)[row].length;
                          return `repeat(${starCols ? starCols : boxLen + 2}, minmax(0, 1fr))`;
                        })()
                      }}
                    >
                      {(seatsByRow as any)[row].map((seatNum: string, idx: number) => {
                        if (seatNum === '') return <div key={idx} className="w-10 h-10" style={{ visibility: 'hidden' }} />;
                        const seat = seatMap[`${row}${seatNum}`];
                        if (!seat) return <div key={idx} className="w-10 h-10" />;
                        return <SeatButton key={seat.id || `${row}-${seatNum}`} seat={seat} bmsMode={bmsMode} onSeatClick={onSeatClick} />;
                      })}
                      {row.startsWith('BOX') && (() => {
                        const starRowKey = Object.keys(seatsByRow).find(k => k.startsWith('SC-')) as string | undefined;
                        const starCols = starRowKey ? (seatsByRow as any)[starRowKey].length : undefined;
                        const boxLen = (seatsByRow as any)[row].length;
                        const trailing = Math.max((starCols ? starCols : boxLen) - boxLen, 0);
                        return Array.from({ length: trailing }).map((_, i) => (
                          <div key={`box-offset-end-${row}-${i}`} className="w-10 h-10" style={{ visibility: 'hidden' }} />
                        ));
                      })()}
                    </div>
                  </div>
                  <div className="w-16 text-left font-medium text-gray-600 pl-4 text-xs flex-shrink-0">{row.replace(/^[^-]+-/, '')}</div>
                </div>
              ))}
            </div>
            {segIdx < seatSegments.length - 1 && <div className="my-2" />}
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(SeatGridRows);
```

---

## 3. `frontend/src/features/seatGrid/components/SeatButton.tsx`

```tsx
import React from 'react';
import { Seat } from '@/store/bookingStore';
import SeatIcon from './SeatIcon';

interface SeatButtonProps {
  seat: Seat;
  bmsMode: boolean;
  onSeatClick: (seat: Seat) => void;
}

const SeatButton: React.FC<SeatButtonProps> = ({ seat, bmsMode, onSeatClick }) => {
  const isDisabled = seat.status === 'BOOKED' || seat.status === 'BLOCKED' || (!bmsMode && seat.status === 'BMS_BOOKED');
  return (
    <button
      className="w-10 h-10 p-0 border-0 bg-transparent select-none focus:outline-none rounded"
      style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.6 : 1 }}
      title={`${seat.id} - ${seat.status}${bmsMode ? ' (BMS Mode)' : ''}`}
      onClick={() => onSeatClick(seat)}
      disabled={isDisabled}
    >
      <SeatIcon status={seat.status} seatNumber={seat.number} />
    </button>
  );
};

export default React.memo(SeatButton);
```

---

## 4. `frontend/src/features/seatGrid/components/SeatIcon.tsx`

```tsx
import React from 'react';
import { SeatStatus } from '@/store/bookingStore';

export const getSeatFillColor = (status: SeatStatus): string => {
  switch (status) {
    case 'AVAILABLE': return '#ffe082';
    case 'SELECTED': return '#e5e7eb';
    case 'BOOKED': return '#b87333';
    case 'BLOCKED': return '#ef4444';
    case 'BMS_BOOKED': return '#7dd3fc';
    default: return '#d1d5db';
  }
};

interface SeatIconProps {
  status: SeatStatus;
  seatNumber: number;
}

const SeatIcon: React.FC<SeatIconProps> = ({ status, seatNumber }) => {
  const fillColor = getSeatFillColor(status);
  const isDisabled = status === 'BOOKED' || status === 'BLOCKED' || status === 'BMS_BOOKED';
  const isSelected = status === 'SELECTED';
  return (
    <svg width="40" height="40" viewBox="0 0 36 36">
      <rect x="6" y="4" width="24" height="6" fill={fillColor} stroke="#212121" strokeWidth="1.5" rx="1" />
      <rect x="8" y="12" width="20" height="16" fill={fillColor} stroke="#212121" strokeWidth="1.5" rx="1" />
      <rect x="4" y="10" width="5" height="20" fill={fillColor} stroke="#212121" strokeWidth="1.5" rx="1" />
      <rect x="27" y="10" width="5" height="20" fill={fillColor} stroke="#212121" strokeWidth="1.5" rx="1" />
      <text x="18" y="22" fontSize="14" fontWeight="800" fill={isDisabled ? '#9ca3af' : isSelected ? '#212121' : 'white'} textAnchor="middle" dominantBaseline="middle" style={{ textShadow: isDisabled ? 'none' : isSelected ? '0 1px 3px rgba(255,255,255,0.9)' : '0 1px 3px rgba(0,0,0,0.5)' }}>{seatNumber}</text>
    </svg>
  );
};

export default React.memo(SeatIcon);
```

---

## 5. `frontend/src/features/seatGrid/components/SeatGridHeader.tsx`

(See full code in repo – header with Refresh, BMS Mode, Move Mode buttons.)

---

## 6. `frontend/src/features/seatGrid/components/SeatGridFooter.tsx`

(See full code in repo – Proceed to Checkout, legend, Exchange/print area.)

---

## 7. `frontend/src/features/seatGrid/components/ScreenIcon.tsx`

```tsx
import React from 'react';

const ScreenIcon: React.FC = () => (
  <div className="mt-2 mb-0 w-full px-4 flex flex-col items-center" style={{ paddingBottom: '0px', marginBottom: '0px' }}>
    <svg width="100%" height="40" viewBox="0 0 1000 40" preserveAspectRatio="none" className="opacity-80">
      <line x1="40" y1="15" x2="960" y2="15" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 40 15 Q 500 30 960 15" stroke="#1A1A1A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </svg>
    <div className="text-sm font-medium text-gray-600 mt-0.5 mb-0" style={{ paddingBottom: '0px', marginBottom: '0px' }}>SCREEN</div>
  </div>
);

export default React.memo(ScreenIcon);
```

---

## 8. `frontend/src/features/seatGrid/hooks/useSeatMap.ts`

```ts
import { useMemo } from 'react';
import { Seat } from '@/store/bookingStore';

export const useSeatMap = (seats: Seat[]) => {
  const seatMap = useMemo(() => {
    return seats.reduce((acc, seat) => {
      acc[`${seat.row}${seat.number}`] = seat;
      return acc;
    }, {} as Record<string, Seat>);
  }, [seats]);
  return { seatMap };
};
```

---

## 9. `frontend/src/features/seatGrid/hooks/useSeatSegments.ts`

```ts
import { useMemo } from 'react';
import { SEAT_CLASSES } from '@/lib/config';

export const useSeatSegments = () => {
  const seatSegments = useMemo(() => SEAT_CLASSES.map(cls => ({ label: cls.label, rows: cls.rows })), []);
  return { seatSegments };
};
```

---

## 10. `frontend/src/lib/seatMatrix.ts`

```ts
export const seatsByRow = {
  'BOX-A': [1, 2, 3, 4, 5, 6, 7],
  'BOX-B': [1, 2, 3, 4, 5, 6, 7],
  'BOX-C': [1, 2, 3, 4, 5, 6, 7, 8],
  'SC-A': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, '', 19, 20, 21, 22, 23, 24, 25, 26],
  'SC-B': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, '', 19, 20, 21, 22, 23, 24, 25, 26],
  'SC-C': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, '', 19, 20, 21, 22, 23, 24, 25, 26],
  'SC-D': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, '', 19, 20, 21, 22, 23, 24, 25, 26],
  'CB-A': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, '', 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
  'CB-B': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  'CB-C': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  'CB-D': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  'CB-E': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  'CB-F': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  'CB-G': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  'CB-H': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, '', 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  'FC-A': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  'FC-B': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  'FC-C': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  'FC-D': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  'FC-E': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  'FC-F': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  'FC-G': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, '', 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  'SC2-A': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  'SC2-B': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
};
```

---

## Other seat-grid–related files (paths only; full code is in the repo)

- `frontend/src/features/seatGrid/components/CompactSeatGrid.tsx`
- `frontend/src/features/seatGrid/components/SeatGridPreview.tsx`
- `frontend/src/features/seatGrid/hooks/useSeatStatus.ts`
- `frontend/src/features/seatGrid/hooks/useSeatStatistics.ts`
- `frontend/src/features/seatGrid/hooks/useBmsMode.ts`
- `frontend/src/features/seatGrid/hooks/useMoveMode.ts`
- `frontend/src/features/seatGrid/hooks/useSeatClick.ts`
- `frontend/src/features/seatGrid/hooks/useSeatSelection/index.ts`
- `frontend/src/features/seatGrid/hooks/useSeatSelection/useBlockSelection.ts`
- `frontend/src/features/seatGrid/hooks/useSeatSelection/useCarrotSelection.ts`
- `frontend/src/features/seatGrid/hooks/useSeatSelection/useSeatScoring.ts`
- `frontend/src/features/seatGrid/utils/seatUtils.ts`
- `frontend/src/lib/config.ts` (SEAT_CLASSES)
- `frontend/src/store/bookingStore.ts`
- `frontend/src/components/SpecializedErrorBoundaries.tsx` (SeatGridErrorBoundary)
