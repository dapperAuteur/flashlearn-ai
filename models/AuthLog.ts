/* eslint-disable @typescript-eslint/no-explicit-any */
import { ObjectId } from 'mongodb';

/**
 * Defines the types of authentication-related events that can be logged.
 */
export enum AuthEventType {
  LOGIN = "login",
  LOGIN_FAILURE = "login_failure",
  REGISTER = "register",
  PASSWORD_RESET_REQUEST = "password_reset_request",
  PASSWORD_RESET_SUCCESS = "password_reset_success",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  LOGIN_FROM_NEW_LOCATION = "new_location_login",
  MFA_DISABLED = "mfa_disabled",
  SECURITY_ALERT_SENT = "security_alert_sent"
}

/**
 * Describes the structure of a log entry in the `auth_logs` collection.
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
