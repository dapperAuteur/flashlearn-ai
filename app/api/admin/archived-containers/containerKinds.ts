/**
 * Shared rules for the three containers an account deletion can freeze.
 *
 * When an owner deletes their account, `lib/api/purgeUserAccount.ts` sets
 * `isArchived` on the classrooms, teams, and schools they owned and leaves the
 * owner reference pointing at the account that is going away. That dangling
 * reference is the only breadcrumb an admin has, so the reassignment screen
 * reads it, resolves it if the User row still exists, and shows it either way.
 */
import type { ContainerKind } from '@/lib/api/assertNotArchived';

/** Every value the `role` enum on `models/User.ts` accepts. */
export type UserRole =
  | 'Student'
  | 'Teacher'
  | 'Tutor'
  | 'Parent'
  | 'SchoolAdmin'
  | 'Admin';

export const CONTAINER_KINDS = ['classroom', 'team', 'school'] as const;

export function isContainerKind(value: string): value is ContainerKind {
  return (CONTAINER_KINDS as readonly string[]).includes(value);
}

/** The field on each model that names the owner. */
export const OWNER_FIELD: Record<ContainerKind, 'teacherId' | 'creatorId' | 'adminId'> = {
  classroom: 'teacherId',
  team: 'creatorId',
  school: 'adminId',
};

/** What each kind is called in admin copy. `team` is a study group to users. */
export const KIND_LABEL: Record<ContainerKind, string> = {
  classroom: 'Classroom',
  team: 'Study group',
  school: 'School',
};

/**
 * Who may own each kind.
 *
 * A classroom's owner teaches it, so the account has to be one that teaches:
 * Teacher, Tutor, SchoolAdmin, or Admin. A school is run by its administrator,
 * so only SchoolAdmin or Admin. A study group is peer-owned and a student
 * starts most of them, so every role qualifies; the account still has to be
 * real, active, and not mid-deletion.
 */
export const ELIGIBLE_OWNER_ROLES: Record<ContainerKind, readonly UserRole[]> = {
  classroom: ['Teacher', 'Tutor', 'SchoolAdmin', 'Admin'],
  team: ['Student', 'Teacher', 'Tutor', 'Parent', 'SchoolAdmin', 'Admin'],
  school: ['SchoolAdmin', 'Admin'],
};

/** The candidate fields the eligibility check reads. */
export interface OwnerCandidate {
  role?: string | null;
  deletedAt?: Date | null;
  suspended?: boolean | null;
}

export type OwnerRejection =
  | 'missing'
  | 'pending-deletion'
  | 'suspended'
  | 'role';

/**
 * Returns null when the account may own this kind of container, or the reason
 * it may not. A soft-deleted account is refused because `deletedAt` marks the
 * 30-day grace period before the purge runs: handing it a classroom would
 * archive that classroom again as soon as the grace period expires.
 */
export function rejectOwnerReason(
  candidate: OwnerCandidate | null | undefined,
  kind: ContainerKind,
): OwnerRejection | null {
  if (!candidate) return 'missing';
  if (candidate.deletedAt) return 'pending-deletion';
  if (candidate.suspended) return 'suspended';
  if (!ELIGIBLE_OWNER_ROLES[kind].includes(candidate.role as UserRole)) return 'role';
  return null;
}

export function ownerRejectionMessage(reason: OwnerRejection, kind: ContainerKind): string {
  const label = KIND_LABEL[kind].toLowerCase();
  switch (reason) {
    case 'missing':
      return 'No account matches that id or email.';
    case 'pending-deletion':
      return `That account asked to be deleted and is inside its grace period. Giving it this ${label} would archive the ${label} again when the purge runs.`;
    case 'suspended':
      return `That account is suspended, so it cannot run a ${label}.`;
    case 'role':
      return `A ${label} needs an owner whose role is one of: ${ELIGIBLE_OWNER_ROLES[kind].join(', ')}.`;
  }
}
