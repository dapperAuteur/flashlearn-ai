/**
 * @jest-environment node
 *
 * An archived study group keeps every read its members already had and refuses
 * every write with 409. Two escapes stay open on purpose: a member can always
 * leave, and the creator or an admin can always delete.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('../../../lib/services/activityService', () => ({
  createActivityEvent: jest.fn(async () => {}),
}));
jest.mock('../../../lib/email/mailgun', () => ({
  sendStudyGroupInviteEmail: jest.fn(async () => ({ success: true })),
}));

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Team } from '@/models/Team';
import { TeamMessage } from '@/models/TeamMessage';
import { FlashcardSet } from '@/models/FlashcardSet';
import { User } from '@/models/User';
import { Invitation } from '@/models/Invitation';
import { PATCH as updateTeam, DELETE as deleteTeam } from '@/app/api/teams/[id]/route';
import { POST as joinTeam } from '@/app/api/teams/join/route';
import {
  POST as addMember,
  DELETE as removeMember,
  PATCH as changeRole,
} from '@/app/api/teams/[id]/members/route';
import {
  GET as listMessages,
  POST as sendMessage,
} from '@/app/api/teams/[id]/messages/route';
import { POST as shareSetToTeam } from '@/app/api/teams/[id]/sets/route';
import { POST as inviteByEmail } from '@/app/api/teams/[id]/invite/route';

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

const OWNER_ID = '64d000000000000000000001';
const MEMBER_ID = '64d000000000000000000002';
const OUTSIDER_ID = '64d000000000000000000003';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  await Promise.all([
    Team.deleteMany({}),
    TeamMessage.deleteMany({}),
    FlashcardSet.deleteMany({}),
    User.deleteMany({}),
    Invitation.deleteMany({}),
  ]);
});

function signIn(userId: string, role = 'Student') {
  mockedSession.mockResolvedValue({ user: { id: userId, role, email: 'owner@example.test' } } as never);
}

function request(path: string, method: string, body?: unknown) {
  return new NextRequest(`https://flashlearnai.witus.online${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function seedTeam(isArchived: boolean, joinCode: string) {
  const team = await Team.create({
    name: isArchived ? 'Archived Group' : 'Active Group',
    creatorId: new Types.ObjectId(OWNER_ID),
    members: [
      { userId: new Types.ObjectId(OWNER_ID), role: 'admin', joinedAt: new Date() },
      { userId: new Types.ObjectId(MEMBER_ID), role: 'member', joinedAt: new Date() },
    ],
    sharedSets: [],
    joinCode,
    isArchived,
  });
  return { team, id: (team._id as Types.ObjectId).toString() };
}

async function seedSet() {
  const set = await FlashcardSet.create({
    profile: new Types.ObjectId(),
    title: 'Shared deck',
    cardCount: 1,
    source: 'Prompt',
    flashcards: [{ front: 'Q', back: 'A' }],
  });
  return (set._id as Types.ObjectId).toString();
}

describe('joining a study group', () => {
  it('refuses a join into an archived group with 409', async () => {
    await seedTeam(true, '100001');
    signIn(OUTSIDER_ID);

    const res = await joinTeam(request('/api/teams/join', 'POST', { joinCode: '100001' }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/archived/i);
    const team = await Team.findOne({ joinCode: '100001' });
    expect(team!.members).toHaveLength(2);
  });

  it('still lets somebody join an active group', async () => {
    await seedTeam(false, '100002');
    signIn(OUTSIDER_ID);

    const res = await joinTeam(request('/api/teams/join', 'POST', { joinCode: '100002' }));

    expect(res.status).toBe(200);
    const team = await Team.findOne({ joinCode: '100002' });
    expect(team!.members).toHaveLength(3);
  });
});

describe('changing an archived study group', () => {
  it('refuses a settings update with 409', async () => {
    const { id } = await seedTeam(true, '100003');
    signIn(OWNER_ID);

    const res = await updateTeam(request(`/api/teams/${id}`, 'PATCH', { name: 'Renamed' }), routeParams(id));

    expect(res.status).toBe(409);
    const team = await Team.findById(id);
    expect(team!.name).toBe('Archived Group');
  });

  it('still updates settings on an active group', async () => {
    const { id } = await seedTeam(false, '100004');
    signIn(OWNER_ID);

    const res = await updateTeam(request(`/api/teams/${id}`, 'PATCH', { name: 'Renamed' }), routeParams(id));

    expect(res.status).toBe(200);
    const team = await Team.findById(id);
    expect(team!.name).toBe('Renamed');
  });

  it('refuses adding a member with 409', async () => {
    const { id } = await seedTeam(true, '100005');
    const newUser = await User.create({ name: 'New', email: 'new@example.test', username: 'newbie' });
    signIn(OWNER_ID);

    const res = await addMember(
      request(`/api/teams/${id}/members`, 'POST', { userId: (newUser._id as Types.ObjectId).toString() }),
      routeParams(id),
    );

    expect(res.status).toBe(409);
    const team = await Team.findById(id);
    expect(team!.members).toHaveLength(2);
  });

  it('refuses a role change with 409', async () => {
    const { id } = await seedTeam(true, '100006');
    signIn(OWNER_ID);

    const res = await changeRole(
      request(`/api/teams/${id}/members`, 'PATCH', { userId: MEMBER_ID, role: 'admin' }),
      routeParams(id),
    );

    expect(res.status).toBe(409);
    const team = await Team.findById(id);
    expect(team!.members[1].role).toBe('member');
  });

  it('refuses an admin removing somebody else with 409', async () => {
    const { id } = await seedTeam(true, '100007');
    signIn(OWNER_ID);

    const res = await removeMember(
      request(`/api/teams/${id}/members`, 'DELETE', { userId: MEMBER_ID }),
      routeParams(id),
    );

    expect(res.status).toBe(409);
    const team = await Team.findById(id);
    expect(team!.members).toHaveLength(2);
  });

  it('refuses a new shared set with 409', async () => {
    const { id } = await seedTeam(true, '100008');
    const setId = await seedSet();
    signIn(MEMBER_ID);

    const res = await shareSetToTeam(
      request(`/api/teams/${id}/sets`, 'POST', { setId }),
      routeParams(id),
    );

    expect(res.status).toBe(409);
    const team = await Team.findById(id);
    expect(team!.sharedSets).toHaveLength(0);
  });

  it('refuses an email invite with 409', async () => {
    const { id } = await seedTeam(true, '100009');
    signIn(OWNER_ID);

    const res = await inviteByEmail(
      request(`/api/teams/${id}/invite`, 'POST', { email: 'friend@example.test' }),
      routeParams(id),
    );

    expect(res.status).toBe(409);
    await expect(Invitation.countDocuments({})).resolves.toBe(0);
  });
});

describe('study group chat', () => {
  it('refuses a new message on an archived group with 409', async () => {
    const { id } = await seedTeam(true, '100010');
    signIn(MEMBER_ID);

    const res = await sendMessage(
      request(`/api/teams/${id}/messages`, 'POST', { content: 'Anyone here?' }),
      routeParams(id),
    );

    expect(res.status).toBe(409);
    await expect(TeamMessage.countDocuments({})).resolves.toBe(0);
  });

  it('still posts a message to an active group', async () => {
    const { id } = await seedTeam(false, '100011');
    signIn(MEMBER_ID);

    const res = await sendMessage(
      request(`/api/teams/${id}/messages`, 'POST', { content: 'Anyone here?' }),
      routeParams(id),
    );

    expect(res.status).toBe(201);
    await expect(TeamMessage.countDocuments({})).resolves.toBe(1);
  });

  it('keeps the message history readable while archived', async () => {
    const { team, id } = await seedTeam(false, '100012');
    await TeamMessage.create({
      teamId: team._id,
      senderId: new Types.ObjectId(MEMBER_ID),
      content: 'Posted before the archive',
      type: 'message',
    });
    team.isArchived = true;
    await team.save();
    signIn(MEMBER_ID);

    const res = await listMessages(request(`/api/teams/${id}/messages`, 'GET'), routeParams(id));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
  });
});

describe('escapes that stay open when archived', () => {
  it('lets a member leave an archived group', async () => {
    const { id } = await seedTeam(true, '100013');
    signIn(MEMBER_ID);

    const res = await removeMember(
      request(`/api/teams/${id}/members`, 'DELETE', { userId: MEMBER_ID }),
      routeParams(id),
    );

    expect(res.status).toBe(200);
    const team = await Team.findById(id);
    expect(team!.members).toHaveLength(1);
  });

  it('lets the creator delete an archived group', async () => {
    const { id } = await seedTeam(true, '100014');
    signIn(OWNER_ID);

    const res = await deleteTeam(request(`/api/teams/${id}`, 'DELETE'), routeParams(id));

    expect(res.status).toBe(200);
    await expect(Team.countDocuments({})).resolves.toBe(0);
  });
});
