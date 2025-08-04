/* eslint-disable @typescript-eslint/no-explicit-any */
// models/AuthLog.ts

/**
 * Defines the types of authentication-related events that can be logged.
 */
export enum AuthEventType {
  LOGIN = "login",
  LOGIN_FAILURE = "login_failure",
  LOGOUT = "logout",
  REGISTER = "register",
  REGISTER_FAILURE = "register_failure", // The missing member
  VERIFY_EMAIL = "verify_email",
  VERIFY_EMAIL_FAILURE = "verify_email_failure",
  PASSWORD_RESET_REQUEST = "password_reset_request",
  PASSWORD_RESET_SUCCESS = "password_reset_success",
  PASSWORD_RESET_FAILURE = "password_reset_failure",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
}

/**
 * Defines the structure for an authentication log entry in the database.
 */
export interface AuthLog {
  event: AuthEventType;
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  status: "success" | "failure";
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}
