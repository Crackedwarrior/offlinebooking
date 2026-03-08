/**
 * Main Index page component
 * Refactored to use extracted hooks and components for better performance
 */

import React, { useState, lazy, Suspense, useCallback, useEffect } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getShowKeyFromNow, getShowLabelByKey } from '@/lib/time';
import { getCurrentShowLabel } from '@/lib/utils';
import { getTheaterConfig } from '@/config/theaterConfig';
import { getSeatClassByRow } from '@/lib/config';
import { BookingErrorBoundary } from '@/components/SpecializedErrorBoundaries';
import { formatSeatNumbers } from '@/utils/formatSeatNumbers';
import { useNavigation } from '@/hooks/useNavigation';
import { useBookingCreation } from '@/hooks/useBookingCreation';
import { useSeatOperations } from '@/hooks/useSeatOperations';
import { IndexSidebar } from '@/components/index/IndexSidebar';
import { IndexHeader } from '@/components/index/IndexHeader';

// Lazy load heavy components
const SeatGrid = lazy(() => import('@/features/seatGrid/components/SeatGrid'));
const Checkout = lazy(() => import('@/features/checkout/components/Checkout'));
const BookingHistory = lazy(() => import('@/features/bookingHistory/components/BookingHistory'));
const BoxVsOnlineReport = lazy(() => import('@/features/reports/components/BoxVsOnlineReport'));
const Settings = lazy(() => import('@/features/settings/components/Settings'));

interface IndexProps {
  onLogout?: () => void;
}

const Index: React.FC<IndexProps> = ({ onLogout }) => {
  const { selectedDate, selectedShow, seats, toggleSeatStatus } = useBookingStore();
  const [bmsMode, setBmsMode] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [decoupledSeatIds, setDecoupledSeatIds] = useState<string[]>([]);
  
  // Booking history date state for header datepicker
  const [historyDateState, setHistoryDateState] = useState<{
    selectedDate: string;
    datesWithBookings: Set<string>;
    dayClassName: (date: Date) => string;
    onDateChange: (date: Date | null) => void;
  } | null>(null);
  
  // Reports date state for header datepicker
  const [reportsDate, setReportsDate] = useState<Date>(new Date());
  const [reportsLoading, setReportsLoading] = useState(false);
  
  const showTimes = useSettingsStore(state => state.showTimes);

  // Use extracted navigation hook
  const {
    activeView,
    setActiveView,
    collapsed,
    setCollapsed,
    currentTime,
    isExchangeMode,
    setIsExchangeMode,
    handleManualShowSelection,
  } = useNavigation();

  // Use extracted booking creation hook
  const { handleBookingComplete } = useBookingCreation(setCheckoutData);

  // Use extracted seat operations hook
  const { refreshSeatStatus, deselectSeats, decoupleTickets, handleResetSeats } = useSeatOperations(
    selectedDate,
    selectedShow,
    checkoutData,
    setCheckoutData
  );

  // OPTIMIZED: Memoize current show label to prevent excessive re-renders
  const currentShowLabel = React.useMemo(() => {
    try {
      const enabledShowTimes = showTimes.filter(show => show.enabled);
      
      if (enabledShowTimes.length === 0) {
        return 'No shows available';
      }
      
      const key = getShowKeyFromNow(enabledShowTimes as any);
      const label = key ? getShowLabelByKey(enabledShowTimes as any, key) : enabledShowTimes[0].label;
      
      return label;
    } catch (error) {
      console.error('[ERROR] Error calculating current show label, using fallback:', error);
      return getCurrentShowLabel();
    }
  }, [showTimes]);

  // Handle exchange button click - print tickets and return to checkout
  const handleExchange = useCallback(async () => {
    console.log('[PRINT] Exchange button clicked - printing tickets and returning to checkout');
    
    try {
      const selectedSeats = seats.filter(seat => seat.status === 'SELECTED');
      
      if (selectedSeats.length === 0) {
        console.log('[WARN] No seats selected for printing');
        return;
      }
      
      // Dynamic imports for better code splitting
      const { useSettingsStore } = await import('@/store/settingsStore');
      const printerService = await import('@/services/printerService');
      const { ElectronPrinterService } = await import('@/services/electronPrinterService');
      
      const { getMovieForShow, getShowTimes, getPriceForClass } = useSettingsStore.getState();
      const currentMovie = getMovieForShow(selectedShow);
      
      if (!currentMovie) {
        console.error('[ERROR] No movie found for show:', selectedShow);
        return;
      }
      
      const showTimes = getShowTimes();
      const currentShowTime = showTimes.find(show => show.key === selectedShow);
      
      if (!currentShowTime) {
        console.error('[ERROR] No show time found for:', selectedShow);
        return;
      }
      
      const showtime = currentShowTime.startTime;
      const printerInstance = printerService.default.getInstance();
      const printerConfig = printerInstance.getPrinterConfig();
      
      if (!printerConfig || !printerConfig.name) {
        console.error('[ERROR] No printer configured');
        return;
      }
      
      const electronPrinterService = ElectronPrinterService.getInstance();
      
      // Group seats by class and row
      const groups = selectedSeats.reduce((acc, seat) => {
        const seatClass = getSeatClassByRow(seat.row);
        const classLabel = seatClass?.label || 'UNKNOWN';
        const price = getPriceForClass(classLabel);
        
        const key = `${classLabel}|${seat.row}`;
        if (!acc[key]) {
          acc[key] = {
            classLabel,
            row: seat.row,
            seats: [],
            price: 0,
            seatIds: [],
          };
        }
        acc[key].seats.push(seat.number);
        acc[key].price += price;
        acc[key].seatIds.push(seat.id);
        return acc;
      }, {} as Record<string, any>);
      
      const ticketGroups = Object.values(groups).map(group => ({
        theaterName: printerConfig.theaterName || getTheaterConfig().name,
        location: printerConfig.location || getTheaterConfig().location,
        date: selectedDate,
        showTime: showtime,
        showKey: selectedShow,
        movieName: currentMovie.name,
        movieLanguage: currentMovie.language,
        classLabel: group.classLabel,
        row: group.row,
        seatRange: formatSeatNumbers(group.seats),
        seatCount: group.seats.length,
        individualPrice: group.price / group.seats.length,
        totalPrice: group.price,
        isDecoupled: false,
        seatIds: group.seatIds,
        transactionId: 'TXN' + Date.now()
      }));
      
      console.log('[PRINT] Preparing to print grouped tickets via Electron:', ticketGroups);
       
      // Print each ticket group using Electron
      let allPrinted = true;
      for (const ticketGroup of ticketGroups) {
        const formattedTicket = electronPrinterService.formatTicketForThermal(ticketGroup);
        const printSuccess = await electronPrinterService.printTicket(formattedTicket, printerConfig.name, currentMovie);
        
        if (!printSuccess) {
          console.error('[ERROR] Failed to print ticket group:', ticketGroup.seatRange);
          allPrinted = false;
          break;
        }
      }
      
      if (!allPrinted) {
        console.error('[ERROR] Failed to print all tickets');
        return;
      }
      
      // Save booking to backend
      const { createBooking } = await import('@/services/api');
      
      const enhancedSeats = selectedSeats.map(seat => {
        const seatClass = getSeatClassByRow(seat.row);
        const classLabel = seatClass?.label || 'UNKNOWN';
        const price = getPriceForClass(classLabel);
        
        return {
          id: seat.id,
          row: seat.row,
          number: seat.number,
          classLabel,
          price,
        };
      });
      
      const response = await createBooking({
        tickets: enhancedSeats,
        total: enhancedSeats.reduce((sum, seat) => sum + seat.price, 0),
        totalTickets: enhancedSeats.length,
        timestamp: new Date().toISOString(),
        show: selectedShow,
        screen: currentMovie.screen,
        movie: currentMovie.name,
        date: selectedDate,
        source: 'LOCAL'
      });
      
      if (response.success) {
        selectedSeats.forEach(seat => toggleSeatStatus(seat.id, 'BOOKED'));
        console.log('[PRINT] Tickets printed and booking saved successfully');
      } else {
        console.error('[ERROR] Failed to save booking to backend');
      }
      
    } catch (error) {
      console.error('[ERROR] Error in exchange button:', error);
    }
    
    // Return to checkout page
    setIsExchangeMode(false);
    setActiveView('checkout');
  }, [seats, selectedShow, selectedDate, toggleSeatStatus, setIsExchangeMode, setActiveView]);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <IndexSidebar
        collapsed={collapsed}
        activeView={activeView}
        currentTime={currentTime}
        onViewChange={setActiveView}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      {/* Header */}
      <IndexHeader
        collapsed={collapsed}
        activeView={activeView}
        selectedDate={selectedDate}
        currentShowLabel={currentShowLabel}
        bmsMode={bmsMode}
        onBmsModeToggle={() => setBmsMode(!bmsMode)}
        historyDate={historyDateState?.selectedDate}
        onHistoryDateChange={historyDateState?.onDateChange}
        historyDatesWithBookings={historyDateState?.datesWithBookings}
        historyDayClassName={historyDateState?.dayClassName}
        reportsDate={reportsDate}
        onReportsDateChange={(date) => date && setReportsDate(date)}
        onReportsRefresh={() => {
          setReportsLoading(true);
          // Trigger refresh in BoxVsOnlineReport
          setTimeout(() => setReportsLoading(false), 500);
        }}
        reportsLoading={reportsLoading}
      />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col overflow-hidden ${collapsed ? 'ml-16' : 'ml-64'} ${activeView !== 'checkout' ? 'mt-20' : 'mt-0'}`}
      >
        <div className="flex-1 p-0 overflow-y-auto">
          {activeView === 'booking' && (
            <Suspense fallback={<div className="flex items-center justify-center p-8">Loading seat grid...</div>}>
              <SeatGrid 
                onProceed={(data) => { 
                  setCheckoutData(data); 
                  setActiveView('checkout'); 
                  setIsExchangeMode(false);
                }} 
                showRefreshButton={false}
                showExchangeButton={isExchangeMode}
                bmsMode={bmsMode}
                onBmsModeChange={setBmsMode}
                onExchange={handleExchange}
              />
            </Suspense>
          )}

          {activeView === 'history' && (
            <Suspense fallback={<div className="flex items-center justify-center p-8">Loading booking history...</div>}>
              <BookingErrorBoundary>
                <BookingHistory onDateStateChange={setHistoryDateState} />
              </BookingErrorBoundary>
            </Suspense>
          )}

          {activeView === 'reports' && (
            <Suspense fallback={<div className="flex items-center justify-center p-8">Loading reports...</div>}>
              <BoxVsOnlineReport 
                selectedDate={reportsDate}
                onDateChange={(date) => date && setReportsDate(date)}
                onRefresh={() => {
                  setReportsLoading(true);
                  setTimeout(() => setReportsLoading(false), 500);
                }}
                loading={reportsLoading}
              />
            </Suspense>
          )}

          {activeView === 'settings' && (
            <Suspense fallback={<div className="flex items-center justify-center p-8">Loading settings...</div>}>
              <Settings />
            </Suspense>
          )}

          {activeView === 'checkout' && (
            <Suspense fallback={<div className="flex items-center justify-center p-8">Loading checkout...</div>}>
              <Checkout
                checkoutData={checkoutData}
                onBookingComplete={handleBookingComplete}
                onManualShowSelection={handleManualShowSelection}
                onClearCheckoutData={() => setCheckoutData(null)}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
