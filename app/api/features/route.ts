import { NextResponse } from 'next/server';
import { getFeatureFlags } from '@/lib/features';

// Public, read-only feature-flag state for the client (e.g. the generate page deciding
// whether to show audio as active or "coming soon"). Always reflects the current DB
// value — no caching — so an admin toggle takes effect immediately.
export const dynamic = 'force-dynamic';

export async function GET() {
  const flags = await getFeatureFlags();
  return NextResponse.json(flags);
}
