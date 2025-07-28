import { sendEmail } from "@/lib/email/sendEmail";
import { getSecurityAlertEmailTemplate } from "@/lib/email/templates/securityAlert";
import { AuthLog } from "@/models/AuthLog";
import clientPromise from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";


/**
 * Send security alert email for suspicious activity
 */
export async function sendSecurityAlert(log: AuthLog): Promise<boolean> {
  try {
    // Get user's email if we only have userId
    let userEmail = log.email;
    let userName = "User";
    
    if (!userEmail && log.userId) {
      const client = await clientPromise;
      const db = client.db();
      
      const user = await db.collection("users").findOne(
        { _id: new ObjectId(log.userId) }
      );
      
      if (user) {
        userEmail = user.email;
        userName = user.name;
      }
    }
    
    if (!userEmail) {
      console.error("Cannot send security alert: No email address available");
      return false;
    }
    
    // Format timestamp
    const timestamp = new Date(log.timestamp).toLocaleString();
    
    // Send alert email
    const emailResult = await sendEmail({
      to: userEmail,
      subject: "Security Alert - Suspicious Activity Detected",
      html: getSecurityAlertEmailTemplate({
        username: userName,
        eventType: log.event.replace(/_/g, " "),
        ipAddress: log.ipAddress,
        timestamp,
        userAgent: log.userAgent
      }),
    });
    
    if (emailResult.success) {
      console.log(`Security alert email sent to ${userEmail}`);
      
      // Log that we sent an alert
      await clientPromise.then(client => 
        client.db().collection("auth_logs").insertOne({
          event: "security_alert_sent",
          userId: log.userId,
          email: userEmail,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          status: "success",
          reason: log.reason,
          metadata: { originalLogId: log._id?.toString() },
          timestamp: new Date(),
        })
      );
      
      return true;
    } else {
      console.error("Failed to send security alert email:", emailResult.error);
      return false;
    }
  } catch (error) {
    console.error("Error sending security alert:", error);
    return false;
  }
}

/**
 * Process suspicious activity log and send alerts if needed
 */
export async function processSuspiciousActivity(log: AuthLog): Promise<void> {
  // Determine if this activity warrants an alert
  const needsAlert = [
    "suspicious_activity",
    "multiple_failed_logins",
    "new_location_login",
    "password_reset",
    "mfa_disabled"
  ].includes(log.event);
  
  if (needsAlert) {
    console.log(`Processing suspicious activity: ${log.event}`);
    await sendSecurityAlert(log);
  }
}