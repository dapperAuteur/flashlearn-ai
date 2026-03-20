import { Document, Types } from 'mongoose';

// ============================
// API Key Types
// ============================

export type ApiKeyType = 'admin' | 'app' | 'public' | 'admin_public';

export type ApiTier = 'Free' | 'Developer' | 'Pro' | 'Enterprise';

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export const API_KEY_PREFIXES: Record<ApiKeyType, string> = {
  admin: 'fl_admin_',
  app: 'fl_app_',
  public: 'fl_pub_',
  admin_public: 'fl_adm_pub_',
} as const;

export const DEFAULT_PERMISSIONS: Record<ApiKeyType, string[]> = {
  admin: ['admin:*', 'generate', 'sets:*', 'study:*', 'users:*', 'analytics:*'],
  app: ['generate', 'sets:read', 'sets:write', 'study:*', 'categories:read'],
  public: ['generate', 'sets:read', 'sets:write', 'sets:explore', 'categories:read', 'study:*', 'versus:*'],
  admin_public: ['generate', 'sets:read', 'sets:write', 'sets:explore', 'categories:read', 'study:*', 'versus:*', 'admin:bypass_quota'],
} as const;

export const GEMINI_KEY_ENV_MAP: Record<ApiKeyType, string> = {
  admin: 'GEMINI_API_KEY_ADMIN',
  app: 'GEMINI_API_KEY_APP',
  public: 'GEMINI_API_KEY_PUBLIC',
  admin_public: 'GEMINI_API_KEY_ADMIN_PUBLIC',
} as const;

// ============================
// API Key Model Interface
// ============================

export interface IApiKey extends Document {
  userId: Types.ObjectId;
  name: string;
  keyType: ApiKeyType;
  keyPrefix: string;
  keyHash: string;
  apiTier: ApiTier;
  status: ApiKeyStatus;
  permissions: string[];
  customRateLimits?: {
    burstPerMinute?: number;
    monthlyGenerations?: number;
    monthlyApiCalls?: number;
  };
  // Enterprise features
  allowedIPs?: string[];
  webhookUrl?: string;
  prioritySupport?: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================
// API Usage Model Interface
// ============================

export interface IApiUsage extends Document {
  apiKeyId: Types.ObjectId;
  userId: Types.ObjectId;
  keyType: ApiKeyType;
  periodStart: Date;
  periodEnd: Date;
  apiCalls: number;
  generationCalls: number;
  overageCalls: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================
// API Log Model Interface
// ============================

export interface IApiLog extends Document {
  apiKeyId: Types.ObjectId;
  keyType: ApiKeyType;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

// ============================
// Rate Limit Configuration
// ============================

export interface ApiRateLimitConfig {
  burstPerMinute: number;
  monthlyGenerations: number;
  monthlyApiCalls: number;
}

export const DEFAULT_RATE_LIMITS: Record<ApiKeyType, Record<ApiTier, ApiRateLimitConfig>> = {
  admin: {
    Free: { burstPerMinute: Infinity, monthlyGenerations: Infinity, monthlyApiCalls: Infinity },
    Developer: { burstPerMinute: Infinity, monthlyGenerations: Infinity, monthlyApiCalls: Infinity },
    Pro: { burstPerMinute: Infinity, monthlyGenerations: Infinity, monthlyApiCalls: Infinity },
    Enterprise: { burstPerMinute: Infinity, monthlyGenerations: Infinity, monthlyApiCalls: Infinity },
  },
  app: {
    Free: { burstPerMinute: 300, monthlyGenerations: 50000, monthlyApiCalls: 500000 },
    Developer: { burstPerMinute: 300, monthlyGenerations: 50000, monthlyApiCalls: 500000 },
    Pro: { burstPerMinute: 300, monthlyGenerations: 50000, monthlyApiCalls: 500000 },
    Enterprise: { burstPerMinute: 300, monthlyGenerations: 50000, monthlyApiCalls: 500000 },
  },
  public: {
    Free: { burstPerMinute: 10, monthlyGenerations: 100, monthlyApiCalls: 1000 },
    Developer: { burstPerMinute: 60, monthlyGenerations: 5000, monthlyApiCalls: 50000 },
    Pro: { burstPerMinute: 120, monthlyGenerations: 25000, monthlyApiCalls: 250000 },
    Enterprise: { burstPerMinute: 300, monthlyGenerations: Infinity, monthlyApiCalls: Infinity },
  },
  admin_public: {
    Free: { burstPerMinute: Infinity, monthlyGenerations: Infinity, monthlyApiCalls: Infinity },
    Developer: { burstPerMinute: Infinity, monthlyGenerations: Infinity, monthlyApiCalls: Infinity },
    Pro: { burstPerMinute: Infinity, monthlyGenerations: Infinity, monthlyApiCalls: Infinity },
    Enterprise: { burstPerMinute: Infinity, monthlyGenerations: Infinity, monthlyApiCalls: Infinity },
  },
} as const;

// ============================
// Key Creation Limits
// ============================

export const MAX_KEYS_PER_TYPE: Record<ApiKeyType, number | Record<ApiTier, number>> = {
  admin: 5,
  app: 10,
  public: { Free: 2, Developer: 5, Pro: 10, Enterprise: 25 },
  admin_public: 5,
} as const;

// ============================
// API Response Types
// ============================

export interface ApiResponseMeta {
  requestId: string;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  meta: ApiResponseMeta;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: ApiResponseMeta;
}

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMIT_EXCEEDED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'AI_GENERATION_FAILED';

// ============================
// Auth Context (passed to route handlers)
// ============================

export interface ApiAuthContext {
  user: import('./user').IUser;
  apiKey: IApiKey;
  keyType: ApiKeyType;
  apiTier: ApiTier;
}
