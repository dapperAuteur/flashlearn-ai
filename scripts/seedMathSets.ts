/**
 * Seed the curated math sets: the single-digit math fact sets (addition,
 * subtraction, multiplication, division) plus the geometry, trigonometry, and
 * calculus reference sets.
 *
 * Every set holds between 10 and 20 cards. Math fact sets hold 11, one focus
 * number crossed with 0 through 10, so a student can drill the 7s without
 * wading through 121 cards.
 *
 * Run: npm run seed:math -- --owner-email=you@example.com --dry-run
 *      npm run seed:math -- --owner-email=you@example.com
 *
 * Flags:
 *   --owner-email=<email>  Account that owns the sets. Required, or set
 *                          MATH_SEED_OWNER_EMAIL. The account must already exist.
 *   --dry-run              Report what would change and write nothing.
 *   --only=<prefix>        Seed only sets whose slug starts with this, for
 *                          example --only=math-facts-addition or --only=calculus.
 *   --private              Create the sets private instead of public.
 *   --feature              Mark the seeded sets as featured on Explore. Off by
 *                          default: there are too many to feature them all.
 *
 * Idempotent. Re-running updates the existing sets in place and matches cards by
 * their stable externalId, so a student's review history (which is keyed on the
 * card _id) survives a re-seed. Cards this script seeded earlier that are no
 * longer in the set are removed; anything added by hand is left alone.
 */
import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { FlashcardSet, type IFlashcard } from '../models/FlashcardSet';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { mathFactSets, type MathFactCard } from '../lib/data/math-facts';
import { loadReferenceSubjects, referenceCardExternalId } from '../lib/data/math-reference/loadSets';
import { mergeSeedCards, SEED_ID_PREFIX } from '../lib/data/mergeSeedCards';

/**
 * Marks a set as seeded by this script. Stored as a tag because FlashcardSet has
 * no slug field, and a tag survives a title change.
 */
const SEED_TAG = 'seeded:math';

const MATH_CATEGORY = {
  name: 'Mathematics',
  slug: 'mathematics',
  description: 'Arithmetic fluency, geometry, trigonometry, and calculus.',
  color: '#2563EB',
  sortOrder: 10,
};

type SeedCard = Pick<MathFactCard, 'externalId' | 'front' | 'back'> & Partial<MathFactCard>;

interface SeedableSet {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  cards: SeedCard[];
  featuredOrder: number;
}

interface Options {
  ownerEmail: string;
  dryRun: boolean;
  only: string;
  isPublic: boolean;
  feature: boolean;
}

function parseArgs(argv: string[]): Options {
  const flag = (name: string): string | undefined => {
    const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
    if (!hit) return undefined;
    return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : '';
  };

  const ownerEmail = flag('owner-email') || process.env.MATH_SEED_OWNER_EMAIL || '';
  if (!ownerEmail) {
    throw new Error(
      'Pass --owner-email=<email> or set MATH_SEED_OWNER_EMAIL. The script will not guess which account should own the sets.',
    );
  }

  return {
    ownerEmail: ownerEmail.trim().toLowerCase(),
    dryRun: flag('dry-run') !== undefined,
    only: flag('only') ?? '',
    isPublic: flag('private') === undefined,
    feature: flag('feature') !== undefined,
  };
}

/** Every set to seed, math facts first, then the reference subjects. */
function collectSets(): SeedableSet[] {
  const sets: SeedableSet[] = mathFactSets().map((s, index) => ({
    slug: s.slug,
    title: s.title,
    description: s.description,
    tags: [...s.tags, SEED_TAG],
    cards: s.cards,
    featuredOrder: index + 1,
  }));

  for (const subject of loadReferenceSubjects()) {
    for (const s of subject.sets) {
      sets.push({
        slug: s.slug,
        title: s.title,
        description: s.description,
        tags: [...s.tags, s.slug, SEED_TAG],
        cards: s.cards.map((card) => ({
          externalId: referenceCardExternalId(s.slug, card.front),
          front: card.front,
          back: card.back,
        })),
        featuredOrder: sets.length + 1,
      });
    }
  }

  return sets;
}

async function resolveOwnerProfile(email: string): Promise<mongoose.Types.ObjectId> {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const user = await User.findOne({ email: new RegExp(`^${escaped}$`, 'i') })
    .select('_id email profiles')
    .lean<{ _id: mongoose.Types.ObjectId; email: string; profiles?: mongoose.Types.ObjectId[] }>();

  if (!user) {
    throw new Error(`No account found for ${email}. Create the account first, then re-run.`);
  }
  if (user.profiles?.length) {
    return user.profiles[0];
  }

  // Same self-healing path the app uses when a user saves a set before a profile
  // exists (app/api/flashcards/route.ts).
  const profile = await Profile.create({ user: user._id, profileName: 'My Profile' });
  await User.findByIdAndUpdate(user._id, { $push: { profiles: profile._id } });
  console.log(`Created a default profile for ${user.email}.`);

  return profile._id;
}

async function ensureMathCategory(dryRun: boolean): Promise<mongoose.Types.ObjectId | null> {
  const existing = await Category.findOne({ slug: MATH_CATEGORY.slug })
    .select('_id')
    .lean<{ _id: mongoose.Types.ObjectId }>();
  if (existing) return existing._id;

  if (dryRun) {
    console.log(`[dry-run] would create the "${MATH_CATEGORY.name}" category.`);
    return null;
  }

  const created = await Category.create(MATH_CATEGORY);
  console.log(`Created the "${MATH_CATEGORY.name}" category.`);

  return created._id;
}

interface SetResult {
  slug: string;
  action: 'created' | 'updated' | 'unchanged';
  added: number;
  changed: number;
  removed: number;
  total: number;
}

async function seedSet(
  seedable: SeedableSet,
  ctx: {
    profileId: mongoose.Types.ObjectId;
    categoryId: mongoose.Types.ObjectId | null;
    options: Options;
  },
): Promise<SetResult> {
  const { profileId, categoryId, options } = ctx;
  const existing = await FlashcardSet.findOne({ profile: profileId, tags: seedable.slug });

  const merge = mergeSeedCards<IFlashcard>(existing?.flashcards ?? [], seedable.cards, SEED_ID_PREFIX);
  const action: SetResult['action'] = !existing
    ? 'created'
    : merge.added || merge.changed || merge.removed
      ? 'updated'
      : 'unchanged';

  const result: SetResult = {
    slug: seedable.slug,
    action,
    added: merge.added,
    changed: merge.changed,
    removed: merge.removed,
    total: merge.cards.length,
  };

  if (options.dryRun) return result;

  const doc = existing ?? new FlashcardSet({ profile: profileId, source: 'CSV' });

  doc.title = seedable.title;
  doc.description = seedable.description;
  doc.isPublic = options.isPublic;
  // 'CSV' is the enum value the app uses for cards that were authored rather
  // than generated by a model. FlashcardSet.source has no 'Seed' value.
  doc.source = 'CSV';
  doc.tags = seedable.tags;
  doc.flashcards = merge.cards;
  doc.cardCount = merge.cards.length;
  if (categoryId) doc.categories = [categoryId];
  if (options.feature) {
    doc.isFeatured = true;
    doc.featuredOrder = seedable.featuredOrder;
  }

  await doc.save();

  return result;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required. Run with --env-file=.env.local or export it first.');
  }

  const all = collectSets();
  const sets = options.only ? all.filter((s) => s.slug.startsWith(options.only)) : all;
  if (sets.length === 0) {
    throw new Error(`No sets matched --only=${options.only}.`);
  }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB.${options.dryRun ? ' Dry run: nothing will be written.' : ''}`);

  const profileId = await resolveOwnerProfile(options.ownerEmail);
  const categoryId = await ensureMathCategory(options.dryRun);

  const results: SetResult[] = [];
  for (const seedable of sets) {
    results.push(await seedSet(seedable, { profileId, categoryId, options }));
  }

  if (categoryId && !options.dryRun) {
    await Category.updateOne(
      { _id: categoryId },
      { setCount: await FlashcardSet.countDocuments({ categories: categoryId }) },
    );
  }

  console.log('');
  for (const r of results) {
    const detail = [r.added ? `+${r.added}` : '', r.changed ? `~${r.changed}` : '', r.removed ? `-${r.removed}` : '']
      .filter(Boolean)
      .join(' ');
    console.log(`  ${r.action.padEnd(9)} ${r.slug.padEnd(44)} ${String(r.total).padStart(3)} cards ${detail}`.trimEnd());
  }

  const tally = (action: SetResult['action']) => results.filter((r) => r.action === action).length;
  const totalCards = results.reduce((n, r) => n + r.total, 0);
  console.log(
    `\n${results.length} sets (${tally('created')} created, ${tally('updated')} updated, ${tally('unchanged')} unchanged), ${totalCards} cards.`,
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
