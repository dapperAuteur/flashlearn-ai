import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { AppConfig } from '@/models/AppConfig';
import { clearRateLimitCache } from '@/lib/ratelimit/rateLimitGemini';
import { getConfigSchema, validateConfigValue } from '@/lib/admin/configSchema';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();
    const configs = await AppConfig.find({}).sort({ key: 1 }).lean();
    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Error fetching configs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { key, value, description } = await request.json();

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // Validate against the field schema for known keys (defense in depth — the UI
    // validates too, but a malformed value must never reach the database).
    const schema = getConfigSchema(key);
    if (schema) {
      const { ok, errors } = validateConfigValue(schema, value);
      if (!ok) {
        const summary = Object.values(errors).join(' ');
        return NextResponse.json(
          { error: `Invalid value for ${key}: ${summary}`, fieldErrors: errors },
          { status: 400 },
        );
      }
    }

    await dbConnect();

    const config = await AppConfig.findOneAndUpdate(
      { key },
      { value, description },
      { upsert: true, new: true },
    );

    // Clear caches if rate limits were updated
    if (key === 'RATE_LIMITS') {
      clearRateLimitCache();
    }

    Logger.info(LogContext.SYSTEM, `Admin updated config: ${key}`, {
      adminId: token.id,
      key,
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
