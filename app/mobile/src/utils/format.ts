export function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const rem = Math.round(minutes % 60);
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export function formatSpeed(mph: number): string {
  return `${Math.round(mph)} mph`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Compact start → end window for trip summary + Insights detail (local device timezone). */
export function formatTripTimeRange(startedAt?: string, endedAt?: string): string {
  const parse = (iso?: string): Date | null => {
    if (!iso?.trim()) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const start = parse(startedAt);
  const end = parse(endedAt) ?? start;
  if (!start && !end) return '';
  const anchor = start ?? end!;
  const sameDay =
    start && end
      ? start.toDateString() === end.toDateString()
      : true;
  const dateFmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  if (start && end && sameDay) {
    const day = start.toLocaleDateString(undefined, dateFmt);
    return `${day} · ${start.toLocaleTimeString(undefined, timeFmt)} – ${end.toLocaleTimeString(undefined, timeFmt)}`;
  }
  if (start && end) {
    return `${start.toLocaleString(undefined, { ...dateFmt, ...timeFmt })} – ${end.toLocaleString(undefined, { ...dateFmt, ...timeFmt })}`;
  }
  return anchor.toLocaleString(undefined, { ...dateFmt, ...timeFmt });
}
