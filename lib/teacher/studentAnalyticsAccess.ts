import { Types } from 'mongoose';
import { resolveStudySubject } from '@/lib/study/resolveStudySubject';
import { User } from '@/models/User';

/**
 * Who may look at a learner's numbers.
 *
 * The rule is one sentence: whoever may proctor a student may read that
 * student's analytics, and nobody else. So the decision is not made here. It is
 * made by `lib/study/resolveStudySubject.ts`, the same module the study write
 * path calls, and this file only turns that answer into the shape a read needs.
 * The classroom query and the linkedStudentIds query are deliberately not
 * repeated here: two copies of an authorization rule drift, and the first sign
 * of the drift is a teacher who can see a student they cannot study with, or
 * the reverse.
 *
 * A note on side effects, because this is a GET.
 *
 * `resolveStudySubject` creates the learner's profile when they do not have one
 * yet. That self-healing is right for a write and questionable for a read, and
 * it is left in place here for three reasons:
 *
 *   - It runs only after authorization passes, so a GET cannot be used to
 *     create rows on an account the caller could not already write to.
 *   - Every managed student is created with a profile, and any learner who has
 *     saved a set or studied once already has one, so nothing is written for
 *     any learner who has numbers to show.
 *   - The row it would create is the same empty profile that learner's first
 *     study session creates a moment later.
 *
 * Making the read completely inert wants a read-only sibling inside
 * `resolveStudySubject.ts`, next to the queries it shares. That is the right
 * home for it, and it is the follow-up rather than a second copy of the rule in
 * this file.
 */

export interface StudentReadSubject {
  userId: Types.ObjectId;
  /** Every profile the learner owns. Their own analytics page reads them all. */
  profileIds: Types.ObjectId[];
  name: string;
  isManaged: boolean;
  /** True when someone asked for their own numbers rather than a student's. */
  isSelf: boolean;
}

export type StudentReadAccess =
  | { ok: true; student: StudentReadSubject }
  | { ok: false; status: number; error: string };

/**
 * Read wording for the resolver's refusals. The status code is the resolver's,
 * passed through untouched. Only the sentence changes, because "record results
 * for" is the wrong verb on a page that shows numbers.
 */
const READ_REFUSALS: Record<number, string> = {
  400: 'That student id is not valid.',
  401: 'Not signed in.',
  403: 'You can only see progress for a student you teach or are linked to.',
  404: 'That student was not found.',
  409: 'That account is scheduled for deletion.',
};

export async function authorizeStudentAnalyticsRead(
  actorUserId: string,
  studentId: string,
): Promise<StudentReadAccess> {
  const resolved = await resolveStudySubject(actorUserId, studentId);

  if (!resolved.ok) {
    return {
      ok: false,
      status: resolved.status,
      error: READ_REFUSALS[resolved.status] ?? resolved.error,
    };
  }

  const subjectUserId = resolved.subject.userId;
  if (!subjectUserId) {
    // A learner with a profile and no account cannot exist yet. When they can,
    // their analytics are keyed on the profile and this branch grows a body.
    return { ok: false, status: 404, error: 'That student was not found.' };
  }

  const student = await User.findById(subjectUserId)
    .select('name username isManaged profiles')
    .lean<{
      name?: string;
      username?: string;
      isManaged?: boolean;
      profiles?: Types.ObjectId[];
    } | null>();

  if (!student) {
    return { ok: false, status: 404, error: 'That student was not found.' };
  }

  // The resolver's profile is the one every study write keys on, so it leads.
  // Any others on the account come along because the learner's own analytics
  // page reads all of them, and a teacher must never see a smaller number than
  // the student sees for the same thing.
  const profileIds = [resolved.subject.profileId, ...(student.profiles ?? [])].filter(
    (id, index, all) => all.findIndex((other) => String(other) === String(id)) === index,
  );

  return {
    ok: true,
    student: {
      userId: subjectUserId,
      profileIds,
      // A managed account's address is synthetic and unusable, so it is never a
      // fallback for a missing name.
      name: student.name || student.username || 'Unnamed student',
      isManaged: student.isManaged === true,
      isSelf: !resolved.subject.isProctored,
    },
  };
}
