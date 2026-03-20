import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { AppConfig } from '@/models/AppConfig';
import { clearApiRateLimitCache } from '@/lib/ratelimit/rateLimitApi';
import { Logger, LogContext } from '@/lib/logging/logger';
import { DEFAULT_RATE_LIMITS } from '@/types/api';

const secret = process.env.NEXTAUTH_SECRET;

/**
 * GET /api/admin/api-config
 * Returns the current API rate limit configuration and Gemini key status.
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await dbConnect();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configDoc: any = await AppConfig.findOne({ key: 'API_RATE_LIMITS' }).lean();

  // Check which Gemini keys are configured
  const geminiKeyStatus = {
    admin: !!process.env.GEMINI_API_KEY_ADMIN,
    app: !!process.env.GEMINI_API_KEY_APP,
    public: !!process.env.GEMINI_API_KEY_PUBLIC,
    admin_public: !!process.env.GEMINI_API_KEY_ADMIN_PUBLIC,
    fallback: !!process.env.GEMINI_API_KEY,
  };

  return NextResponse.json({
    config: configDoc?.value || null,
    defaults: DEFAULT_RATE_LIMITS,
    geminiKeyStatus,
    geminiModel: process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash',
  });
}

/**
 * PUT /api/admin/api-config
 * Update API rate limit configuration.
 * Body: { config: Record<string, ApiRateLimitConfig> }
 * Saves to AppConfig with key 'API_RATE_LIMITS' and clears the cache.
 */
export async function PUT(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { config } = body;
  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Config object is required.' }, { status: 400 });
  }

  await dbConnect();

  await AppConfig.findOneAndUpdate(
    { key: 'API_RATE_LIMITS' },
    {
      value: config,
      description: 'Public API rate limit configuration per key type and tier.',
    },
    { upsert: true, new: true }
  );

  // Clear the in-memory cache so new limits take effect immediately
  clearApiRateLimitCache();

  Logger.info(LogContext.SYSTEM, 'Admin updated API rate limit config.', {
    userId: token.id as string,
  });

  return NextResponse.json({ message: 'API rate limits updated successfully.', config });
}
