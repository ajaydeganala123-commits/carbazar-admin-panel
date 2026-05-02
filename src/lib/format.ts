import { formatDistanceToNow } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';

export function pkr(value: number | undefined | null): string {
  if (value == null) return '—';
  if (value >= 10_000_000) return `PKR ${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `PKR ${(value / 100_000).toFixed(1)} Lac`;
  return `PKR ${value.toLocaleString()}`;
}

export function tsToDate(ts: Timestamp | Date | null | undefined): Date | null {
  if (ts == null) return null;
  if (ts instanceof Date) return ts;
  if (typeof (ts as Timestamp).toDate === 'function') {
    return (ts as Timestamp).toDate();
  }
  return null;
}

export function relativeTime(ts: Timestamp | Date | null | undefined): string {
  const d = tsToDate(ts);
  if (d == null) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function shortDate(ts: Timestamp | Date | null | undefined): string {
  const d = tsToDate(ts);
  if (d == null) return '—';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeUntil(ts: Timestamp | Date | null | undefined): string {
  const d = tsToDate(ts);
  if (d == null) return '—';
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m left`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m left`;
  const day = Math.floor(hr / 24);
  return `${day}d ${hr % 24}h left`;
}
