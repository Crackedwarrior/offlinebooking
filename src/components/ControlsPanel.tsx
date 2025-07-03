
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
      
      {/* Action Buttons */}
      <div className="space-y-3 mb-4">
        <Button
          onClick={handleSaveBooking}
          disabled={isSaving}
          className="w-full bg-green-600 hover:bg-green-700 h-11"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Booking'}
        </Button>

        <Button
          onClick={handleExportPDF}
          variant="outline"
          className="w-full h-11"
        >
          <Download className="w-4 h-4 mr-2" />
          Export PDF Report
        </Button>

        {isOnline && (
          <Button
            onClick={handleSyncToCloud}
            variant="outline"
            className="w-full h-11 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Cloud className="w-4 h-4 mr-2" />
            Sync to Cloud
          </Button>
        )}

        <Button
          onClick={handleResetSeats}
          variant="outline"
          className="w-full h-11 text-orange-600 border-orange-200 hover:bg-orange-50"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset All Seats
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="border-t pt-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Quick Stats</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-green-100 p-2 rounded text-center">
            <div className="font-semibold text-green-800">{stats.available}</div>
            <div className="text-green-600">Available</div>
          </div>
          <div className="bg-red-100 p-2 rounded text-center">
            <div className="font-semibold text-red-800">{stats.booked}</div>
            <div className="text-red-600">Booked</div>
          </div>
          <div className="bg-yellow-100 p-2 rounded text-center">
            <div className="font-semibold text-yellow-800">{stats.blocked}</div>
            <div className="text-yellow-600">Blocked</div>
          </div>
          <div className="bg-blue-100 p-2 rounded text-center">
            <div className="font-semibold text-blue-800">{stats.bmsBooked}</div>
            <div className="text-blue-600">BMS</div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mt-4 p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Status:</span>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-1 ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsPanel;
