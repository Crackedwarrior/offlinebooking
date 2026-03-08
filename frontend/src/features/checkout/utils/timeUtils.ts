/**
 * Time utility functions extracted from Checkout.tsx
 * Industry standard: Pure functions in separate utility files
 */

/**
 * Helper function to convert various time strings to 12-hour format safely
 * @param raw - Raw time string (24-hour or 12-hour format)
 * @returns Formatted 12-hour time string
 */
export const convertTo12Hour = (raw: string): string => {
  if (!raw) return '';

  // Normalize separators and casing
  let s = String(raw).trim().replace('.', ':');
  const upper = s.toUpperCase();

  // If already has AM/PM, parse as 12-hour input
  if (upper.endsWith('AM') || upper.endsWith('PM')) {
    const match = upper.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)$/);
    if (!match) return upper; // fallback to original if unexpected
    let hh = parseInt(match[1], 10);
    let mm = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3];
    if (isNaN(hh)) hh = 0;
    if (isNaN(mm)) mm = 0;
    // Clamp
    hh = Math.max(1, Math.min(12, hh));
    mm = Math.max(0, Math.min(59, mm));
    return `${hh}:${mm.toString().padStart(2, '0')} ${period}`;
  }

  // Parse as 24-hour input like "HH" or "HH:MM"
  const parts = s.split(':');
  let hours = parseInt(parts[0] || '0', 10);
  let minutes = parts.length > 1 ? parseInt(parts[1] || '0', 10) : 0;
  if (isNaN(hours)) hours = 0;
  if (isNaN(minutes)) minutes = 0;
  hours = ((hours % 24) + 24) % 24; // normalize
  minutes = Math.max(0, Math.min(59, minutes));
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Parse time strings like "HH:MM", "H:MM", or "HH:MM AM/PM" into minutes since 00:00
 * @param raw - Raw time string
 * @returns Minutes since midnight
 */
export const parseTimeToMinutes = (raw: string): number => {
  if (!raw) return 0;
  const s = String(raw).trim().toUpperCase();
  // 12-hour with AM/PM
  const ampm = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)$/);
  if (ampm) {
    let hh = parseInt(ampm[1], 10);
    let mm = ampm[2] ? parseInt(ampm[2], 10) : 0;
    if (isNaN(hh)) hh = 0; if (isNaN(mm)) mm = 0;
    hh = hh % 12 + (ampm[3] === 'PM' ? 12 : 0);
    return hh * 60 + mm;
  }
  // 24-hour like "HH:MM" or "H:MM"
  const parts = s.split(':');
  const hh24 = parseInt(parts[0] || '0', 10);
  const mm24 = parts.length > 1 ? parseInt(parts[1].replace(/[^0-9]/g, '') || '0', 10) : 0;
  const hh = isNaN(hh24) ? 0 : hh24;
  const mm = isNaN(mm24) ? 0 : mm24;
  return ((hh % 24) * 60) + Math.max(0, Math.min(59, mm));
};

/**
 * Get current time in minutes since midnight
 * @returns Current time in minutes
 */
export const getCurrentTimeMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};
