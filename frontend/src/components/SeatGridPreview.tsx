import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { getSeatStatus } from '@/services/api';
import { useBookingStore } from '@/store/bookingStore';
import SeatGrid from '@/components/SeatGrid';
import { toast } from '@/hooks/use-toast';

interface SeatGridPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  show: string;
  showLabel: string;
}

const SeatGridPreview = ({ isOpen, onClose, date, show, showLabel }: SeatGridPreviewProps) => {
  const [loading, setLoading] = useState(false);
  const { setSelectedDate, setSelectedShow } = useBookingStore();

  // Load seat status when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSeatStatus();
    }
  }, [isOpen, date, show]);

  const loadSeatStatus = async () => {
    setLoading(true);
    try {
      console.log('🔍 SeatGridPreview loading with:', { date, show, showLabel });
      
      // Update the booking store with the selected date and show
      setSelectedDate(date);
      setSelectedShow(show as any);
      
      // Fetch seat status from API
      const response = await getSeatStatus({ date, show });
      
      if (response.success && response.data) {
        console.log('✅ Seat status loaded for preview:', response.data);
        
        // Manually sync the seat status to ensure it's applied
        const { syncSeatStatus } = useBookingStore.getState();
        const bookedSeats = response.data.bookedSeats || [];
        const bmsSeats = response.data.bmsSeats || [];
        const bookedSeatIds = bookedSeats.map((seat: any) => seat.seatId);
        const bmsSeatIds = bmsSeats.map((seat: any) => seat.seatId);
        
        console.log('🔄 Preview: Syncing seat status for', { date, show, bookedSeatIds, bmsSeatIds });
        syncSeatStatus(bookedSeatIds, bmsSeatIds);
        
        // Add a small delay to ensure the state is updated before rendering
        setTimeout(() => {
          const currentState = useBookingStore.getState();
          console.log('🔍 Preview: Current seat state after sync:', {
            totalSeats: currentState.seats.length,
            bookedSeats: currentState.seats.filter(s => s.status === 'booked').length,
            bmsSeats: currentState.seats.filter(s => s.status === 'bms-booked').length,
            sampleBookedSeats: currentState.seats.filter(s => s.status === 'booked').slice(0, 3).map(s => s.id),
            sampleBmsSeats: currentState.seats.filter(s => s.status === 'bms-booked').slice(0, 3).map(s => s.id)
          });
        }, 100);
      } else {
        throw new Error('Failed to load seat status');
      }
    } catch (error) {
      console.error('❌ Error loading seat status:', error);
      // Removed toast notification as requested
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-none h-[95vh] overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Seat Grid Preview - {showLabel}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Date: {new Date(date).toLocaleDateString()} • Show: {showLabel}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading seat status...</span>
              </div>
            </div>
          ) : (
            <div className="h-full">
              <SeatGrid hideProceedButton={true} hideRefreshButton={true} disableAutoFetch={true} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SeatGridPreview; 