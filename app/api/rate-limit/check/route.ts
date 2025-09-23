/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { checkRateLimit } from '@/lib/ratelimit/rateLimitGemini';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const result = await checkRateLimit(session.user.id);
    
    return NextResponse.json({ 
      allowed: !result.limited,
      message: result.limited ? result.reason || 'Rate limit exceeded' : 'Rate limit OK'
    });
  } catch (error) {
    console.error('Rate limit check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check rate limit',
      allowed: false 
    }, { status: 500 });
  }
}