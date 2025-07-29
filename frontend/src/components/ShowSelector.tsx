
import { useBookingStore, ShowTime } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

const ShowSelector = () => {
  const { selectedShow, setSelectedShow, selectedDate, loadBookingForDate } = useBookingStore();
  const { getShowTimes } = useSettingsStore();

  const shows = getShowTimes().map(show => ({
    time: show.key as ShowTime,
    label: show.label,
    timing: `${show.startTime} - ${show.endTime}`
  }));

  const handleShowSelect = (show: ShowTime) => {
    setSelectedShow(show);
    loadBookingForDate(selectedDate, show);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="font-semibold mb-3 text-gray-800 flex items-center">
        <Clock className="w-4 h-4 mr-2" />
        Select Show
      </h3>
      
      <div className="space-y-2">
        {shows.map((show) => (
          <Button
            key={show.time}
            variant={selectedShow === show.time ? "default" : "outline"}
            className={`w-full justify-between h-12 ${
              selectedShow === show.time 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => handleShowSelect(show.time)}
          >
            <div className="text-left">
              <div className="font-medium">{show.label}</div>
              <div className="text-xs opacity-75">{show.timing}</div>
            </div>
            {selectedShow === show.time && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
          </Button>
        ))}
      </div>

      {/* Show Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Current Show:</span>
            <span className="font-medium">{selectedShow}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-600">Screen:</span>
            <span className="font-medium">Screen 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowSelector;
