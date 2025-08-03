import { sendEmail } from "@/lib/email/sendEmail";
import { getSecurityAlertEmailTemplate } from "@/lib/email/templates/securityAlert";
import { AuthLog, AuthEventType } from "@/models/AuthLog"; // Correctly imported
import { User } from "@/models/User";
import { Logger, LogContext } from "@/lib/logging/logger";

/**
 * Sends a security alert email to a user about suspicious activity.
 * @param {AuthLog} log - The authentication log entry that triggered the alert.
 * @returns {Promise<boolean>} True if the alert was sent successfully, false otherwise.
 */
export async function sendSecurityAlert(log: AuthLog): Promise<boolean> {
  try {
    let userEmail = log.email;
    let userName = "User";

    if (!userEmail && log.userId) {
      const user = await User.findById(log.userId).select('email profiles').populate('profiles', 'profileName');
      if (user) {
        userEmail = user.email;
        userName = user.profiles?.[0]?.profileName || "User";
      }
    }

    if (!userEmail) {
      Logger.error(LogContext.SYSTEM, "Cannot send security alert: No email address available for log.", { logId: log._id });
      return false;
    }

    const timestamp = new Date(log.timestamp).toLocaleString();
    const eventTypeDisplay = log.event.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    const { success, error } = await sendEmail({
      to: userEmail,
      subject: "Security Alert - Suspicious Activity Detected",
      html: getSecurityAlertEmailTemplate({
        username: userName,
        eventType: eventTypeDisplay,
        ipAddress: log.ipAddress,
        timestamp,
        userAgent: log.userAgent
      }),
    });

    if (success) {
      Logger.info(LogContext.AUTH, `Security alert email sent successfully.`, { to: userEmail, originalLogId: log._id });
      return true;
    } else {
      Logger.error(LogContext.SYSTEM, "Failed to send security alert email.", { to: userEmail, error });
      return false;
    }
  } catch (error) {
    Logger.error(LogContext.SYSTEM, "An unexpected error occurred in sendSecurityAlert.", { error, logId: log._id });
    return false;
  }
}

/**
 * Determines if a log event warrants a security alert and triggers it.
 * @param {AuthLog} log - The authentication log to process.
 */
export async function processSuspiciousActivity(log: AuthLog): Promise<void> {
  // FIX: Use the AuthEventType enum for a type-safe check.
  const alertWorthyEvents: AuthEventType[] = [
    AuthEventType.SUSPICIOUS_ACTIVITY,
    AuthEventType.LOGIN_FROM_NEW_LOCATION,
    AuthEventType.PASSWORD_RESET_REQUEST,
    AuthEventType.MFA_DISABLED
  ];

  // FIX: This check is now type-safe and will not cause an error.
  if (alertWorthyEvents.includes(log.event)) {
    Logger.info(LogContext.AUTH, `Processing suspicious activity for event: ${log.event}`, { logId: log._id });
    await sendSecurityAlert(log);
  }
}
