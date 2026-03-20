import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

const VALID_TIERS = ['Free', 'Developer', 'Pro', 'Enterprise'];
const VALID_STATUSES = ['active', 'revoked'];

/**
 * PATCH /api/admin/api-keys/[id]
 * Admin can: toggle status (active/revoked), change apiTier, set custom rate limits, update permissions.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  await dbConnect();

  const apiKey = await ApiKey.findById(id);
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found.' }, { status: 404 });
  }

  const { status, apiTier, customRateLimits, permissions } = body;

  // Toggle status (active/revoked)
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    apiKey.status = status;
    if (status === 'revoked') {
      apiKey.revokedAt = new Date();
    } else {
      apiKey.revokedAt = undefined;
    }
  }

  // Change tier
  if (apiTier !== undefined) {
    if (!VALID_TIERS.includes(apiTier)) {
      return NextResponse.json({ error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` }, { status: 400 });
    }
    apiKey.apiTier = apiTier;
  }

  // Set custom rate limits
  if (customRateLimits !== undefined) {
    if (customRateLimits === null) {
      // Clear custom limits (revert to defaults)
      apiKey.customRateLimits = undefined;
    } else {
      apiKey.customRateLimits = {
        burstPerMinute: customRateLimits.burstPerMinute,
        monthlyGenerations: customRateLimits.monthlyGenerations,
        monthlyApiCalls: customRateLimits.monthlyApiCalls,
      };
    }
  }

  // Update permissions
  if (permissions !== undefined) {
    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Permissions must be an array.' }, { status: 400 });
    }
    apiKey.permissions = permissions;
  }

  await apiKey.save();

  Logger.info(LogContext.SYSTEM, `Admin updated API key: ${apiKey.keyPrefix}`, {
    userId: token.id as string,
    metadata: {
      apiKeyId: apiKey._id,
      changes: Object.keys(body),
      keyType: apiKey.keyType,
    },
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
      customRateLimits: apiKey.customRateLimits,
      lastUsedAt: apiKey.lastUsedAt,
      usageCount: apiKey.usageCount,
      updatedAt: apiKey.updatedAt,
    },
  });
}
