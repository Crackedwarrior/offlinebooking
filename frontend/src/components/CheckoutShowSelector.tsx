/**
 * Show Selector component extracted from Checkout.tsx
 * Industry standard: Presentational component focused on UI
 */

import React from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useShowManagement } from '@/hooks/useShowManagement';
import { ClassCards } from './ClassCards';

interface CheckoutShowSelectorProps {
  onManualShowSelection?: (showKey: string) => void;
  createClassInfo: any[];
  onClassClick: (cls: any) => void;
}

export const CheckoutShowSelector: React.FC<CheckoutShowSelectorProps> = ({
  onManualShowSelection,
  createClassInfo,
  onClassClick
}) => {
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
    <div className="flex flex-row w-full max-w-full lg:max-w-5xl pt-0">
      {/* Show Box */}
      <div 
        ref={setShowDropdownRef}
        className="relative"
      >
        <div 
          className="flex flex-col border border-gray-200 bg-white w-[250px] min-h-[120px] px-6 py-2 relative select-none rounded-l-xl shadow-md cursor-pointer hover:bg-gray-50"
          onClick={handleShowCardClick}
        >
          <div className="font-bold text-base mb-1 leading-tight break-words">{currentMovie?.name || 'No show assigned'}</div>
          <div className="text-sm text-gray-600 mb-1">({currentMovie?.language || 'N/A'})</div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-blue-600">{showDetails?.[selectedShow]?.label || selectedShow}</span>
            {currentShowStatus?.[selectedShow] && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                Current Show
              </span>
            )}
          </div>
          <div className="flex justify-between items-center mt-auto">
            <span className="text-sm whitespace-nowrap">{showDetails?.[selectedShow]?.timing || ''}</span>
            <span className="text-base font-semibold ml-2">{(() => {
              const totalSeats = seats.length;
              const availableSeats = seats.filter(seat => seat.status !== 'BOOKED' && seat.status !== 'BMS_BOOKED').length;
              return `${availableSeats}/${totalSeats}`;
            })()}</span>
          </div>
        </div>
        
        {/* Show Dropdown */}
        {(() => {
          // console.log('🎯 Dropdown render check:', { showDropdownOpen, showTimesLength: showTimes.length });
          return showDropdownOpen;
        })() && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[1250px]">
            <div className="p-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Select Show</h3>
              <p className="text-xs text-gray-500">Double-click to select a different show • Triple-click to jump to current time show</p>
            </div>
            <div className="max-h-80 overflow-y-auto p-3 hide-scrollbar">
              {showTimes.map((show) => {
                const isAccessible = isShowAccessible(show);
                const isSelected = selectedShow === show.key;
                
                return (
                  <div
                    key={show.key}
                    className={`mb-4 last:mb-0 ${
                      !isAccessible ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Show Header */}
                    <div 
                      className={`p-3 rounded-t-lg border ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-300' 
                          : isAccessible 
                            ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer' 
                            : 'bg-gray-100 border-gray-300 cursor-not-allowed'
                      }`}
                      onClick={() => {
                        // console.log('🎯 Show clicked in dropdown:', { 
                        //   showKey: show.key, 
                        //   isAccessible, 
                        //   hasManualHandler: !!onManualShowSelection 
                        // });
                        if (isAccessible) {
                          handleShowSelect(show.key, onManualShowSelection);
                        } else {
                          // console.log('🎯 Show not accessible, ignoring click');
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className={`font-medium text-lg ${isSelected ? 'text-blue-700' : isAccessible ? 'text-gray-900' : 'text-gray-500'}`}>
                            {show.label}
                          </div>
                          <div className={`text-sm ${isSelected ? 'text-blue-600' : isAccessible ? 'text-gray-600' : 'text-gray-400'}`}>
                            {convertTo12Hour(show.startTime)} - {convertTo12Hour(show.endTime)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!isAccessible && (
                            <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
                              Past
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              Selected
                            </span>
                          )}
                          {currentShowStatus?.[show.key] && (
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                              Current Show
                            </span>
                          )}
                          {isAccessible && !isSelected && (
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                              Available
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Show Card Row */}
                      <div className="show-row flex flex-row w-full">
                        {/* Show Box */}
                        <div className="flex flex-col border border-gray-200 bg-white w-[250px] min-h-[120px] px-6 py-2 relative select-none rounded-l-xl shadow-md">
                          <div className="font-bold text-base mb-1 leading-tight break-words">{getMovieForShow(show.key)?.name || 'No show assigned'}</div>
                          <div className="text-sm text-gray-600 mb-1">({getMovieForShow(show.key)?.language || 'N/A'})</div>
                          <span className="text-sm font-semibold text-blue-600 mb-1">{show.label}</span>
                          <div className="flex justify-between items-center mt-auto">
                            <span className="text-sm whitespace-nowrap">{convertTo12Hour(show.startTime)} - {convertTo12Hour(show.endTime)}</span>
                            <span className="text-base font-semibold ml-2">{(() => {
                              const totalSeats = seats.length;
                              const availableSeats = seats.filter(seat => seat.status !== 'BOOKED' && seat.status !== 'BMS_BOOKED').length;
                              return `${availableSeats}/${totalSeats}`;
                            })()}</span>
                          </div>
                        </div>
                        
                        {/* Class Boxes for this show */}
                        <ClassCards 
                          createClassInfo={createClassInfo}
                          onClassClick={onClassClick}
                          isAccessible={isAccessible}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Main Class Boxes */}
      <ClassCards 
        createClassInfo={createClassInfo}
        onClassClick={onClassClick}
        isAccessible={true}
      />
    </div>
  );
};
