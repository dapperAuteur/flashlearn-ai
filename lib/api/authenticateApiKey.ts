import { createHash } from 'crypto';
import { ApiKey } from '@/models/ApiKey';
import { User } from '@/models/User';
import dbConnect from '@/lib/db/dbConnect';
import { Logger, LogContext } from '@/lib/logging/logger';
import { type ApiKeyType, type ApiAuthContext } from '@/types/api';

/**
 * Detects the key type from the prefix of the API key string.
 */
function detectKeyType(key: string): ApiKeyType | null {
  if (key.startsWith('fl_admin_') && !key.startsWith('fl_adm_pub_')) return 'admin';
  if (key.startsWith('fl_adm_pub_')) return 'admin_public';
  if (key.startsWith('fl_app_')) return 'app';
  if (key.startsWith('fl_pub_')) return 'public';
  return null;
}

/**
 * Extracts and validates an API key from the Authorization header.
 * Returns the authenticated context or null with a reason.
 */
export async function authenticateApiKey(
  authHeader: string | null
): Promise<{ context: ApiAuthContext } | { error: string; status: number }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or malformed Authorization header. Expected: Bearer <api_key>', status: 401 };
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    return { error: 'API key is empty.', status: 401 };
  }

  const keyType = detectKeyType(rawKey);
  if (!keyType) {
    return { error: 'Invalid API key prefix.', status: 401 };
  }

  // Hash the key for lookup
  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  await dbConnect();

  // Find the key by hash
  const apiKey = await ApiKey.findOne({
    keyHash,
    status: 'active',
  });

  if (!apiKey) {
    Logger.warning(LogContext.SYSTEM, 'API key authentication failed: key not found or inactive.', {
      keyPrefix: rawKey.slice(0, 16) + '...',
    });
    return { error: 'Invalid or revoked API key.', status: 401 };
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    Logger.info(LogContext.SYSTEM, 'API key expired.', { apiKeyId: apiKey._id });
    // Mark as expired
    await ApiKey.updateOne({ _id: apiKey._id }, { status: 'expired' });
    return { error: 'API key has expired.', status: 401 };
  }

  // Load user
  const user = await User.findById(apiKey.userId).select(
    'name email role subscriptionTier suspended emailVerified'
  );

  if (!user) {
    return { error: 'API key owner account not found.', status: 401 };
  }

  if (user.suspended) {
    return { error: 'Account is suspended.', status: 403 };
  }

  // Admin and admin_public keys require Admin role
  if ((apiKey.keyType === 'admin' || apiKey.keyType === 'admin_public') && user.role !== 'Admin') {
    Logger.warning(LogContext.SYSTEM, 'Non-admin user attempted to use admin API key.', {
      userId: user._id,
      keyType: apiKey.keyType,
    });
    return { error: 'This key type requires admin privileges.', status: 403 };
  }

  // Update lastUsedAt and usageCount asynchronously (fire-and-forget)
  ApiKey.updateOne(
    { _id: apiKey._id },
    { $set: { lastUsedAt: new Date() }, $inc: { usageCount: 1 } }
  ).catch((err: Error) => {
    Logger.error(LogContext.SYSTEM, 'Failed to update API key last used timestamp.', { error: err });
  });

  return {
    context: {
      user,
      apiKey,
      keyType: apiKey.keyType as ApiKeyType,
      apiTier: apiKey.apiTier,
    },
  };
}
