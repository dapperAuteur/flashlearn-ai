import { Types } from 'mongoose';
import { Classroom } from '@/models/Classroom';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';

/**
 * Work out whose learning a study session belongs to.
 *
 * Until now "who is signed in" and "whose learning this is" were the same value,
 * read straight off the session in each write site. A teacher proctoring a
 * student breaks that assumption: the teacher makes the request, the student
 * owns the result. This resolves the two separately.
 *
 *   actor   the authenticated user making the request
 *   subject the learner the results belong to
 *
 * Every write path must call this instead of reading the session directly. The
 * subject is never taken from the request body on trust: naming a student is a
 * request, and this decides whether it is allowed.
 *
 * Getting this wrong is worse than an ordinary bug. Writing a session to the
 * wrong profile corrupts that person's spaced-repetition schedule, and SM-2
 * error compounds over weeks of reviews before anyone notices.
 */

export interface StudySubject {
  /**
   * The learner's user id, or null for a managed learner who has a profile but
   * no account. Nothing produces null yet; the field exists so the write sites
   * do not need touching again when managed learners land.
   */
  userId: Types.ObjectId | null;
  /** Whose StudyAnalytics row the SM-2 schedule is written to. */
  profileId: Types.ObjectId;
  /** The adult who ran the session, or null for ordinary self-study. */
  proctorId: Types.ObjectId | null;
  isProctored: boolean;
}

export type ResolveSubjectResult =
  | { ok: true; subject: StudySubject }
  | { ok: false; status: number; error: string };

/**
 * Roles that may run a session on someone else's behalf. A Student cannot
 * proctor, even for a classmate they share a classroom with.
 */
const PROCTOR_ROLES = ['Teacher', 'Tutor', 'Parent', 'SchoolAdmin', 'Admin'];

/**
 * The profile every learner-scoped write keys on. Mirrors the self-healing the
 * app already does when someone saves a set before a profile exists
 * (app/api/flashcards/route.ts), so a student who has never studied can still
 * be proctored.
 */
async function resolveProfileId(userId: Types.ObjectId): Promise<Types.ObjectId> {
  const user = await User.findById(userId)
    .select('profiles')
    .lean<{ profiles?: Types.ObjectId[] } | null>();

  if (user?.profiles?.length) return user.profiles[0];

  const profile = await Profile.create({ user: userId, profileName: 'My Profile' });
  await User.findByIdAndUpdate(userId, { $push: { profiles: profile._id } });

  return profile._id;
}

/**
 * Is this actor allowed to record results for this subject?
 *
 * Two edges today, checked in the order they are cheapest:
 *
 *   1. They share a classroom the actor teaches. `Classroom.teacherId` plus
 *      `Classroom.students[]` already exist, so nothing new has to be managed.
 *      Archived classrooms do not count: a classroom is archived when its
 *      teacher's account is deleted, so the relationship it recorded is gone.
 *   2. `User.linkedStudentIds` on the actor. The field has been on the schema
 *      unused since it was added; this is the tutor and guardian edge it was
 *      meant for. Nothing in the app writes it yet, so in practice it only
 *      matches where an admin has set it directly.
 */
async function isAuthorizedProctor(
  actorUserId: Types.ObjectId,
  subjectUserId: Types.ObjectId,
): Promise<boolean> {
  const sharedClassroom = await Classroom.exists({
    teacherId: actorUserId,
    students: subjectUserId,
    isArchived: { $ne: true },
  });
  if (sharedClassroom) return true;

  const linked = await User.exists({
    _id: actorUserId,
    linkedStudentIds: subjectUserId,
  });

  return Boolean(linked);
}

export async function resolveStudySubject(
  actorUserId: string | Types.ObjectId,
  requestedSubjectId?: string | null,
): Promise<ResolveSubjectResult> {
  if (!Types.ObjectId.isValid(actorUserId)) {
    return { ok: false, status: 401, error: 'Not signed in.' };
  }
  const actorId = new Types.ObjectId(actorUserId);

  // Self-study, which is every existing caller. Naming yourself is the same
  // thing as naming nobody, so it takes the same path rather than a
  // pointless authorization check against yourself.
  const wantsSelf =
    !requestedSubjectId || String(requestedSubjectId) === String(actorId);

  if (wantsSelf) {
    return {
      ok: true,
      subject: {
        userId: actorId,
        profileId: await resolveProfileId(actorId),
        proctorId: null,
        isProctored: false,
      },
    };
  }

  if (!Types.ObjectId.isValid(requestedSubjectId)) {
    return { ok: false, status: 400, error: 'That student id is not valid.' };
  }
  const subjectId = new Types.ObjectId(requestedSubjectId);

  const actor = await User.findById(actorId)
    .select('role')
    .lean<{ role?: string } | null>();

  if (!actor) {
    return { ok: false, status: 401, error: 'Not signed in.' };
  }
  if (!actor.role || !PROCTOR_ROLES.includes(actor.role)) {
    return {
      ok: false,
      status: 403,
      error: 'Your account cannot record study results for another person.',
    };
  }

  const subject = await User.findById(subjectId)
    .select('deletedAt')
    .lean<{ deletedAt?: Date | null } | null>();

  if (!subject) {
    return { ok: false, status: 404, error: 'That student was not found.' };
  }
  // An account inside its deletion grace period is on its way out. Writing new
  // review history to it would be erased in days, and would look to the student
  // like their deletion did not take.
  if (subject.deletedAt) {
    return { ok: false, status: 409, error: 'That account is scheduled for deletion.' };
  }

  if (!(await isAuthorizedProctor(actorId, subjectId))) {
    return {
      ok: false,
      status: 403,
      error: 'You can only record results for a student in one of your classrooms.',
    };
  }

  return {
    ok: true,
    subject: {
      userId: subjectId,
      profileId: await resolveProfileId(subjectId),
      proctorId: actorId,
      isProctored: true,
    },
  };
}
