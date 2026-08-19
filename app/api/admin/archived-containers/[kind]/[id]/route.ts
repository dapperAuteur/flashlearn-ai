/**
 * PATCH /api/admin/archived-containers/:kind/:id
 *
 * Hands a frozen classroom, study group, or school to a new owner and unfreezes
 * it. Body:
 *
 *   { "newOwnerId": "<user id>" }      reassign to that account
 *   { "newOwnerEmail": "a@b.com" }     same, found by email (id wins if both)
 *   { }                                unarchive without changing the owner
 *
 * The empty-body form only works when the owner already on the container is a
 * live account that may own that kind. It is the "archived by mistake" escape
 * hatch, not a way to unfreeze a container whose owner is gone.
 *
 * Nothing here requires the container to be archived first, so a retry after a
 * dropped response repeats the same write and returns the same 200 rather than
 * failing on a precondition. Member rosters are never removed from: the whole
 * reason account deletion archives instead of deleting is that the roster
 * belongs to other people.
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
import {
  isContainerKind,
  KIND_LABEL,
  OWNER_FIELD,
  ownerRejectionMessage,
  rejectOwnerReason,
} from '../../containerKinds';

const secret = process.env.NEXTAUTH_SECRET;

interface TeamMemberish {
  userId: Types.ObjectId;
  role: string;
  joinedAt: Date;
}

/** The union of fields this route reads or writes across the three models. */
interface ContainerDoc {
  _id: Types.ObjectId;
  name?: string;
  isArchived?: boolean;
  teacherId?: Types.ObjectId;
  creatorId?: Types.ObjectId;
  adminId?: Types.ObjectId;
  students?: Types.ObjectId[];
  teachers?: Types.ObjectId[];
  members?: TeamMemberish[];
  save(): Promise<unknown>;
}

interface OwnerDoc {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  role?: string;
  deletedAt?: Date | null;
  suspended?: boolean | null;
}

const OWNER_FIELDS = 'name email role deletedAt suspended';

async function loadContainer(kind: ContainerKind, id: string): Promise<ContainerDoc | null> {
  if (kind === 'classroom') return (await Classroom.findById(id)) as ContainerDoc | null;
  if (kind === 'team') return (await Team.findById(id)) as ContainerDoc | null;
  return (await School.findById(id)) as ContainerDoc | null;
}

function memberCountOf(kind: ContainerKind, container: ContainerDoc): number {
  if (kind === 'classroom') return container.students?.length ?? 0;
  if (kind === 'team') return container.members?.length ?? 0;
  return (container.teachers?.length ?? 0) + (container.students?.length ?? 0);
}

/**
 * A study group reads permissions off `members[].role`, so a creator who is not
 * a member with role `admin` owns a group they cannot run. Team creation adds
 * that row, and reassignment has to keep the same shape: add the new owner if
 * absent, promote them if they are already in the roster. Nobody is removed,
 * and the roster cap governs joins rather than ownership, so a full group still
 * gets its owner.
 *
 * A classroom is the opposite case. `students` is a student roster and its
 * teacher is authorized by `teacherId` alone, so adding the new teacher to
 * `students` would put them in their own class. A school is the same: its
 * administrator is authorized by `adminId` and belongs on neither the teacher
 * nor the student roster.
 */
function ensureTeamOwnerIsAdminMember(container: ContainerDoc, ownerId: Types.ObjectId) {
  if (!Array.isArray(container.members)) return;
  const existing = container.members.find(
    (m) => m?.userId && String(m.userId) === String(ownerId),
  );
  if (existing) {
    if (existing.role !== 'admin') existing.role = 'admin';
    return;
  }
  container.members.push({ userId: ownerId, role: 'admin', joinedAt: new Date() });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { kind, id } = await params;

    if (!isContainerKind(kind)) {
      return NextResponse.json(
        { error: 'Container kind must be classroom, team, or school' },
        { status: 400 },
      );
    }
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid container id' }, { status: 400 });
    }

    // An empty body is the unarchive-only form, so a missing or unparseable
    // body is not an error on its own.
    let body: { newOwnerId?: string; newOwnerEmail?: string } = {};
    try {
      body = (await request.json()) || {};
    } catch {
      body = {};
    }

    const newOwnerId = typeof body.newOwnerId === 'string' ? body.newOwnerId.trim() : '';
    const newOwnerEmail =
      typeof body.newOwnerEmail === 'string' ? body.newOwnerEmail.trim().toLowerCase() : '';

    await dbConnect();

    const container = await loadContainer(kind, id);
    if (!container) {
      return NextResponse.json(
        { error: `${KIND_LABEL[kind]} not found` },
        { status: 404 },
      );
    }

    const label = KIND_LABEL[kind].toLowerCase();
    let newOwner: OwnerDoc | null = null;

    if (newOwnerId || newOwnerEmail) {
      if (newOwnerId && !Types.ObjectId.isValid(newOwnerId)) {
        return NextResponse.json({ error: 'Invalid new owner id' }, { status: 400 });
      }
      newOwner = (newOwnerId
        ? await User.findById(newOwnerId).select(OWNER_FIELDS).lean()
        : await User.findOne({ email: newOwnerEmail }).select(OWNER_FIELDS).lean()) as
        | OwnerDoc
        | null;

      const rejection = rejectOwnerReason(newOwner, kind);
      if (rejection) {
        return NextResponse.json(
          { error: ownerRejectionMessage(rejection, kind) },
          { status: 400 },
        );
      }
    } else {
      // Unarchive-only. The owner still on the container has to be able to run
      // it, or unfreezing recreates the state that froze it.
      const currentOwnerId = container[OWNER_FIELD[kind]];
      const currentOwner = currentOwnerId
        ? ((await User.findById(currentOwnerId).select(OWNER_FIELDS).lean()) as OwnerDoc | null)
        : null;
      const rejection = rejectOwnerReason(currentOwner, kind);
      if (rejection) {
        return NextResponse.json(
          {
            error: `This ${label} cannot be unarchived as it stands. ${ownerRejectionMessage(
              rejection,
              kind,
            )} Name a new owner instead.`,
          },
          { status: 409 },
        );
      }
    }

    if (newOwner) {
      container[OWNER_FIELD[kind]] = newOwner._id;
      if (kind === 'team') ensureTeamOwnerIsAdminMember(container, newOwner._id);
    }
    container.isArchived = false;
    await container.save();

    Logger.info(
      LogContext.SYSTEM,
      newOwner
        ? `Admin reassigned ${label} to a new owner`
        : `Admin unarchived ${label} without changing its owner`,
      {
        adminId: token.id,
        kind,
        containerId: String(container._id),
        newOwnerId: newOwner ? String(newOwner._id) : null,
      },
    );

    return NextResponse.json({
      message: newOwner
        ? `${KIND_LABEL[kind]} reassigned and unarchived`
        : `${KIND_LABEL[kind]} unarchived`,
      container: {
        id: String(container._id),
        kind,
        name: container.name || '',
        isArchived: false,
        ownerId: String(container[OWNER_FIELD[kind]] ?? ''),
        memberCount: memberCountOf(kind, container),
      },
    });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error reassigning archived container', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
