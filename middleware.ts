import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
// FIX: Import the new Edge-safe logger instead of the main logger.
import { edgeLogger, EdgeLogContext } from '@/lib/logging/edge-logger';

const secret = process.env.NEXTAUTH_SECRET;

/**
 * Utility function to get the client's IP address from the request headers.
 * This is the recommended approach for Next.js Edge Middleware.
 * @param request - The NextRequest object.
 * @returns The client's IP address or a fallback.
 */
function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }
  return request.nextUrl.hostname;
}

export async function middleware(request: NextRequest) {
  if (!secret) {
    // Using console.error directly here is safe and appropriate for critical startup errors.
    console.error("[CRITICAL] Missing NEXTAUTH_SECRET in middleware. Auth will not work.");
    return new Response("Internal Server Error: Auth configuration missing", { status: 500 });
  }

  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: secret });

  // --- Admin Route Protection ---
  if (pathname.startsWith('/admin')) {
    if (!token || token.role !== 'Admin') {
      // FIX: Use the new edgeLogger which is safe for the Edge runtime.
      edgeLogger.warn(EdgeLogContext.AUTH, `Unauthorized access attempt to admin route: ${pathname}`, {
        userId: token?.sub,
        userRole: token?.role,
        ip: getClientIp(request),
      });
      // Redirect to the main application dashboard.
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // --- General Protected Route Protection ---
  const publicPaths = [
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/', // Assuming the homepage is public
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
    /*
     * Match all request paths except for:
     * - API routes (which should protect themselves)
     * - Next.js static files
     * - Next.js image optimization files
     * - Favicon and other public assets
     */
    '/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$).*)',
  ],
};
