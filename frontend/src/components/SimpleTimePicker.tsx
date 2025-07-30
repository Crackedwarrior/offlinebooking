import React from 'react';

interface SimpleTimePickerProps {
  value: string; // 24-hour format for storage
  onChange: (value: string) => void;
  label: string;
  id: string;
}

export const SimpleTimePicker: React.FC<SimpleTimePickerProps> = ({
  value,
  onChange,
  label,
  id
}) => {
  // Convert 24-hour format to 12-hour format for display
  const convertTo12Hour = (time24h: string): { hour: number; minute: number; period: 'AM' | 'PM' } => {
    if (!time24h || typeof time24h !== 'string') {
      return { hour: 12, minute: 0, period: 'AM' };
    }
    
    const [hours, minutes] = time24h.split(':').map(Number);
    
    // Validate the parsed values
    if (isNaN(hours) || isNaN(minutes)) {
      return { hour: 12, minute: 0, period: 'AM' };
    }
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    return { hour: displayHour, minute: minutes, period };
  };

  // Convert 12-hour format to 24-hour format for storage
  const convertTo24Hour = (hour: number, minute: number, period: 'AM' | 'PM'): string => {
    let hours = hour;
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const { hour, minute, period } = convertTo12Hour(value);

  const handleHourChange = (newHour: number) => {
    onChange(convertTo24Hour(newHour, minute, period));
  };

  const handleMinuteChange = (newMinute: number) => {
    onChange(convertTo24Hour(hour, newMinute, period));
  };

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    onChange(convertTo24Hour(hour, minute, newPeriod));
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        {/* Hour Selector */}
        <select
          id={`${id}-hour`}
          value={hour}
          onChange={(e) => handleHourChange(parseInt(e.target.value))}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        
        <span className="text-gray-500 font-medium">:</span>
        
        {/* Minute Selector */}
        <select
          id={`${id}-minute`}
          value={minute}
          onChange={(e) => handleMinuteChange(parseInt(e.target.value))}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {Array.from({ length: 60 }, (_, i) => i).map(m => (
            <option key={m} value={m}>
              {m.toString().padStart(2, '0')}
            </option>
          ))}
        </select>
        
        {/* AM/PM Selector */}
        <select
          id={`${id}-period`}
          value={period}
          onChange={(e) => handlePeriodChange(e.target.value as 'AM' | 'PM')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}; 