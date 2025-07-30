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
      // Update the booking store with the selected date and show
      setSelectedDate(date);
      setSelectedShow(show as any);
      
      // Fetch seat status from API
      const response = await getSeatStatus({ date, show });
      
      if (response.success) {
        console.log('✅ Seat status loaded for preview:', response.data);
      } else {
        throw new Error('Failed to load seat status');
      }
    } catch (error) {
      console.error('❌ Error loading seat status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load seat status for preview',
        variant: 'destructive',
      });
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
              <SeatGrid hideProceedButton={true} hideRefreshButton={true} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SeatGridPreview; 