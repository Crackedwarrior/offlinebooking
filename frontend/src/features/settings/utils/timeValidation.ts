/**
 * Time validation utilities
 * Extracted from Settings.tsx
 */

import type { ShowTimeInterval, TimeInterval } from '../types';
import type { ShowTimeSettings } from '@/store/settingsStore';

/**
 * Parse time string to minutes since midnight
 * Accepts formats like "H:MM", "HH:MM", and "H:MM AM/PM"
 */
export function parseToMinutes(raw: string): number {
  if (!raw) return 0;
  const parts = raw.trim().split(' ');
  const timePart = parts[0];
  const ampm = (parts[1] || '').toUpperCase();
  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Expand time intervals to handle overnight cases
 * If end < start, treat as overnight by splitting into [start, 1440) and [0, end)
 */
export function expandIntervals(startMin: number, endMin: number): TimeInterval[] {
  if (endMin < startMin) {
    return [
      { from: startMin, to: 1440 },
      { from: 0, to: endMin }
    ];
  }
  return [{ from: startMin, to: endMin }];
}

/**
 * Compute overlap errors for show times
 * Returns array of conflict messages
 */
export function computeOverlapErrors(shows: ShowTimeSettings[]): string[] {
  const enabled = shows.filter(s => s.enabled);
  const intervals: ShowTimeInterval[] = [];
  
  enabled.forEach(s => {
    const start = parseToMinutes(s.startTime);
    const end = parseToMinutes(s.endTime);
    const spans = expandIntervals(start, end);
    spans.forEach(span => intervals.push({ key: s.key, label: s.label, span }));
  });

  const conflicts: string[] = [];
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      const a = intervals[i];
      const b = intervals[j];
      const overlap = Math.max(0, Math.min(a.span.to, b.span.to) - Math.max(a.span.from, b.span.from));
      if (overlap > 0) conflicts.push(`${a.label} overlaps ${b.label}`);
    }
  }
  
  return Array.from(new Set(conflicts));
}

