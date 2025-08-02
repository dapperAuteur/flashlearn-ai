import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { getSession } from '@/lib/auth/session';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;

/**
 * Middleware to add additional security measures
 * and handle rate limiting headers
 */
export async function middleware(request: NextRequest) {

  if (!secret) {
    console.error("Missing NEXTAUTH_SECRET environment variable in middleware");
    // Handle appropriately - maybe redirect to an error page or allow access cautiously
    // For now, let's return a generic error response
    return new Response("Internal Server Error: Auth configuration missing", { status: 500 });
  }

  // Use getToken to decode the JWT from the request cookies
  const token = await getToken({ req: request, secret: secret });
  console.log('Middleware token:', token); // For debugging

  // Check if the token exists (user is logged in)
  // Add checks for specific paths if needed (e.g., only protect /dashboard)
  const { pathname } = request.nextUrl;
  // const isPublicPath = pathname === '/signin' || pathname === '/signup' || pathname === '/generate' || pathname === '/'; // Add other public paths

  const publicPaths = ['/generate', '/forgot-password', '/dashboard/study','/signin', '/signup', '/'];
  const isPublicPath =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/dashboard/study/session/') ||
    pathname === '/';

  if (!token && !isPublicPath) {
    console.log(`Middleware: No token found for protected path ${pathname}, redirecting to signin.`);
    const signInUrl = new URL('/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url); // Optional: redirect back after login
    return NextResponse.redirect(signInUrl);
  }

  // // get session from NextAuth
  // const session = await getSession();
  // // console.log('session :>> ', session);
  // if (!session) {
  //   return NextResponse.redirect(new URL('/signin', request.url));
  // }
  
  
  


  // Clone the response
  const response = NextResponse.next();
  
  // Add global headers to all responses
  response.headers.set('X-FlashLearn-Secure', 'true');
  
  // Handle rate limiting headers that might be set by API routes
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    response.headers.set('X-RateLimit-Reset', retryAfter);
  }
  
  return response;
}

/**
 * Configure which paths this middleware runs on
 */
export const config = {
  // Apply to all routes except API routes that handle their own rate limiting
  matcher: [
    /*
     * Match all request paths except:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico).*)',
  ],
};