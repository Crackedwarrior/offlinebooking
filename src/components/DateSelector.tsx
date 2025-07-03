
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useBookingStore } from '@/store/bookingStore';
import { cn } from '@/lib/utils';

const DateSelector = () => {
  const { selectedDate, setSelectedDate, selectedShow, loadBookingForDate } = useBookingStore();
  const [date, setDate] = useState<Date>(new Date(selectedDate));
  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      const dateString = newDate.toISOString().split('T')[0];
      setSelectedDate(dateString);
      loadBookingForDate(dateString, selectedShow);
      setIsOpen(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="font-semibold mb-3 text-gray-800">Select Date</h3>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-12",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Quick Date Options */}
      <div className="mt-4 space-y-2">
        <div className="text-sm font-medium text-gray-700 mb-2">Quick Select:</div>
        {[0, 1, 2].map((daysFromToday) => {
          const quickDate = new Date();
          quickDate.setDate(quickDate.getDate() + daysFromToday);
          const dateLabel = daysFromToday === 0 ? 'Today' : 
                           daysFromToday === 1 ? 'Tomorrow' : 
                           format(quickDate, 'MMM dd');
          
          return (
            <Button
              key={daysFromToday}
              variant="ghost"
              size="sm"
              onClick={() => handleDateSelect(quickDate)}
              className={cn(
                "w-full justify-start text-left",
                format(quickDate, 'yyyy-MM-dd') === selectedDate && 
                "bg-blue-100 text-blue-700"
              )}
            >
              {dateLabel}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default DateSelector;
