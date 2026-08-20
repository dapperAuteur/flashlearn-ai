import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import { Types } from 'mongoose';
import { z } from 'zod';
import dbConnect from '@/lib/db/dbConnect';
import { getClientIp } from '@/lib/utils/utils';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email/mailgun';
import { hashClaimCode } from '@/lib/teacher/managedStudents';
import { User } from '@/models/User';
import { StudySession } from '@/models/StudySession';
import { Logger, LogContext } from '@/lib/logging/logger';

/**
 * POST /api/teacher/students/claim
 *
 * A managed student turns their classroom account into their own by adding an
 * email address and a password. The user id never changes, so every study
 * session, every card result, and the whole SM-2 review schedule already
 * recorded stays attached to them. That is the property the managed-account
 * design rests on: the work belongs to the student, not to the teacher.
 *
 * The route sits under /api/teacher because it belongs to the teacher-managed
 * students feature. The caller is the student, and this is the only route in
 * the feature that takes no session: someone who has never signed in cannot
 * present one. The claim code is the whole credential, which is why it is 50
 * bits, single use, expiring, and rate limited by IP.
 *
 * A teacher cannot set a student's password, here or anywhere. A teacher who
 * could set one could sign in as the student, and the audit value of a
 * proctored session comes from the two being distinguishable.
 */

const claimSchema = z.object({
  claimCode: z
    .string()
    .trim()
    .min(5, { message: 'Enter the claim code your teacher gave you.' })
    .max(40, { message: 'That claim code is too long.' }),
  email: z.string().trim().email({ message: 'Enter a valid email address.' }),
  password: z
    .string()
    .min(10, { message: 'Password must be at least 10 characters' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' })
    .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' }),
  ageAttested: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm you are 13 or older to claim this account.' }),
  }),
});

/** Same wording whether the code is wrong, spent, or never existed. */
const UNKNOWN_CODE = 'That claim code is not valid or has already been used.';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request) ?? '127.0.0.1';

  // A claim code is guessable in principle, so the endpoint is metered. Ten
  // tries per ten minutes per address leaves an honest student who mistypes
  // plenty of room and leaves an attacker with nothing.
  const limiter = getRateLimiter('claim-managed-account', 10, 600);
  const { success, reset } = await limiter.limit(ip);
  if (!success) {
    await Logger.warning(LogContext.AUTH, 'Rate limit exceeded for account claim.', { ip });
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(reset) } },
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Send a JSON body.' }, { status: 400 });
    }

    const parsed = claimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();

    await dbConnect();

    const claimCodeHash = hashClaimCode(parsed.data.claimCode);
    const student = await User.findOne({ claimCodeHash, isManaged: true })
      .select('name claimCodeExpires deletedAt')
      .lean<{
        _id: Types.ObjectId;
        name?: string;
        claimCodeExpires?: Date;
        deletedAt?: Date | null;
      } | null>();

    if (!student) {
      await Logger.warning(LogContext.AUTH, 'Account claim failed: unknown code.', { ip });
      return NextResponse.json({ error: UNKNOWN_CODE }, { status: 400 });
    }

    if (student.claimCodeExpires && student.claimCodeExpires.getTime() <= Date.now()) {
      // A separate status and message from the unknown-code case. Telling a
      // student to ask their teacher for a fresh code is the only useful thing
      // to say, and the code was 50 random bits, so confirming that this
      // particular one once existed gives an attacker nothing they can use.
      return NextResponse.json(
        { error: 'That claim code has expired. Ask your teacher for a new one.' },
        { status: 410 },
      );
    }

    if (student.deletedAt) {
      return NextResponse.json(
        { error: 'That account is scheduled for deletion and cannot be claimed.' },
        { status: 409 },
      );
    }

    const emailTaken = await User.exists({ email, _id: { $ne: student._id } });
    if (emailTaken) {
      return NextResponse.json(
        { error: 'An account with that email address already exists.' },
        { status: 409 },
      );
    }

    const hashedPassword = await hash(parsed.data.password, 12);
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Written through the driver rather than the model because
    // `verificationToken` and `verificationTokenExpires` are not on the User
    // schema; /api/register writes the same two fields the same way, and
    // mongoose in strict mode would silently drop them.
    //
    // `isManaged: true` stays in the filter so that two claims racing on one
    // code leave exactly one winner.
    const result = await User.collection.updateOne(
      { _id: student._id, isManaged: true },
      {
        $set: {
          email,
          password: hashedPassword,
          emailVerified: false,
          // The address is now the student's own and reachable, so the account
          // rejoins ordinary email handling on the same footing as a signup.
          emailUnsubscribed: false,
          ageAttested: true,
          ageAttestedAt: new Date(),
          verificationToken,
          verificationTokenExpires,
          updatedAt: new Date(),
        },
        $unset: {
          isManaged: '',
          managedBy: '',
          claimCodeHash: '',
          claimCodeExpires: '',
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: UNKNOWN_CODE }, { status: 400 });
    }

    // Nothing here moves data between accounts. The count is read back only so
    // the student can be told, in the response, that their work came with them.
    const studySessions = await StudySession.countDocuments({ userId: student._id });

    let emailVerificationSent = true;
    try {
      await sendVerificationEmail(email, student.name ?? 'there', verificationToken);
    } catch (error) {
      // The account is already theirs. A mail failure must not undo that, so it
      // is reported rather than thrown, and they can ask for a new link.
      emailVerificationSent = false;
      await Logger.error(LogContext.AUTH, 'Claim succeeded but verification email failed.', {
        error,
        userId: String(student._id),
      });
    }

    await Logger.info(LogContext.AUTH, 'Managed account claimed by its student.', {
      userId: String(student._id),
      metadata: { studySessions },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: String(student._id),
        name: student.name ?? 'Unnamed student',
        email,
      },
      // Signing in with a password requires a verified address, so the student
      // has one more step before they can log in.
      requiresEmailVerification: true,
      emailVerificationSent,
      preserved: { studySessions },
    });
  } catch (error) {
    await Logger.error(LogContext.AUTH, 'Failed to claim a managed account.', { error });
    return NextResponse.json({ error: 'Could not claim that account.' }, { status: 500 });
  }
}
