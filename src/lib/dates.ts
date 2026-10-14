const TZ = 'Asia/Seoul';

const longFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/** "Oct 13, 2026" in Seoul time. */
export function formatDate(iso?: string): string {
  if (!iso) return '';
  return longFmt.format(new Date(iso));
}

/** "2026-10-13" in Seoul time, for <time datetime> and sitemaps. */
export function isoDay(iso?: string): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  return parts;
}

export function timestamp(iso?: string): number {
  return iso ? Date.parse(iso) : Number.NaN;
}
