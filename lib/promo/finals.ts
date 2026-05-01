const FINALS_PROMO_END_FALLBACK_ISO = '2026-06-01T06:59:00Z';
const FINALS_PROMO_FLAT_LIMIT = 20;

export interface FinalsPromoState {
  active: boolean;
  endsAt: Date;
  flatLimit: number;
}

export function getFinalsPromo(now: Date = new Date()): FinalsPromoState {
  const raw = process.env.FINALS_PROMO_END_UTC ?? FINALS_PROMO_END_FALLBACK_ISO;
  const parsed = new Date(raw);
  const endsAt = Number.isNaN(parsed.getTime()) ? new Date(FINALS_PROMO_END_FALLBACK_ISO) : parsed;
  return {
    active: now.getTime() < endsAt.getTime(),
    endsAt,
    flatLimit: FINALS_PROMO_FLAT_LIMIT,
  };
}
