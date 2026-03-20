import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { type ApiErrorCode, type ApiSuccessResponse, type ApiErrorResponse, type ApiResponseMeta } from '@/types/api';
import { API_ERRORS } from './apiErrors';

/**
 * Generates a unique request ID for tracing.
 */
export function generateRequestId(): string {
  return `req_${randomBytes(12).toString('base64url')}`;
}

/**
 * Builds standard rate limit headers.
 */
function rateLimitHeaders(meta: ApiResponseMeta): Record<string, string> {
  const headers: Record<string, string> = {};
  if (meta.rateLimit) {
    headers['X-RateLimit-Limit'] = String(meta.rateLimit.limit);
    headers['X-RateLimit-Remaining'] = String(meta.rateLimit.remaining);
    headers['X-RateLimit-Reset'] = String(meta.rateLimit.reset);
  }
  return headers;
}

/**
 * Returns a successful JSON response in the standard API envelope.
 */
export function apiSuccess<T>(
  data: T,
  meta: ApiResponseMeta,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    { data, meta },
    { status, headers: rateLimitHeaders(meta) }
  );
}

/**
 * Returns an error JSON response in the standard API envelope.
 */
export function apiError(
  code: ApiErrorCode,
  requestId: string,
  details?: Record<string, unknown>,
  overrideMessage?: string
): NextResponse<ApiErrorResponse> {
  const def = API_ERRORS[code];
  return NextResponse.json(
    {
      error: {
        code,
        message: overrideMessage || def.message,
        ...(details && { details }),
      },
      meta: { requestId },
    },
    {
      status: def.status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
