// Returns the Date for the next "local midnight" relative to `from` in the
// given IANA timezone. Used to schedule next-day deck delivery for ecosystem
// sessions per Wanderlearn's brief — UTC midnight + 1 fires too early for
// Eastern-time families (Indiana pilot), so consumers send a tz string and
// we honor it.
//
// Behavior:
//   - tz omitted, 'UTC', or invalid → tomorrow at 00:00 UTC.
//   - tz valid IANA name → tomorrow at 00:00 in that local zone.
//
// "Tomorrow" = the local calendar day after the local day of `from`. So
// 11:59pm local → ~1 min until midnight; midday local → ~12h until midnight.
// The brief's intent is "next calendar day in the family's tz," not "≥ 24h
// from now." If consumers want a longer lead they can schedule for noon
// instead of midnight in a future iteration.
export function nextLocalMidnight(tz: string | undefined, from: Date = new Date()): Date {
  const zone = tz && isValidTimeZone(tz) ? tz : 'UTC';

  // Get the current Y/M/D in the target timezone using Intl.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(from);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

  // Tomorrow's local date. Date.UTC handles month/year rollover.
  return localMidnightToDate(get('year'), get('month'), get('day') + 1, zone);
}

// True if `tz` is a syntactically valid + recognized IANA name in this Node.
function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Resolves `<year>-<month>-<day>T00:00:00` interpreted in `zone` to a UTC Date.
// Uses Intl to compute the offset at that wall time, then adjusts.
function localMidnightToDate(year: number, month: number, day: number, zone: string): Date {
  // Naive UTC interpretation as a starting guess.
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offsetMs = getZoneOffsetMs(guess, zone);
  // The wall-time we want is `guess` (in local terms) — UTC equivalent is
  // wall-time minus offset. Negative offsets (e.g. America/New_York = -04:00)
  // mean local midnight is later in UTC; positive offsets the reverse.
  return new Date(guess.getTime() - offsetMs);
}

// Returns the milliseconds offset of `zone` from UTC at the moment `at`.
// Negative for zones west of UTC (e.g. -14_400_000 for America/New_York EDT).
function getZoneOffsetMs(at: Date, zone: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - at.getTime();
}
