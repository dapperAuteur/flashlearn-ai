import { NextRequest } from "next/server";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
/**
 * Get the client IP address from a request
 */
export function getClientIp(request: NextRequest): string {
  // Check for Cloudflare or other proxy headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Get the first IP if there are multiple
    return forwardedFor.split(",")[0].trim();
  }
  
  // Fallback to local IP from connection
  return "127.0.0.1";
}

/**
 * A utility function to conditionally join class names.
 * It uses `clsx` to handle conditional classes and `tailwind-merge`
 * to intelligently merge Tailwind CSS classes without style conflicts.
 * * @param inputs - A list of class values to be combined.
 * @returns A string of merged and optimized class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
