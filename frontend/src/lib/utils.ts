import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { SHOW_TIMES } from './config';

export function getCurrentShowLabel() {
  // Use dynamic version instead of hardcoded timings
  return getCurrentShowLabelDynamic();
}

// Dynamic version that uses settings store
export function getCurrentShowLabelDynamic() {
  try {
    const { useSettingsStore } = require('@/store/settingsStore');
    const getShowTimes = useSettingsStore.getState().getShowTimes;
    const showTimes = getShowTimes();
    
    if (showTimes.length === 0) {
      return 'No shows available';
    }
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Parse 12-hour format times
    const parseTime = (timeStr: string) => {
      const [timePart, period] = timeStr.split(' ');
      const [hour, min] = timePart.split(':').map(Number);
      let hour24 = hour;
      if (period === 'PM' && hour !== 12) hour24 += 12;
      if (period === 'AM' && hour === 12) hour24 = 0;
      return hour24 * 60 + min;
    };
    
    // Find the current show based on time ranges
    for (const show of showTimes) {
      const startMinutes = parseTime(show.startTime);
      const endMinutes = parseTime(show.endTime);
      
      // Handle overnight shows (e.g., 23:30 - 02:30)
      if (endMinutes < startMinutes) {
        if (currentTime >= startMinutes || currentTime < endMinutes) {
          return show.label;
        }
      } else {
        if (currentTime >= startMinutes && currentTime < endMinutes) {
          return show.label;
        }
      }
    }
    
    // Default to first show if no match
    return showTimes[0]?.label || 'No shows available';
  } catch {
    // Fallback to static configuration
    return getCurrentShowLabel();
  }
}
