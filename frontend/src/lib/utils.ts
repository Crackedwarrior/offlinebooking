import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { SHOW_TIMES } from './config';

export function getCurrentShowLabel() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  // Use centralized show time configuration
  if (totalMinutes >= 600 && totalMinutes < 720) return SHOW_TIMES[0].label; // 10:00 AM - 12:00 PM
  if (totalMinutes >= 840 && totalMinutes < 1020) return SHOW_TIMES[1].label; // 2:00 PM - 5:00 PM
  if (totalMinutes >= 1080 && totalMinutes < 1260) return SHOW_TIMES[2].label; // 6:00 PM - 9:00 PM
  if (totalMinutes >= 1350 || totalMinutes < 600) return SHOW_TIMES[3].label; // 9:30 PM - 12:30 AM (next day)
  
  // Default fallback
  return SHOW_TIMES[2].label; // Evening Show as default
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
    
    // Find the current show based on time ranges
    for (const show of showTimes) {
      const [startHour, startMin] = show.startTime.split(':').map(Number);
      const [endHour, endMin] = show.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
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
