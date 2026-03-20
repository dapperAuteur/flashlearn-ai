import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';

const secret = process.env.NEXTAUTH_SECRET;

/**
 * GET /api/admin/api-keys
 * List all API keys across all users (admin only).
 * Query params: keyType, status, userId, page, limit, search
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await dbConnect();

  const url = request.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25')));
  const keyType = url.searchParams.get('keyType');
  const status = url.searchParams.get('status');
  const userId = url.searchParams.get('userId');
  const search = url.searchParams.get('search');

  const filter: Record<string, unknown> = {};
  if (keyType) filter.keyType = keyType;
  if (status) filter.status = status;
  if (userId) filter.userId = userId;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { keyPrefix: { $regex: search, $options: 'i' } },
    ];
  }

  const [keys, total] = await Promise.all([
    ApiKey.find(filter)
      .populate('userId', 'name email role subscriptionTier')
      .select('name keyType keyPrefix apiTier status permissions customRateLimits lastUsedAt usageCount expiresAt revokedAt createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ApiKey.countDocuments(filter),
  ]);

  return NextResponse.json({
    keys,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
