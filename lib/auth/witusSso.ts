import type { Db, Document, WithId } from 'mongodb';

/**
 * Turning a WitUS SSO identity into a local FlashLearn account.
 *
 * There is no NextAuth adapter here and the session strategy is JWT, so nothing
 * in the framework writes a user row or hands one back. Whatever `profile()`
 * returns as `id` becomes `token.id` and then `session.user.id` verbatim. If
 * that is the IdP's subject identifier, the session looks signed in but points
 * at an account that does not exist: every query keyed on `session.user.id`
 * matches nothing and `new ObjectId(token.id)` in the JWT refresh throws. So
 * the local row has to be resolved here, before the token is minted.
 */

/** The claims FlashLearn reads off the WitUS id token. */
export interface WitusClaims {
  sub: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
}

export type WitusRefusalReason =
  | 'email_missing'
  | 'email_unverified'
  | 'managed_account'
  | 'suspended'
  | 'resolution_failed';

/** The shape `profile()` needs, all of it read from the local row. */
export interface WitusLocalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  subscriptionTier: string;
  emailVerified: boolean;
  image: string | null;
}

export type WitusResolution =
  | { ok: true; user: WitusLocalUser; created: boolean }
  | { ok: false; reason: WitusRefusalReason };

/**
 * A refused sign-in still has to return an object with a non-empty `id`:
 * NextAuth throws away a profile with a falsy one and bounces the browser back
 * to the sign-in page with nothing on it, which is the symptom being fixed
 * rather than a refusal anybody can act on. The reason travels in `id` instead
 * so the `signIn` callback can refuse loudly and log which rule fired.
 */
const REFUSAL_ID_PREFIX = 'witus-refused:';

/**
 * The control that keeps a sentinel out of a session is this positive test,
 * not the prefix: a WitUS sign-in proceeds only when `id` is a MongoDB `_id`.
 * Anything else, sentinel or not, is refused.
 */
const LOCAL_USER_ID = /^[0-9a-f]{24}$/;

export function refusalUserId(reason: WitusRefusalReason): string {
  return `${REFUSAL_ID_PREFIX}${reason}`;
}

export function readRefusalReason(id: string | null | undefined): WitusRefusalReason | null {
  if (typeof id !== 'string' || !id.startsWith(REFUSAL_ID_PREFIX)) return null;
  return id.slice(REFUSAL_ID_PREFIX.length) as WitusRefusalReason;
}

export function isLocalUserId(id: string | null | undefined): boolean {
  return typeof id === 'string' && LOCAL_USER_ID.test(id);
}

/** Mongo's duplicate-key error, whatever driver wrapper it arrives in. */
function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: number }).code === 11000);
}

/**
 * `/api/register` writes through the raw driver, which skips the Mongoose
 * schema's `lowercase: true`, so the collection holds addresses in whatever
 * case the person typed at signup. Both forms of the claim go in one `$in` so
 * the lookup stays on the unique index.
 */
function emailCandidates(email: string): string[] {
  const trimmed = email.trim();
  const lowered = trimmed.toLowerCase();
  return trimmed === lowered ? [lowered] : [trimmed, lowered];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The indexed lookup first, then a case-insensitive sweep only if it misses.
 *
 * The sweep exists because the two casings that matter are not symmetrical: an
 * IdP that sends `Nadia@Example.com` is covered by the candidate list, but one
 * that sends `nadia@example.com` against a row registered as
 * `Nadia@Example.com` is not, and that is the direction real signup data runs
 * in. A case-insensitive match cannot use the index, so it is worth a scan only
 * to avoid handing somebody a second, empty account. It runs at most once per
 * SSO sign-in and never at all once the row is found.
 */
async function findLocalUserByEmail(
  users: ReturnType<Db['collection']>,
  rawEmail: string,
): Promise<WithId<Document> | null> {
  const exact = await users.findOne({ email: { $in: emailCandidates(rawEmail) } });
  if (exact) return exact;

  return users.findOne({
    email: { $regex: `^${escapeRegex(rawEmail.trim())}$`, $options: 'i' },
  });
}

/** The model requires a name and some IdP accounts carry none. */
function displayNameFrom(claims: WitusClaims, email: string): string {
  const claimed = claims.name?.trim();
  if (claimed) return claimed;
  const localPart = email.split('@')[0];
  return localPart || 'WitUS member';
}

function toLocalUser(doc: WithId<Document>): WitusLocalUser {
  return {
    id: doc._id.toString(),
    name: typeof doc.name === 'string' ? doc.name : '',
    // The stored role, never a default. Signing in through SSO must not demote
    // a Teacher to Student, which is what hardcoding the role here used to do
    // on every single sign-in.
    role: typeof doc.role === 'string' ? doc.role : 'Student',
    email: typeof doc.email === 'string' ? doc.email : '',
    subscriptionTier: typeof doc.subscriptionTier === 'string' ? doc.subscriptionTier : 'Free',
    emailVerified: true,
    image: typeof doc.profilePicture === 'string' ? doc.profilePicture : null,
  };
}

/**
 * Mirrors the row `/api/register` inserts, minus the parts SSO has no use for.
 *
 * No `password` key at all rather than an empty one, so the credentials
 * provider's `!userDoc.password` guard keeps refusing this account until its
 * owner sets one. No verification token either: the IdP already proved control
 * of the address, which is the same proof the emailed token would have carried.
 *
 * `ageAttested` stays false. Registration sets it because the person ticked the
 * box on the form; nobody ticked anything here, and no flow in the app gates on
 * it, so claiming the attestation would be recording something that never
 * happened.
 */
function buildNewSsoUser(email: string, name: string, now: Date): Document {
  return {
    name,
    email,
    role: 'Student',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    profiles: [],
    subscriptionTier: 'Free',
    ageAttested: false,
    signupSource: 'witus-sso',
  };
}

/**
 * Find or create the local account behind a WitUS identity.
 *
 * The match is by email, which is only safe because an unverified address is
 * refused outright a few lines below. Matching on an address the IdP has not
 * proved would mean anyone who can register `someone@school.edu` over there
 * inherits that person's FlashLearn account, and this app carries real student
 * accounts.
 */
export async function resolveWitusUser(db: Db, claims: WitusClaims): Promise<WitusResolution> {
  const rawEmail = claims.email?.trim();
  if (!rawEmail) return { ok: false, reason: 'email_missing' };

  // Absent is treated the same as false. An IdP that stops asserting the claim
  // must fail closed rather than quietly turn linking back on.
  if (claims.email_verified !== true) return { ok: false, reason: 'email_unverified' };

  const users = db.collection('users');

  let doc = await findLocalUserByEmail(users, rawEmail);
  let created = false;

  if (!doc) {
    const now = new Date();
    const email = rawEmail.toLowerCase();
    const fresh = buildNewSsoUser(email, displayNameFrom(claims, email), now);
    try {
      const inserted = await users.insertOne(fresh);
      doc = { ...fresh, _id: inserted.insertedId } as WithId<Document>;
      created = true;
    } catch (error) {
      // Two tabs, two sign-ins, one unique index. The loser reads the row the
      // winner wrote rather than failing a sign-in that should have worked.
      if (!isDuplicateKeyError(error)) throw error;
      doc = await findLocalUserByEmail(users, rawEmail);
      if (!doc) return { ok: false, reason: 'resolution_failed' };
    }
  }

  // These run against whatever row we ended up holding, including one that
  // arrived through the duplicate-key path, so a guarded account cannot slip
  // through by racing the create.
  //
  // A managed classroom account is refused here for the same reason both
  // credentials providers refuse it: it belongs to a student who has not
  // claimed it, and nobody may sign into it. Its address is in the `.invalid`
  // TLD so no IdP could ever verify it, but that is a property of how the
  // address is minted, not a rule anyone wrote down, and it stops being true
  // the day someone changes how managed addresses are built.
  if (doc.isManaged === true) return { ok: false, reason: 'managed_account' };

  // Matches the credentials providers, which both refuse a suspended account.
  if (doc.suspended === true) return { ok: false, reason: 'suspended' };

  // `deletedAt` is deliberately not checked. Neither credentials provider
  // checks it either: signing in during the grace period is what cancels a
  // pending deletion, and the `signIn` callback does the cancelling.

  if (!created && doc.emailVerified !== true) {
    // The IdP proved control of the address, so the local flag catches up. This
    // is the same trade the email-code provider makes when a valid code lands.
    await users.updateOne(
      { _id: doc._id },
      {
        $set: { emailVerified: true, updatedAt: new Date() },
        $unset: { verificationToken: '', verificationTokenExpires: '' },
      },
    );
  }

  if (created) {
    // Registration closes out a pending invitation; an SSO signup that skipped
    // the form would otherwise leave the teacher's invite reading "sent"
    // forever.
    await db.collection('invitations').updateOne(
      { email: doc.email, status: 'sent' },
      { $set: { status: 'accepted', acceptedAt: new Date(), acceptedUserId: doc._id } },
    );
  }

  return { ok: true, created, user: toLocalUser(doc) };
}
