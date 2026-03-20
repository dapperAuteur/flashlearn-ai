import { type ApiErrorCode } from '@/types/api';

interface ApiErrorDef {
  status: number;
  message: string;
}

export const API_ERRORS: Record<ApiErrorCode, ApiErrorDef> = {
  UNAUTHORIZED: { status: 401, message: 'Missing or invalid API key.' },
  FORBIDDEN: { status: 403, message: 'API key lacks the required permission.' },
  RATE_LIMIT_EXCEEDED: { status: 429, message: 'Rate limit exceeded. Try again shortly.' },
  QUOTA_EXCEEDED: { status: 429, message: 'Monthly quota exhausted. Upgrade your plan or wait for the next billing period.' },
  INVALID_INPUT: { status: 400, message: 'Request validation failed.' },
  NOT_FOUND: { status: 404, message: 'Resource not found.' },
  INTERNAL_ERROR: { status: 500, message: 'An internal error occurred.' },
  AI_GENERATION_FAILED: { status: 502, message: 'AI generation service temporarily unavailable.' },
};
