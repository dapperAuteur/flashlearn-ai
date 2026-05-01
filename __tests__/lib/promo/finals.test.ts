import { getFinalsPromo } from '@/lib/promo/finals';

describe('getFinalsPromo', () => {
  const ORIGINAL_ENV = process.env.FINALS_PROMO_END_UTC;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.FINALS_PROMO_END_UTC;
    } else {
      process.env.FINALS_PROMO_END_UTC = ORIGINAL_ENV;
    }
  });

  it('uses the hardcoded fallback when env var is unset', () => {
    delete process.env.FINALS_PROMO_END_UTC;
    const promo = getFinalsPromo(new Date('2026-04-30T12:00:00Z'));
    expect(promo.endsAt.toISOString()).toBe('2026-06-01T06:59:00.000Z');
    expect(promo.flatLimit).toBe(20);
    expect(promo.active).toBe(true);
  });

  it('honors a valid env var override', () => {
    process.env.FINALS_PROMO_END_UTC = '2026-07-15T00:00:00Z';
    const promo = getFinalsPromo(new Date('2026-06-30T00:00:00Z'));
    expect(promo.endsAt.toISOString()).toBe('2026-07-15T00:00:00.000Z');
    expect(promo.active).toBe(true);
  });

  it('falls back when env var is unparseable', () => {
    process.env.FINALS_PROMO_END_UTC = 'not-a-date';
    const promo = getFinalsPromo(new Date('2026-04-30T12:00:00Z'));
    expect(promo.endsAt.toISOString()).toBe('2026-06-01T06:59:00.000Z');
    expect(promo.active).toBe(true);
  });

  it('reports inactive after the cutoff', () => {
    delete process.env.FINALS_PROMO_END_UTC;
    const justAfter = new Date('2026-06-01T06:59:00.001Z');
    const promo = getFinalsPromo(justAfter);
    expect(promo.active).toBe(false);
  });

  it('reports inactive at exactly the cutoff (strict less-than)', () => {
    delete process.env.FINALS_PROMO_END_UTC;
    const atCutoff = new Date('2026-06-01T06:59:00.000Z');
    const promo = getFinalsPromo(atCutoff);
    expect(promo.active).toBe(false);
  });
});
