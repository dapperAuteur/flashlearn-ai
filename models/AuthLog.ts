/* eslint-disable @typescript-eslint/no-explicit-any */
// models/AuthLog.ts
import { ObjectId } from 'mongodb';

/**
 * Defines the types of authentication-related events that can be logged.
 */
export enum AuthEventType {
  LOGIN = "login",
  LOGIN_FAILURE = "login_failure",
  LOGOUT = "logout",
  REGISTER = "register",
  REGISTER_FAILURE = "register_failure",
  VERIFY_EMAIL = "verify_email",
  VERIFY_EMAIL_FAILURE = "verify_email_failure",
  PASSWORD_RESET_REQUEST = "password_reset_request",
  PASSWORD_RESET_SUCCESS = "password_reset_success",
  PASSWORD_RESET_FAILURE = "password_reset_failure",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  
  // New event types for security alerts
  LOGIN_FROM_NEW_LOCATION = "login_from_new_location",
  MFA_DISABLED = "mfa_disabled",
}

/**
 * Defines the structure for an authentication log entry in the database.
 * The _id is optional because it's only present on documents retrieved from the DB.
 */
export interface AuthLog {
  _id?: ObjectId;
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
