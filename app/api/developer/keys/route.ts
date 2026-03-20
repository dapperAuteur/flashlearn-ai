import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';
import { generateApiKey } from '@/lib/api/keyGenerator';
import { Logger, LogContext } from '@/lib/logging/logger';
import { type ApiKeyType, type ApiTier, DEFAULT_PERMISSIONS, MAX_KEYS_PER_TYPE } from '@/types/api';

const secret = process.env.NEXTAUTH_SECRET;

const VALID_KEY_TYPES: ApiKeyType[] = ['admin', 'app', 'public', 'admin_public'];
const ADMIN_ONLY_KEY_TYPES: ApiKeyType[] = ['admin', 'app', 'admin_public'];

/**
 * GET /api/developer/keys
 * List all API keys for the authenticated user (filterable by keyType).
 * Admin users can see all key types; regular users only see 'public' keys.
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = token.role === 'Admin';
  const keyTypeFilter = request.nextUrl.searchParams.get('keyType');

  await dbConnect();

  const filter: Record<string, unknown> = { userId: token.id };

  if (keyTypeFilter && VALID_KEY_TYPES.includes(keyTypeFilter as ApiKeyType)) {
    // Non-admins can only filter to 'public'
    if (!isAdmin && keyTypeFilter !== 'public') {
      return NextResponse.json({ error: 'You can only view public keys.' }, { status: 403 });
    }
    filter.keyType = keyTypeFilter;
  } else if (!isAdmin) {
    // Non-admins default to only seeing their public keys
    filter.keyType = 'public';
  }

  const keys = await ApiKey.find(filter)
    .select('name keyType keyPrefix apiTier status permissions customRateLimits lastUsedAt usageCount expiresAt createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ keys });
}

/**
 * POST /api/developer/keys
 * Create a new API key.
 * Body: { name: string, keyType: ApiKeyType, permissions?: string[] }
 */
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = token.role === 'Admin';

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { name, keyType, permissions } = body as {
    name?: string;
    keyType?: ApiKeyType;
    permissions?: string[];
  };

  // Validate inputs
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Key name is required.' }, { status: 400 });
  }

  if (!keyType || !VALID_KEY_TYPES.includes(keyType)) {
    return NextResponse.json({ error: `Invalid key type. Must be one of: ${VALID_KEY_TYPES.join(', ')}` }, { status: 400 });
  }

  // Non-admins can only create 'public' keys
  if (!isAdmin && ADMIN_ONLY_KEY_TYPES.includes(keyType)) {
    return NextResponse.json({ error: `Only admins can create '${keyType}' keys.` }, { status: 403 });
  }

  await dbConnect();

  // Check key count limit
  const existingCount = await ApiKey.countDocuments({
    userId: token.id,
    keyType,
    status: { $ne: 'revoked' },
  });

  const maxKeysRaw = MAX_KEYS_PER_TYPE[keyType];
  const maxKeys = typeof maxKeysRaw === 'number'
    ? maxKeysRaw
    : maxKeysRaw[(token.subscriptionTier as ApiTier) || 'Free'];

  if (existingCount >= maxKeys) {
    return NextResponse.json({
      error: `Maximum of ${maxKeys} active '${keyType}' keys reached. Revoke an existing key first.`,
    }, { status: 400 });
  }

  // Generate the key
  const { plaintext, keyHash, keyPrefix } = generateApiKey(keyType);

  // Determine permissions
  const keyPermissions = Array.isArray(permissions) && permissions.length > 0
    ? permissions
    : [...DEFAULT_PERMISSIONS[keyType]];

  const apiKey = await ApiKey.create({
    userId: token.id,
    name: name.trim(),
    keyType,
    keyPrefix,
    keyHash,
    apiTier: 'Free',
    permissions: keyPermissions,
  });

  Logger.info(LogContext.SYSTEM, `API key created: ${keyType}`, {
    userId: token.id,
    keyType,
    keyPrefix,
    apiKeyId: apiKey._id,
  });

  // Return the plaintext key ONCE
  return NextResponse.json({
    key: plaintext,
    apiKey: {
      id: apiKey._id,
      name: apiKey.name,
      keyType: apiKey.keyType,
      keyPrefix: apiKey.keyPrefix,
      apiTier: apiKey.apiTier,
      status: apiKey.status,
      permissions: apiKey.permissions,
      createdAt: apiKey.createdAt,
    },
    warning: 'Store this key securely. It will not be shown again.',
  }, { status: 201 });
}
