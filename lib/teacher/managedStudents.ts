import { createHash, randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { Classroom } from '@/models/Classroom';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';

/**
 * Teacher-managed student accounts.
 *
 * A managed student is a real `User` row with no password, created by a teacher
 * for a student who has no email address of their own. The row is real because
 * `StudySession.userId` is required and every learner-facing query filters on
 * it; a learner without one would need history, stats, the dashboard,
 * achievements, and due cards all reworked, and one missed query is a silent
 * attribution bug.
 *
 * The cost of a real row is that `User.email` is required and unique, so the
 * account gets a synthetic address. See MANAGED_EMAIL_DOMAIN below.
 */

/**
 * RFC 2606 reserves `.invalid` so that it can never be delegated and never
 * resolve. A managed address cannot receive mail by construction rather than by
 * a delivery attempt failing.
 */
export const MANAGED_EMAIL_DOMAIN = 'students.invalid';

/** How long a freshly minted claim code stays usable. */
export const CLAIM_CODE_TTL_DAYS = 90;

/**
 * No I, O, 0, or 1. A teacher reads this code aloud or writes it on a card, and
 * those four are the pairs that get misread. 32 characters divides 256 exactly,
 * so picking with a byte modulo stays uniform.
 */
const CLAIM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CLAIM_CODE_LENGTH = 10;

/**
 * The address for a managed account, derived from the id the account is about
 * to be created with. Uniqueness comes from the ObjectId itself rather than
 * from random bytes plus a collision check, so there is no window in which two
 * concurrent creations can pick the same address.
 */
export function buildManagedEmail(userId: Types.ObjectId): string {
  return `managed-${userId.toHexString()}@${MANAGED_EMAIL_DOMAIN}`;
}

export function isManagedEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.toLowerCase().endsWith(`@${MANAGED_EMAIL_DOMAIN}`);
}

/**
 * A claim code the teacher reads off the roster and hands to the student.
 * Ten characters of a 32-symbol alphabet is 50 bits, which is far past guessing
 * range for a rate-limited endpoint, and the hyphen is there to be read rather
 * than to be typed: `normalizeClaimCode` strips it.
 */
export function generateClaimCode(): string {
  const bytes = randomBytes(CLAIM_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CLAIM_CODE_LENGTH; i += 1) {
    code += CLAIM_ALPHABET[bytes[i] % CLAIM_ALPHABET.length];
  }
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/** Accepts the code however the student types it: case, spaces, hyphens. */
export function normalizeClaimCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Unsalted SHA-256, matching how the email-code sign-in path stores its codes.
 * A salted hash would be better for a value a person chose, but this value is
 * 50 random bits, so a rainbow table is not a threat and a deterministic hash
 * is what lets the claim endpoint look the account up by code.
 */
export function hashClaimCode(code: string): string {
  return createHash('sha256').update(normalizeClaimCode(code)).digest('hex');
}

export function claimCodeExpiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + CLAIM_CODE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export interface MintedClaimCode {
  claimCode: string;
  claimCodeHash: string;
  claimCodeExpires: Date;
}

export function mintClaimCode(now: Date = new Date()): MintedClaimCode {
  const claimCode = generateClaimCode();
  return {
    claimCode,
    claimCodeHash: hashClaimCode(claimCode),
    claimCodeExpires: claimCodeExpiryFrom(now),
  };
}

export interface CreatedManagedStudent {
  userId: Types.ObjectId;
  profileId: Types.ObjectId;
  name: string;
  email: string;
  claimCode: string;
  claimCodeExpires: Date;
}

/** Mongo's duplicate-key error, whatever driver wrapper it arrives in. */
function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: number }).code === 11000);
}

/**
 * Create a managed student and enrol them in the classroom, in that order.
 *
 * These are two writes, not one transaction: the deployment target is a single
 * Mongo node in development and the test suite runs against an in-memory
 * standalone, neither of which supports multi-document transactions. So the
 * enrolment failing rolls the account back by hand. A student who exists but is
 * not on the roster is the worse outcome of the two, because it shows up as an
 * empty picker with no way for the teacher to work out why.
 *
 * The profile is created here rather than left to `resolveProfileId`, which
 * would create one on the first proctored session. Both produce the same shape;
 * doing it here means the roster can show a profile id straight away and the
 * first session does no extra write.
 */
export async function createManagedStudent(params: {
  name: string;
  teacherId: Types.ObjectId;
  classroomId: Types.ObjectId;
}): Promise<CreatedManagedStudent> {
  const { name, teacherId, classroomId } = params;

  const userId = new Types.ObjectId();
  const email = buildManagedEmail(userId);
  const { claimCode, claimCodeHash, claimCodeExpires } = mintClaimCode();

  // No `password` key at all, not an empty one. There is nothing for bcrypt to
  // compare against and nothing for a teacher to hand over.
  await User.create({
    _id: userId,
    name,
    email,
    role: 'Student',
    isManaged: true,
    managedBy: teacherId,
    claimCodeHash,
    claimCodeExpires,
    emailVerified: false,
    // The address cannot receive mail, so opt the account out of reminders and
    // campaigns at the source instead of letting every send fail against it.
    emailUnsubscribed: true,
    ageAttested: false,
    onboardingCompleted: false,
    profiles: [],
  });

  let profileId: Types.ObjectId;
  try {
    const profile = await Profile.create({ user: userId, profileName: 'My Profile' });
    profileId = profile._id as Types.ObjectId;
    await User.updateOne({ _id: userId }, { $push: { profiles: profileId } });

    const enrolled = await Classroom.updateOne(
      { _id: classroomId },
      { $addToSet: { students: userId } },
    );
    if (enrolled.matchedCount === 0) {
      throw new Error('Classroom disappeared before the student could be enrolled.');
    }
  } catch (error) {
    await Promise.allSettled([
      Profile.deleteMany({ user: userId }),
      User.deleteOne({ _id: userId }),
    ]);
    throw error;
  }

  return { userId, profileId, name, email, claimCode, claimCodeExpires };
}

export { isDuplicateKeyError };
