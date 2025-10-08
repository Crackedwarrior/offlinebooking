// Time utilities for consistent 12-hour format handling and show selection

export type ShowTimeConfig = {
  key: string;
  label: string;
  startTime: string; // e.g., "6:00 PM"
  endTime: string;   // e.g., "9:00 PM"
  enabled: boolean;
};

export function formatTo12Hour(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
}

export function parse12HourToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [timePartRaw, periodRaw] = timeStr.trim().split(/\s+/);
  const period = (periodRaw || '').toUpperCase();
  const [hourStr, minStr] = (timePartRaw || '').split(':');
  let hour = parseInt(hourStr || '0', 10);
  const minute = parseInt(minStr || '0', 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export function getShowKeyFromNow(shows: ShowTimeConfig[], now: Date = new Date()): string | null {
  const enabled = shows.filter(s => s.enabled);
  if (enabled.length === 0) return null;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < enabled.length; i++) {
    const show = enabled[i];
    const start = parse12HourToMinutes(show.startTime);
    const end = parse12HourToMinutes(show.endTime);
    const next = enabled[i + 1];
    const nextStart = next ? parse12HourToMinutes(next.startTime) : null;

    let inRange = false;
    if (end < start) {
      inRange = nowMinutes >= start || nowMinutes < end; // overnight
    } else {
      inRange = nowMinutes >= start && nowMinutes < end;
    }

    const afterStart = nowMinutes >= start;
    const beforeNext = nextStart == null || nowMinutes < nextStart;

    if (inRange || (afterStart && beforeNext)) return show.key;
  }

  // Fallback to most recent started show
  for (let i = enabled.length - 1; i >= 0; i--) {
    const start = parse12HourToMinutes(enabled[i].startTime);
    if ((now.getHours() * 60 + now.getMinutes()) >= start) return enabled[i].key;
  }
  return enabled[0].key;
}

export function getShowLabelByKey(shows: ShowTimeConfig[], key: string): string {
  const s = shows.find(sh => sh.key === key);
  return s ? s.label : key;
}


