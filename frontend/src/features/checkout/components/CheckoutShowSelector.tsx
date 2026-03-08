/**
 * Show Selector component extracted from Checkout.tsx
 * Industry standard: Presentational component focused on UI
 */

import React from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useShowManagement } from '@/hooks/useShowManagement';
import ClassCards from './ClassCards';

interface CheckoutShowSelectorProps {
  onManualShowSelection?: (showKey: string) => void;
  createClassInfo: any[];
  onClassClick: (cls: any) => void;
}

const CheckoutShowSelectorComponent: React.FC<CheckoutShowSelectorProps> = ({
  onManualShowSelection,
  createClassInfo,
  onClassClick
}) => {
  // Temporary flags controlling where class cards render for the interview layout
  const SHOW_MAIN_CLASS_CARDS = true;              // show full-width cards below the strip
  const SHOW_DROPDOWN_CLASS_CARDS = false;         // keep dropdown class cards hidden for now
  const { seats, selectedShow } = useBookingStore();
  const { getMovieForShow } = useSettingsStore();
  const {
    showDropdownOpen,
    showDropdownRef,
    setShowDropdownRef,
    getShowDetails,
    handleShowCardClick,
    handleShowSelect,
    currentShowStatus,
    convertTo12Hour,
    isShowAccessible
  } = useShowManagement(onManualShowSelection);

  const showTimes = useSettingsStore(state => state.showTimes);
  const currentMovie = getMovieForShow(selectedShow);

  const showDetails = getShowDetails;
  const currentShowDetails = showDetails?.[selectedShow];

  return (
    <div className="flex flex-col w-full pt-0">
      {/* Show Box - Horizontal strip */}
      <div 
        ref={setShowDropdownRef}
        className="relative flex-1 w-full"
      >
        <div 
          className="flex items-center justify-between border border-gray-200 bg-white w-full h-[64px] px-6 relative select-none rounded-none cursor-pointer hover:bg-gray-50 overflow-hidden gap-4"
          onClick={handleShowCardClick}
        >
          {/* Movie name + language */}
          <div className="flex items-center min-w-0 flex-1">
            <div className="font-semibold text-base truncate">{currentMovie?.name || 'No show assigned'}</div>
            <span className="ml-3 text-xs text-gray-600 whitespace-nowrap">({currentMovie?.language || 'N/A'})</span>
          </div>
          
          {/* Divider removed for tighter layout */}

          {/* Show label and timing */}
          <div className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-sm font-medium text-blue-700">{showDetails?.[selectedShow]?.label || selectedShow}</span>
            <span className="text-sm text-gray-700">{showDetails?.[selectedShow]?.timing || ''}</span>
          </div>

          {/* Divider removed for tighter layout */}

          {/* Current show badge (if applicable) */}
          {currentShowStatus?.[selectedShow] && (
            <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded whitespace-nowrap">
              Current Show
            </span>
          )}

          {/* Availability */}
          <div className="flex items-center">
            <span className="text-xs mr-1 text-gray-500">Seats</span>
            <span className="text-sm font-semibold">{(() => {
              const totalSeats = seats.length;
              const availableSeats = seats.filter(seat => seat.status !== 'BOOKED' && seat.status !== 'BMS_BOOKED').length;
              return `${availableSeats}/${totalSeats}`;
            })()}</span>
          </div>
        </div>
        
        {/* Show Dropdown */}
        {showDropdownOpen && (
          <div className="absolute top-full left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-full">
            <div className="max-h-80 overflow-y-auto hide-scrollbar">
              {showTimes.map((show) => {
                const isAccessible = isShowAccessible(show);
                const isSelected = selectedShow === show.key;
                const showMovie = getMovieForShow(show.key);
                const showDetailsForShow = showDetails?.[show.key];
                
                return (
                  <div
                    key={show.key}
                    className={`${
                      !isAccessible ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Show Card - Exact copy of main show card */}
                    <div 
                      className={`flex items-center justify-between border border-gray-200 bg-white w-full h-[64px] px-6 relative select-none rounded-none overflow-hidden gap-4 ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-300' 
                          : isAccessible 
                            ? 'hover:bg-gray-50 cursor-pointer' 
                            : 'cursor-not-allowed'
                      }`}
                      onClick={() => {
                        if (isAccessible) {
                          handleShowSelect(show.key, onManualShowSelection);
                        }
                      }}
                    >
                      {/* Movie name + language */}
                      <div className="flex items-center min-w-0 flex-1">
                        <div className={`font-semibold text-base truncate ${isSelected ? 'text-blue-700' : isAccessible ? 'text-gray-900' : 'text-gray-500'}`}>
                          {showMovie?.name || 'No show assigned'}
                        </div>
                        <span className={`ml-3 text-xs whitespace-nowrap ${isSelected ? 'text-blue-600' : isAccessible ? 'text-gray-600' : 'text-gray-400'}`}>
                          ({showMovie?.language || 'N/A'})
                        </span>
                      </div>
                      
                      {/* Show label and timing */}
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : isAccessible ? 'text-blue-700' : 'text-gray-500'}`}>
                          {showDetailsForShow?.label || show.label}
                        </span>
                        <span className={`text-sm ${isSelected ? 'text-blue-600' : isAccessible ? 'text-gray-700' : 'text-gray-400'}`}>
                          {showDetailsForShow?.timing || `${convertTo12Hour(show.startTime)} - ${convertTo12Hour(show.endTime)}`}
                        </span>
                      </div>

                      {/* Current show badge (if applicable) */}
                      {currentShowStatus?.[show.key] && (
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded whitespace-nowrap">
                          Current Show
                        </span>
                      )}

                      {/* Availability - Note: This shows seats for currently selected show, will update when show is selected */}
                      <div className="flex items-center">
                        <span className="text-xs mr-1 text-gray-500">Seats</span>
                        <span className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                          {(() => {
                            // For the selected show, show actual seat count
                            // For other shows, we could fetch this data, but for now show current seats
                            // This will update when the show is selected
                            if (isSelected) {
                              const totalSeats = seats.length;
                              const availableSeats = seats.filter(seat => seat.status !== 'BOOKED' && seat.status !== 'BMS_BOOKED').length;
                              return `${availableSeats}/${totalSeats}`;
                            }
                            // For non-selected shows, show placeholder (could be enhanced to fetch actual data)
                            return '---/590';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Main Class Boxes (full width, below the strip) */}
      {SHOW_MAIN_CLASS_CARDS && (
        <div className="relative w-full mt-0 flex flex-row flex-wrap gap-0 items-stretch overflow-visible">
          <ClassCards 
            createClassInfo={createClassInfo}
            onClassClick={onClassClick}
            isAccessible={true}
          />
        </div>
      )}
    </div>
  );
};

// OPTIMIZED: Memoize to prevent unnecessary re-renders
export const CheckoutShowSelector = React.memo(CheckoutShowSelectorComponent);
