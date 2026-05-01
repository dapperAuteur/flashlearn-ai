import { Promotion, IPromotion } from '@/models/Promotion';

// Active promotion shape that's safe to expose to public clients.
// Strips audit fields (createdBy, timestamps) and Mongo internals.
export interface ActivePromotion {
  slug: string;
  name: string;
  flatLimit: number;
  startsAt: string;
  endsAt: string;
  bannerMessage: string;
  bannerLink?: string;
  bannerLinkLabel?: string;
  pricingCallout: string;
  pricingTierBadge: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { value: ActivePromotion | null; expiresAt: number } | null = null;

export function clearPromotionsCache(): void {
  cache = null;
}

function toPublic(p: IPromotion): ActivePromotion {
  return {
    slug: p.slug,
    name: p.name,
    flatLimit: p.flatLimit,
    startsAt: p.startsAt.toISOString(),
    endsAt: p.endsAt.toISOString(),
    bannerMessage: p.bannerMessage,
    bannerLink: p.bannerLink,
    bannerLinkLabel: p.bannerLinkLabel,
    pricingCallout: p.pricingCallout,
    pricingTierBadge: p.pricingTierBadge,
  };
}

// Returns the active Promotion with the highest flatLimit, or null if none active.
// Cached for CACHE_TTL_MS to avoid hammering Mongo on every rate-limit check.
// Call clearPromotionsCache() after admin writes to invalidate.
export async function getActivePromotion(now: Date = new Date()): Promise<ActivePromotion | null> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  try {
    const docs = await Promotion.find({
      active: true,
      startsAt: { $lte: now },
      endsAt: { $gt: now },
    })
      .sort({ flatLimit: -1 })
      .limit(1)
      .lean<IPromotion[]>();

    const value = docs.length > 0 ? toPublic(docs[0]) : null;
    cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  } catch {
    // On DB failure, return null (no promo) rather than throwing.
    // Callers should treat "no promo" as the safe default.
    return null;
  }
}
