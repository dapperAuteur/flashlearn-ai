/**
 * GET /api/admin/archived-containers
 *
 * Every archived classroom, study group, and school in one list, with the
 * context an admin needs to decide which ones are worth handing to a new owner:
 * how many people are still inside, when the container last changed, and who
 * used to own it.
 *
 * The former owner usually cannot be resolved. Account deletion removes the
 * User row and leaves the owner reference behind on purpose, so the lookup
 * returning nothing is the normal outcome, not a failure. Those rows come back
 * with `formerOwner: null` and the raw id, and the screen says the account was
 * deleted.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { Classroom } from '@/models/Classroom';
import { Team } from '@/models/Team';
import { School } from '@/models/School';
import { User } from '@/models/User';
import { Logger, LogContext } from '@/lib/logging/logger';
import type { ContainerKind } from '@/lib/api/assertNotArchived';
import { ELIGIBLE_OWNER_ROLES, rejectOwnerReason } from './containerKinds';

const secret = process.env.NEXTAUTH_SECRET;

interface LeanOwner {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  role?: string;
  deletedAt?: Date | null;
  suspended?: boolean | null;
}

interface LeanClassroom {
  _id: Types.ObjectId;
  name?: string;
  teacherId?: Types.ObjectId | null;
  students?: Types.ObjectId[];
  joinCode?: string;
  updatedAt?: Date;
}

interface LeanTeamMember {
  userId?: Types.ObjectId | null;
}

interface LeanTeam {
  _id: Types.ObjectId;
  name?: string;
  creatorId?: Types.ObjectId | null;
  members?: LeanTeamMember[];
  joinCode?: string;
  updatedAt?: Date;
}

interface LeanSchool {
  _id: Types.ObjectId;
  name?: string;
  adminId?: Types.ObjectId | null;
  teachers?: Types.ObjectId[];
  students?: Types.ObjectId[];
  schoolCode?: string;
  updatedAt?: Date;
}

export interface FormerOwnerSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Inside the 30-day deletion grace period. */
  pendingDeletion: boolean;
  suspended: boolean;
  /** True when this same account could take the container back as-is. */
  canReclaim: boolean;
}

export interface ArchivedContainerRow {
  id: string;
  kind: ContainerKind;
  name: string;
  /** People still inside. Students for a classroom, members for a study group,
   *  teachers plus students for a school. */
  memberCount: number;
  teacherCount?: number;
  studentCount?: number;
  code: string | null;
  /** No model records an archive timestamp. Nothing can write to a frozen
   *  container, so the last write is the closest honest signal we have. */
  lastChangedAt: string | null;
  formerOwnerId: string | null;
  formerOwner: FormerOwnerSummary | null;
}

function summarizeOwner(
  owner: LeanOwner | undefined,
  kind: ContainerKind,
): FormerOwnerSummary | null {
  if (!owner) return null;
  return {
    id: String(owner._id),
    name: owner.name || '',
    email: owner.email || '',
    role: owner.role || '',
    pendingDeletion: Boolean(owner.deletedAt),
    suspended: Boolean(owner.suspended),
    canReclaim: rejectOwnerReason(owner, kind) === null,
  };
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();

    const [classrooms, teams, schools] = await Promise.all([
      Classroom.find({ isArchived: true })
        .select('name teacherId students joinCode updatedAt')
        .lean<LeanClassroom[]>(),
      Team.find({ isArchived: true })
        .select('name creatorId members joinCode updatedAt')
        .lean<LeanTeam[]>(),
      School.find({ isArchived: true })
        .select('name adminId teachers students schoolCode updatedAt')
        .lean<LeanSchool[]>(),
    ]);

    const ownerIds = new Set<string>();
    for (const c of classrooms) if (c.teacherId) ownerIds.add(String(c.teacherId));
    for (const t of teams) if (t.creatorId) ownerIds.add(String(t.creatorId));
    for (const s of schools) if (s.adminId) ownerIds.add(String(s.adminId));

    // Most of these ids belong to accounts that no longer exist, so this find
    // routinely returns fewer rows than it was asked for.
    const owners = ownerIds.size
      ? await User.find({ _id: { $in: [...ownerIds] } })
          .select('name email role deletedAt suspended')
          .lean<LeanOwner[]>()
      : [];
    const ownerById = new Map(owners.map((o) => [String(o._id), o]));

    const containers: ArchivedContainerRow[] = [
      ...classrooms.map((c) => ({
        id: String(c._id),
        kind: 'classroom' as ContainerKind,
        name: c.name || 'Untitled classroom',
        memberCount: c.students?.length ?? 0,
        code: c.joinCode || null,
        lastChangedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : null,
        formerOwnerId: c.teacherId ? String(c.teacherId) : null,
        formerOwner: summarizeOwner(
          c.teacherId ? ownerById.get(String(c.teacherId)) : undefined,
          'classroom',
        ),
      })),
      ...teams.map((t) => ({
        id: String(t._id),
        kind: 'team' as ContainerKind,
        name: t.name || 'Untitled study group',
        memberCount: t.members?.length ?? 0,
        code: t.joinCode || null,
        lastChangedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : null,
        formerOwnerId: t.creatorId ? String(t.creatorId) : null,
        formerOwner: summarizeOwner(
          t.creatorId ? ownerById.get(String(t.creatorId)) : undefined,
          'team',
        ),
      })),
      ...schools.map((s) => ({
        id: String(s._id),
        kind: 'school' as ContainerKind,
        name: s.name || 'Untitled school',
        memberCount: (s.teachers?.length ?? 0) + (s.students?.length ?? 0),
        teacherCount: s.teachers?.length ?? 0,
        studentCount: s.students?.length ?? 0,
        code: s.schoolCode || null,
        lastChangedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : null,
        formerOwnerId: s.adminId ? String(s.adminId) : null,
        formerOwner: summarizeOwner(
          s.adminId ? ownerById.get(String(s.adminId)) : undefined,
          'school',
        ),
      })),
    ].sort((a, b) => {
      const aTime = a.lastChangedAt ? Date.parse(a.lastChangedAt) : 0;
      const bTime = b.lastChangedAt ? Date.parse(b.lastChangedAt) : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      containers,
      counts: {
        classroom: classrooms.length,
        team: teams.length,
        school: schools.length,
        total: containers.length,
      },
      eligibleRoles: ELIGIBLE_OWNER_ROLES,
    });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error listing archived containers', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
