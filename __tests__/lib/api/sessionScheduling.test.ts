import { nextLocalMidnight } from '@/lib/api/sessionScheduling';

// Helper: format a Date as the local Y-M-D in a target IANA timezone.
function localYMD(d: Date, tz: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(d);
}

function localHMS(d: Date, tz: string): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return fmt.format(d);
}

describe('nextLocalMidnight', () => {
  it('UTC: defaults to next UTC midnight when tz is undefined', () => {
    const from = new Date('2026-04-26T15:00:00Z'); // 3pm UTC on the 26th
    const next = nextLocalMidnight(undefined, from);
    expect(next.toISOString()).toBe('2026-04-27T00:00:00.000Z');
  });

  it('UTC: explicit "UTC" produces the same result', () => {
    const from = new Date('2026-04-26T15:00:00Z');
    expect(nextLocalMidnight('UTC', from).toISOString()).toBe('2026-04-27T00:00:00.000Z');
  });

  it('UTC: invalid tz falls back to UTC', () => {
    const from = new Date('2026-04-26T15:00:00Z');
    expect(nextLocalMidnight('Not/A_Zone', from).toISOString()).toBe('2026-04-27T00:00:00.000Z');
  });

  it('America/Indiana/Indianapolis: 3pm ET on the 26th → next local midnight is 27th 00:00 ET', () => {
    // 2026-04-26 15:00 ET = 19:00 UTC (EDT, UTC-4 in late April)
    const from = new Date('2026-04-26T19:00:00Z');
    const next = nextLocalMidnight('America/Indiana/Indianapolis', from);
    expect(localYMD(next, 'America/Indiana/Indianapolis')).toBe('2026-04-27');
    expect(localHMS(next, 'America/Indiana/Indianapolis')).toBe('00:00:00');
    // And critically, this is NOT 7pm ET the same day (the bug Wanderlearn flagged).
    expect(next.toISOString()).not.toBe('2026-04-26T23:00:00.000Z');
  });

  it('America/Indiana/Indianapolis: very late at night, returns the imminent next local midnight', () => {
    // 2026-04-26 23:30 ET = 03:30 UTC on the 27th. "Next local midnight" is
    // ~30 min away (00:00 ET on the 27th). The brief is "next calendar day
    // in the family tz", which this satisfies.
    const from = new Date('2026-04-27T03:30:00Z');
    const next = nextLocalMidnight('America/Indiana/Indianapolis', from);
    expect(localYMD(next, 'America/Indiana/Indianapolis')).toBe('2026-04-27');
    expect(localHMS(next, 'America/Indiana/Indianapolis')).toBe('00:00:00');
    // Should be in the future, but not necessarily 24h out — that was an
    // over-interpretation of the brief.
    expect(next.getTime()).toBeGreaterThan(from.getTime());
  });

  it('Asia/Tokyo: 3pm JST → next local midnight is JST 00:00 (positive offset zone)', () => {
    // 2026-04-26 15:00 JST = 06:00 UTC (Tokyo = UTC+9)
    const from = new Date('2026-04-26T06:00:00Z');
    const next = nextLocalMidnight('Asia/Tokyo', from);
    expect(localYMD(next, 'Asia/Tokyo')).toBe('2026-04-27');
    expect(localHMS(next, 'Asia/Tokyo')).toBe('00:00:00');
  });

  it('Returned Date is always strictly in the future', () => {
    const samples = [
      new Date('2026-04-26T00:00:00Z'),
      new Date('2026-04-26T12:00:00Z'),
      new Date('2026-04-26T23:59:59Z'),
    ];
    for (const tz of ['UTC', 'America/Indiana/Indianapolis', 'Europe/London', 'Asia/Tokyo']) {
      for (const from of samples) {
        const next = nextLocalMidnight(tz, from);
        expect(next.getTime()).toBeGreaterThan(from.getTime());
      }
    }
  });

  it('Returned Date wall-clock time is exactly 00:00:00 in the target tz', () => {
    for (const tz of ['UTC', 'America/Indiana/Indianapolis', 'Europe/London', 'Asia/Tokyo']) {
      const next = nextLocalMidnight(tz, new Date('2026-04-26T15:00:00Z'));
      expect(localHMS(next, tz)).toBe('00:00:00');
    }
  });
});
