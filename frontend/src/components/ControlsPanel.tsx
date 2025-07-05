import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Download, Cloud, RotateCcw, AlertCircle } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import { toast } from '@/hooks/use-toast';

const ControlsPanel = () => {
  const { saveBooking, initializeSeats, getBookingStats } = useBookingStore();
  const [isOnline, setIsOnline] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const stats = getBookingStats();

  const handleSaveBooking = async () => {
    setIsSaving(true);
    try {
      saveBooking();
      toast({
        title: "Booking Saved",
        description: "Seat bookings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    toast({
      title: "PDF Export",
      description: "Generating PDF report...",
    });
    // PDF generation logic would go here
  };

  const handleSyncToCloud = () => {
    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Cloud sync is not available while offline.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Syncing to Cloud",
      description: "Uploading booking data to cloud server...",
    });
    // Cloud sync logic would go here
  };

  const handleResetSeats = () => {
    if (window.confirm('Are you sure you want to reset all seats to available? This action cannot be undone.')) {
      initializeSeats();
      toast({
        title: "Seats Reset",
        description: "All seats have been reset to available status.",
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="font-semibold mb-4 text-gray-800">Controls</h3>
    </div>
  );
};

export default ControlsPanel;
