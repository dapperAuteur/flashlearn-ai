import { NextResponse } from 'next/server';

/**
 * Archived containers are frozen, not hidden. Members keep every read they had:
 * they can open the container, list its shared sets, and study them. Every write
 * is refused with 409 Conflict, which says "the thing you are writing to is in a
 * state that will not accept this" rather than 403, which would send a member
 * chasing a permission problem they do not have.
 *
 * Deleting and leaving are deliberately NOT routed through this helper. Freezing
 * a container must never trap a member inside it or stop an admin cleaning it up.
 */

export type ContainerKind = 'classroom' | 'team' | 'school';

export const ARCHIVED_STATUS = 409;

export const ARCHIVED_MESSAGES: Record<ContainerKind, string> = {
  classroom:
    "This classroom is archived because its teacher's account was deleted. It cannot be changed until an admin reassigns it.",
  team:
    "This study group is archived because its owner's account was deleted. It cannot be changed until an admin reassigns it.",
  school:
    "This school is archived because its administrator's account was deleted. It cannot be changed until an admin reassigns it.",
};

/** Narrow shape shared by Classroom, Team, and School documents and lean objects. */
export interface ArchivableContainer {
  isArchived?: boolean | null;
}

export function isArchivedContainer(
  container: ArchivableContainer | null | undefined,
): boolean {
  return container?.isArchived === true;
}

/**
 * Returns a ready-to-return 409 response when the container is archived, or
 * null when the write may proceed. Call it right after the ownership or
 * membership check so an archived container still answers "not found" and
 * "access denied" before it answers "archived".
 *
 *   const archived = assertNotArchived(team, 'team');
 *   if (archived) return archived;
 */
export function assertNotArchived(
  container: ArchivableContainer | null | undefined,
  kind: ContainerKind,
): NextResponse | null {
  if (!isArchivedContainer(container)) return null;
  return NextResponse.json({ error: ARCHIVED_MESSAGES[kind] }, { status: ARCHIVED_STATUS });
}
