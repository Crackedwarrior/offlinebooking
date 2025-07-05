
import { useBookingStore, ShowTime } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

const ShowSelector = () => {
  const { selectedShow, setSelectedShow, selectedDate, loadBookingForDate } = useBookingStore();

  const shows: Array<{ time: ShowTime; label: string; timing: string }> = [
    { time: 'Morning', label: 'Morning Show', timing: '10:00 AM' },
    { time: 'Matinee', label: 'Matinee Show', timing: '2:00 PM' },
    { time: 'Evening', label: 'Evening Show', timing: '6:00 PM' },
    { time: 'Night', label: 'Night Show', timing: '9:30 PM' },
  ];

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
