import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

/**
 * GET /api/developer/keys/[id]
 * Get details for a single API key.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  const apiKey = await ApiKey.findOne({ _id: id, userId: token.id })
    .select('name keyType keyPrefix apiTier status permissions customRateLimits lastUsedAt usageCount expiresAt createdAt updatedAt')
    .lean();

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found.' }, { status: 404 });
  }

  return NextResponse.json({ apiKey });
}

/**
 * PATCH /api/developer/keys/[id]
 * Update key name or permissions.
 * Body: { name?: string, permissions?: string[] }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  await dbConnect();

  const apiKey = await ApiKey.findOne({ _id: id, userId: token.id });
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found.' }, { status: 404 });
  }

  if (apiKey.status === 'revoked') {
    return NextResponse.json({ error: 'Cannot update a revoked key.' }, { status: 400 });
  }

  const { name, permissions } = body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Key name must be a non-empty string.' }, { status: 400 });
    }
    apiKey.name = name.trim();
  }

  if (permissions !== undefined) {
    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Permissions must be an array of strings.' }, { status: 400 });
    }
    apiKey.permissions = permissions;
  }

  await apiKey.save();

  Logger.info(LogContext.SYSTEM, `API key updated: ${apiKey.keyPrefix}`, {
    userId: token.id,
    apiKeyId: apiKey._id,
    changes: Object.keys(body),
  });

  return NextResponse.json({
    apiKey: {
      id: apiKey._id,
      name: apiKey.name,
      keyType: apiKey.keyType,
      keyPrefix: apiKey.keyPrefix,
      apiTier: apiKey.apiTier,
      status: apiKey.status,
      permissions: apiKey.permissions,
      updatedAt: apiKey.updatedAt,
    },
  });
}

/**
 * DELETE /api/developer/keys/[id]
 * Revoke an API key.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  const apiKey = await ApiKey.findOne({ _id: id, userId: token.id });
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found.' }, { status: 404 });
  }

  if (apiKey.status === 'revoked') {
    return NextResponse.json({ error: 'Key is already revoked.' }, { status: 400 });
  }

  apiKey.status = 'revoked';
  apiKey.revokedAt = new Date();
  await apiKey.save();

  Logger.info(LogContext.SYSTEM, `API key revoked: ${apiKey.keyPrefix}`, {
    userId: token.id,
    apiKeyId: apiKey._id,
    keyType: apiKey.keyType,
  });

  return NextResponse.json({ message: 'API key revoked successfully.' });
}
