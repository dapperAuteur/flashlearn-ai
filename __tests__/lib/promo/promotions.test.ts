jest.mock('../../../models/Promotion', () => {
  const docs: Array<{
    slug: string;
    name: string;
    flatLimit: number;
    startsAt: Date;
    endsAt: Date;
    active: boolean;
    bannerMessage: string;
    bannerLink?: string;
    bannerLinkLabel?: string;
    pricingCallout: string;
    pricingTierBadge: string;
  }> = [];
  return {
    Promotion: {
      __setDocs: (newDocs: typeof docs) => {
        docs.length = 0;
        docs.push(...newDocs);
      },
      find: jest.fn((filter: { active?: boolean; startsAt?: { $lte: Date }; endsAt?: { $gt: Date } }) => ({
        sort: jest.fn(() => ({
          limit: jest.fn(() => ({
            lean: jest.fn(async () => {
              const now = filter.startsAt?.$lte ?? new Date();
              const matches = docs
                .filter((d) => d.active === filter.active)
                .filter((d) => d.startsAt.getTime() <= now.getTime())
                .filter((d) => d.endsAt.getTime() > now.getTime());
              matches.sort((a, b) => b.flatLimit - a.flatLimit);
              return matches.slice(0, 1);
            }),
          })),
        })),
      })),
    },
  };
});

import { getActivePromotion, clearPromotionsCache } from '@/lib/promo/promotions';
import { Promotion } from '@/models/Promotion';

const setDocs = (Promotion as unknown as { __setDocs: (d: unknown[]) => void }).__setDocs;

const fixture = {
  finals: {
    slug: 'finals-2026',
    name: 'Finals',
    flatLimit: 20,
    startsAt: new Date('2026-04-30T00:00:00Z'),
    endsAt: new Date('2026-06-01T06:59:00Z'),
    active: true,
    bannerMessage: 'finals!',
    pricingCallout: '',
    pricingTierBadge: '',
  },
  summer: {
    slug: 'summer-2026',
    name: 'Summer',
    flatLimit: 30,
    startsAt: new Date('2026-06-01T00:00:00Z'),
    endsAt: new Date('2026-08-31T23:59:59Z'),
    active: true,
    bannerMessage: 'summer!',
    pricingCallout: '',
    pricingTierBadge: '',
  },
  disabled: {
    slug: 'disabled-2026',
    name: 'Disabled',
    flatLimit: 100,
    startsAt: new Date('2026-04-01T00:00:00Z'),
    endsAt: new Date('2026-12-31T23:59:59Z'),
    active: false,
    bannerMessage: '',
    pricingCallout: '',
    pricingTierBadge: '',
  },
};

describe('getActivePromotion', () => {
  beforeEach(() => {
    clearPromotionsCache();
    setDocs([]);
  });

  it('returns null when no active promotions match', async () => {
    setDocs([fixture.disabled]);
    const result = await getActivePromotion(new Date('2026-05-15T00:00:00Z'));
    expect(result).toBeNull();
  });

  it('returns the matching active promotion within window', async () => {
    setDocs([fixture.finals]);
    const result = await getActivePromotion(new Date('2026-05-15T00:00:00Z'));
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('finals-2026');
    expect(result?.flatLimit).toBe(20);
  });

  it('picks the highest flatLimit when multiple are active', async () => {
    // Both active and within an overlapping window on 2026-06-01T03:00Z
    const overlapNow = new Date('2026-06-01T03:00:00Z');
    setDocs([fixture.finals, fixture.summer]);
    const result = await getActivePromotion(overlapNow);
    expect(result?.slug).toBe('summer-2026');
    expect(result?.flatLimit).toBe(30);
  });

  it('ignores promotions with active: false even within window', async () => {
    setDocs([fixture.disabled]);
    const result = await getActivePromotion(new Date('2026-06-15T00:00:00Z'));
    expect(result).toBeNull();
  });

  it('returns ISO strings on the public shape', async () => {
    setDocs([fixture.finals]);
    const result = await getActivePromotion(new Date('2026-05-15T00:00:00Z'));
    expect(typeof result?.startsAt).toBe('string');
    expect(typeof result?.endsAt).toBe('string');
    expect(result?.startsAt).toBe('2026-04-30T00:00:00.000Z');
  });
});
