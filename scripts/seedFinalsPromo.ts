/**
 * One-shot seed script that inserts the Finals Season Boost into the
 * Promotion collection. Replaces the old hardcoded lib/promo/finals.ts
 * approach now that the generic Promotion model is the source of truth.
 *
 * Run: npx tsx scripts/seedFinalsPromo.ts
 *
 * Idempotent: uses upsert keyed on slug. Safe to re-run; only the slug
 * "finals-2026" is touched.
 *
 * After running this, the rate limiter and the in-app banner pull the
 * promo state from Mongo via getActivePromotion() instead of from the
 * FINALS_PROMO_END_UTC env var. The env var becomes dead config.
 */
import mongoose from 'mongoose';
import { Promotion } from '../models/Promotion';

const FINALS_PROMO = {
  slug: 'finals-2026',
  name: 'Finals Season Boost',
  flatLimit: 20,
  startsAt: new Date('2026-04-30T00:00:00Z'),
  endsAt: new Date(process.env.FINALS_PROMO_END_UTC ?? '2026-06-01T06:59:00Z'),
  active: true,
  bannerMessage: 'Finals Season Boost: every plan gets 20 AI sets per 30 days through May 31.',
  bannerLink: '/pricing',
  bannerLinkLabel: 'See plans',
  pricingCallout: 'Plus unlimited CSV imports on every tier. Caps revert June 1.',
  pricingTierBadge: '20 through May 31',
};

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI before running this script.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const result = await Promotion.findOneAndUpdate(
    { slug: FINALS_PROMO.slug },
    { $set: FINALS_PROMO },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`Upserted promotion: ${result.slug}`);
  console.log(`  flatLimit: ${result.flatLimit}`);
  console.log(`  startsAt:  ${result.startsAt.toISOString()}`);
  console.log(`  endsAt:    ${result.endsAt.toISOString()}`);
  console.log(`  active:    ${result.active}`);

  await mongoose.disconnect();
  console.log('Disconnected.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
