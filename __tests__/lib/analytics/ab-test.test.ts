/**
 * @jest-environment node
 *
 * Assignment, stickiness, and the split for the homepage A/B test.
 *
 * These are the properties the whole experiment rests on. If a visitor moves
 * between arms across page loads, or if one arm draws more traffic than the
 * others, the conversion numbers on /admin/ab-test compare designs that were
 * never shown to comparable audiences, and no amount of extra traffic fixes it.
 */

import {
  HOME_AB_COOKIE,
  HOME_AB_COOKIE_MAX_AGE,
  HOME_AB_TEST_NAME,
  HOME_VARIANTS,
  assignHomeVariant,
  eventForHref,
  isHomeAbEvent,
  isHomeAbTestEnabled,
  normalizeHomeVariant,
  type HomeVariant,
} from '@/lib/analytics/ab-test';

describe('the registered arms', () => {
  it('includes control, so every alternate design has something to beat', () => {
    expect(HOME_VARIANTS).toContain('control');
    expect(HOME_VARIANTS).toEqual(['control', 'a', 'b', 'c']);
  });

  it('names the cookie and test the API and dashboard agree on', () => {
    expect(HOME_AB_COOKIE).toBe('fl_home_variant');
    expect(HOME_AB_TEST_NAME).toBe('home-hero');
    // 90 days. A cookie that expires inside the test window silently reassigns
    // returning visitors, which reads as noise rather than as a bug.
    expect(HOME_AB_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 90);
  });
});

describe('assignHomeVariant', () => {
  it('only ever returns a registered arm', () => {
    for (let i = 0; i < 2_000; i += 1) {
      expect(HOME_VARIANTS).toContain(assignHomeVariant());
    }
  });

  it('draws from a range the arm count divides evenly, so the modulo cannot skew', () => {
    // The implementation takes a Uint32 and reduces it modulo HOME_VARIANTS.length.
    // That is only unbiased when the arm count divides 2^32. Four does. Five
    // would not, and this assertion is what would catch a fifth arm being added
    // without switching to rejection sampling.
    expect(2 ** 32 % HOME_VARIANTS.length).toBe(0);
  });

  it('splits evenly across many samples', () => {
    const SAMPLES = 40_000;
    const counts: Record<string, number> = Object.fromEntries(
      HOME_VARIANTS.map((v) => [v, 0]),
    );
    for (let i = 0; i < SAMPLES; i += 1) {
      counts[assignHomeVariant()] += 1;
    }

    const expected = 1 / HOME_VARIANTS.length;
    for (const variant of HOME_VARIANTS) {
      const share = counts[variant] / SAMPLES;
      // At 40k draws the standard error on a 25% share is about 0.22 points, so
      // a 1.5 point band is roughly seven standard errors: wide enough never to
      // flake, tight enough to catch an arm that is systematically starved.
      expect(Math.abs(share - expected)).toBeLessThan(0.015);
    }

    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(SAMPLES);
  });
});

describe('stickiness', () => {
  it('returns a pinned arm unchanged, so a repeat visitor keeps their design', () => {
    for (const variant of HOME_VARIANTS) {
      expect(normalizeHomeVariant(variant)).toBe(variant);
    }
  });

  it('keeps one visitor on one arm across many page loads', () => {
    // What a real visit sequence looks like: middleware assigns once, writes the
    // cookie, and every later request reads that same cookie value back.
    const assigned = assignHomeVariant();
    let cookie: string | undefined;
    const rendered: HomeVariant[] = [];

    for (let load = 0; load < 50; load += 1) {
      if (!cookie) cookie = assigned; // middleware only assigns when absent
      rendered.push(normalizeHomeVariant(cookie));
    }

    expect(new Set(rendered).size).toBe(1);
    expect(rendered[0]).toBe(assigned);
  });

  it('falls back to control for a missing or tampered cookie', () => {
    expect(normalizeHomeVariant(undefined)).toBe('control');
    expect(normalizeHomeVariant(null)).toBe('control');
    expect(normalizeHomeVariant('')).toBe('control');
    expect(normalizeHomeVariant('d')).toBe('control');
    expect(normalizeHomeVariant('CONTROL')).toBe('control');
    expect(normalizeHomeVariant('__proto__')).toBe('control');
  });
});

describe('isHomeAbTestEnabled', () => {
  const original = process.env.HOMEPAGE_AB_TEST_ENABLED;
  afterEach(() => {
    process.env.HOMEPAGE_AB_TEST_ENABLED = original;
  });

  it('is on only for the exact string "true"', () => {
    process.env.HOMEPAGE_AB_TEST_ENABLED = 'true';
    expect(isHomeAbTestEnabled()).toBe(true);

    for (const value of ['True', 'TRUE', '1', 'yes', 'false', '']) {
      process.env.HOMEPAGE_AB_TEST_ENABLED = value;
      expect(isHomeAbTestEnabled()).toBe(false);
    }

    delete process.env.HOMEPAGE_AB_TEST_ENABLED;
    expect(isHomeAbTestEnabled()).toBe(false);
  });
});

describe('eventForHref', () => {
  it('maps each funnel destination to the event the dashboard counts', () => {
    expect(eventForHref('/auth/signup')).toBe('signup_click');
    expect(eventForHref('/auth/signin')).toBe('signin_click');
    expect(eventForHref('/generate')).toBe('generate_click');
    expect(eventForHref('/flashcards')).toBe('study_click');
    expect(eventForHref('/study/abc')).toBe('study_click');
    expect(eventForHref('/dashboard')).toBe('dashboard_click');
  });

  it('resolves absolute URLs and query strings to the same event', () => {
    expect(eventForHref('https://flashlearnai.witus.online/auth/signup?ref=hero')).toBe(
      'signup_click',
    );
    expect(eventForHref('/auth/signup?plan=free#top')).toBe('signup_click');
  });

  it('ignores links outside the funnel', () => {
    expect(eventForHref('/pricing')).toBeNull();
    expect(eventForHref('/roadmap')).toBeNull();
    expect(eventForHref(null)).toBeNull();
    expect(eventForHref(undefined)).toBeNull();
    expect(eventForHref('')).toBeNull();
  });

  it('produces only event names the API accepts', () => {
    const hrefs = ['/auth/signup', '/auth/signin', '/generate', '/flashcards', '/dashboard'];
    for (const href of hrefs) {
      expect(isHomeAbEvent(eventForHref(href))).toBe(true);
    }
    expect(isHomeAbEvent('view')).toBe(true);
    expect(isHomeAbEvent('pageview')).toBe(false);
    expect(isHomeAbEvent(42)).toBe(false);
  });
});
