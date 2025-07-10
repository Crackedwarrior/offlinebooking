import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrentShowLabel() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes >= 360 && totalMinutes < 720) return 'Morning Show'; // 6:00 AM - 12:00 PM
  if (totalMinutes >= 720 && totalMinutes < 1020) return 'Matinee Show'; // 12:00 PM - 5:00 PM
  if (totalMinutes >= 1020 && totalMinutes < 1230) return 'Evening Show'; // 5:00 PM - 8:30 PM
  return 'Night Show'; // 8:30 PM - 6:00 AM
}
