import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';
import { generateApiKey } from '@/lib/api/keyGenerator';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

/**
 * POST /api/developer/keys/[id]/rotate
 * Rotate an API key: revokes the old key and creates a new one with the same config.
 * Returns the new plaintext key (shown once).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await dbConnect();

  const oldKey = await ApiKey.findOne({ _id: id, userId: token.id });
  if (!oldKey) {
    return NextResponse.json({ error: 'API key not found.' }, { status: 404 });
  }

  if (oldKey.status === 'revoked') {
    return NextResponse.json({ error: 'Cannot rotate a revoked key.' }, { status: 400 });
  }

  // Generate new key with the same type
  const { plaintext, keyHash, keyPrefix } = generateApiKey(oldKey.keyType);

  // Create the new key preserving the old key's settings
  const newKey = await ApiKey.create({
    userId: token.id,
    name: oldKey.name,
    keyType: oldKey.keyType,
    keyPrefix,
    keyHash,
    apiTier: oldKey.apiTier,
    permissions: oldKey.permissions,
    customRateLimits: oldKey.customRateLimits,
  });

  // Revoke the old key
  oldKey.status = 'revoked';
  oldKey.revokedAt = new Date();
  await oldKey.save();

  Logger.info(LogContext.SYSTEM, `API key rotated: ${oldKey.keyPrefix} -> ${keyPrefix}`, {
    userId: token.id,
    oldKeyId: oldKey._id,
    newKeyId: newKey._id,
    keyType: oldKey.keyType,
  });

  return NextResponse.json({
    key: plaintext,
    apiKey: {
      id: newKey._id,
      name: newKey.name,
      keyType: newKey.keyType,
      keyPrefix: newKey.keyPrefix,
      apiTier: newKey.apiTier,
      status: newKey.status,
      permissions: newKey.permissions,
      createdAt: newKey.createdAt,
    },
    revokedKeyId: oldKey._id,
    warning: 'Store this key securely. It will not be shown again. The previous key has been revoked.',
  }, { status: 201 });
}
