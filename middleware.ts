import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { edgeLogger, EdgeLogContext } from '@/lib/logging/edge-logger';

const secret = process.env.NEXTAUTH_SECRET;

function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return request.nextUrl.hostname;
}

export async function middleware(request: NextRequest) {
  if (!secret) {
    console.error("[CRITICAL] Missing NEXTAUTH_SECRET in middleware.");
    return new Response("Internal Server Error", { status: 500 });
  }

  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: secret });

  // --- Admin Route Protection ---
  if (pathname.startsWith('/admin')) {
    // This is the most important log for debugging this issue.
    edgeLogger.info(EdgeLogContext.MIDDLEWARE, "Admin route check", {
      pathname,
      tokenExists: !!token,
      tokenRole: token?.role, // Check your server logs for this value.
    });

    if (token?.role === 'Admin') {
      // If the user is an admin, allow the request to proceed.
      return NextResponse.next();
    }

    // For any other case (no token, or not an admin role), redirect.
    edgeLogger.warn(EdgeLogContext.AUTH, `Unauthorized access to admin route, redirecting.`, {
      ip: getClientIp(request),
      userId: token?.sub,
    });
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // --- General Protected Route Protection ---
  const publicPaths = [
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/study',
    '/pricing',
    '/roadmap',
    '/'
  ];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (!token && !isPublicPath) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$).*)',
  ],
};
