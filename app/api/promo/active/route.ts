import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { getActivePromotion } from '@/lib/promo/promotions';

// Public endpoint that returns the currently active promotion (if any).
// Consumed by the rate limiter and by client-side banner / pricing components.
// Returns { promotion: null } when nothing is active so callers can branch on
// presence rather than parsing dates themselves.
export async function GET() {
  try {
    await dbConnect();
    const promotion = await getActivePromotion();
    return NextResponse.json({ promotion });
  } catch {
    return NextResponse.json({ promotion: null });
  }
}
