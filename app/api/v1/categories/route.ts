import { NextRequest } from 'next/server';
import { withApiAuth, apiSuccess } from '@/lib/api/withApiAuth';
import { Category } from '@/models/Category';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

/**
 * GET /api/v1/categories
 * List all available categories.
 */
async function handler(request: NextRequest, context: ApiAuthContext, requestId: string) {
  await dbConnect();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories: any[] = await Category.find({ isActive: { $ne: false } })
    .select('name slug description')
    .sort({ name: 1 })
    .lean();

  return apiSuccess({
    categories: categories.map(c => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description,
    })),
  }, { requestId });
}

export const GET = withApiAuth(handler, {
  allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'],
  requiredPermission: 'categories:read',
});
