import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from './authenticateApiKey';
import { apiSuccess, apiError, generateRequestId } from './apiResponse';
import { checkBurstLimit, checkMonthlyQuota, incrementUsage } from '@/lib/ratelimit/rateLimitApi';
import { ApiLog } from '@/models/ApiLog';
import { Logger, LogContext } from '@/lib/logging/logger';
import { type ApiKeyType, type ApiAuthContext } from '@/types/api';

type ApiHandler = (
  request: NextRequest,
  context: ApiAuthContext,
  requestId: string
) => Promise<NextResponse>;

interface WithApiAuthOptions {
  /** Which key types are allowed to access this route */
  allowedKeyTypes?: ApiKeyType[];
  /** Permission string required (e.g., 'generate', 'sets:read') */
  requiredPermission?: string;
  /** Whether this route counts as a generation call for quota purposes */
  isGenerationRoute?: boolean;
}

/**
 * Higher-order wrapper that combines API key auth, rate limiting, usage tracking,
 * and request logging into a composable middleware for public API routes.
 */
export function withApiAuth(handler: ApiHandler, options: WithApiAuthOptions = {}) {
  const {
    allowedKeyTypes = ['public', 'admin_public', 'admin'],
    requiredPermission,
    isGenerationRoute = false,
  } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // 1. Authenticate
    const authResult = await authenticateApiKey(
      request.headers.get('authorization')
    );

    if ('error' in authResult) {
      return apiError(
        authResult.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
        requestId,
        undefined,
        authResult.error
      );
    }

    const { context } = authResult;
    const { apiKey, keyType, apiTier } = context;

    // 2. Check key type is allowed for this route
    if (!allowedKeyTypes.includes(keyType)) {
      return apiError('FORBIDDEN', requestId, undefined,
        `Key type '${keyType}' is not allowed for this endpoint.`
      );
    }

    // 3. Check permission
    if (requiredPermission) {
      const hasPermission = apiKey.permissions.some((p: string) => {
        if (p === '*') return true;
        if (p.endsWith(':*')) {
          const prefix = p.slice(0, -2);
          return requiredPermission.startsWith(prefix);
        }
        return p === requiredPermission;
      });

      if (!hasPermission) {
        return apiError('FORBIDDEN', requestId, undefined,
          `API key lacks the '${requiredPermission}' permission.`
        );
      }
    }

    // 4. Check burst rate limit
    const apiKeyId = String(apiKey._id);
    const burstResult = await checkBurstLimit(
      apiKeyId,
      keyType,
      apiTier,
      apiKey.customRateLimits
    );

    if (!burstResult.allowed) {
      return apiError('RATE_LIMIT_EXCEEDED', requestId, {
        limit: burstResult.limit,
        remaining: 0,
        reset: burstResult.reset,
      });
    }

    // 5. Check monthly quota
    const quotaResult = await checkMonthlyQuota(
      apiKeyId,
      String(apiKey.userId),
      keyType,
      apiTier,
      isGenerationRoute,
      apiKey.customRateLimits
    );

    if (!quotaResult.allowed) {
      return apiError('QUOTA_EXCEEDED', requestId, undefined, quotaResult.reason);
    }

    // 6. Execute the handler
    let response: NextResponse;
    let statusCode = 200;
    try {
      response = await handler(request, context, requestId);
      statusCode = response.status;
    } catch (error) {
      Logger.error(LogContext.SYSTEM, 'Unhandled error in API route handler.', {
        requestId,
        endpoint: request.nextUrl.pathname,
        error,
      });
      response = apiError('INTERNAL_ERROR', requestId);
      statusCode = 500;
    }

    // 7. Increment usage (fire-and-forget)
    incrementUsage(
      apiKeyId,
      String(apiKey.userId),
      keyType,
      isGenerationRoute
    ).catch(() => {});

    // 8. Log the request (fire-and-forget)
    const responseTimeMs = Date.now() - startTime;
    ApiLog.create({
      apiKeyId: apiKey._id as string,
      keyType,
      endpoint: request.nextUrl.pathname,
      method: request.method,
      statusCode,
      responseTimeMs,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      userAgent: request.headers.get('user-agent') || '',
    }).catch((err: Error) => {
      Logger.error(LogContext.SYSTEM, 'Failed to write API log.', { error: err });
    });

    // 9. Inject rate limit headers into the response
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', String(burstResult.limit));
    headers.set('X-RateLimit-Remaining', String(burstResult.remaining));
    headers.set('X-RateLimit-Reset', String(burstResult.reset));
    headers.set('X-Request-Id', requestId);

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

// Re-export for convenience
export { apiSuccess, apiError, generateRequestId };
