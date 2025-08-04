import { sendEmail } from "@/lib/email/sendEmail";
import { getSecurityAlertEmailTemplate } from "@/lib/email/templates/securityAlert";
import { AuthLog, AuthEventType } from "@/models/AuthLog";
import { User } from "@/models/User"; // Assuming a User model exists
import { Logger, LogContext } from "@/lib/logging/logger";
import { getErrorMessage } from "../utils/getErrorMessage";

/**
 * Sends a security alert email to a user about suspicious activity.
 * @param {AuthLog} log - The authentication log entry that triggered the alert.
 * @returns {Promise<boolean>} True if the alert was sent successfully, false otherwise.
 */
export async function sendSecurityAlert(log: AuthLog): Promise<boolean> {
  try {
    let userEmail = log.email;
    let userName = "User";

    // If the log doesn't have an email but has a userId, fetch the user to get their email
    if (!userEmail && log.userId) {
      // Assuming User is a Mongoose model based on your project files
      const user = await User.findById(log.userId).select('email name');
      if (user) {
        userEmail = user.email;
        userName = user.name || "User";
      }
    }

    if (!userEmail) {
      // We can't send an alert if we don't have an email address
      Logger.error(LogContext.SYSTEM, "Cannot send security alert: No email address available for log.", { logId: log._id?.toString() });
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
      Logger.info(LogContext.AUTH, `Security alert email sent successfully.`, { to: userEmail, originalLogId: log._id?.toString() });
      return true;
    } else {
      Logger.error(LogContext.SYSTEM, "Failed to send security alert email.", { to: userEmail, error });
      return false;
    }
  } catch (error) {
    Logger.error(LogContext.SYSTEM, "An unexpected error occurred in sendSecurityAlert.", { error: getErrorMessage(error), logId: log._id?.toString() });
    return false;
  }
}

/**
 * Determines if a log event warrants a security alert and triggers it.
 * @param {AuthLog} log - The authentication log to process.
 */
export async function processSuspiciousActivity(log: AuthLog): Promise<void> {
  // These are the events that should trigger a security notification to the user
  const alertWorthyEvents: AuthEventType[] = [
    AuthEventType.SUSPICIOUS_ACTIVITY,
    AuthEventType.LOGIN_FROM_NEW_LOCATION, // This now works
    AuthEventType.PASSWORD_RESET_SUCCESS, // Changed from REQUEST to SUCCESS
    AuthEventType.MFA_DISABLED              // This now works
  ];

  if (alertWorthyEvents.includes(log.event)) {
    Logger.info(LogContext.AUTH, `Processing suspicious activity for event: ${log.event}`, { logId: log._id?.toString() });
    await sendSecurityAlert(log);
  }
}
