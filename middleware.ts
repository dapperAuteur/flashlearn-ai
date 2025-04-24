// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { getSession } from '@/lib/auth/session';


/**
 * Middleware to add additional security measures
 * and handle rate limiting headers
 */
export function middleware(request: NextRequest) {

  // console.log('middleware()request :>> ', request);
  
  // get session from NextAuth
  // const session = await getSession();
  // console.log('session :>> ', session);
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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};