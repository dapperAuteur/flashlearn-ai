import { ApiKey } from '@/models/ApiKey';
import { Redis } from '@upstash/redis';
import { Logger, LogContext } from '@/lib/logging/logger';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Checks if a user has any active API key with prioritySupport enabled.
 * Cached in Redis for 5 minutes to avoid DB hits on every conversation create.
 */
export async function checkUserHasPrioritySupport(userId: string): Promise<boolean> {
  const cacheKey = `priority_support:${userId}`;

  // Check Redis cache first
  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached !== null) {
      return cached === '1';
    }
  } catch {
    // Cache miss, fall through
  }

  // Query DB
  try {
    const priorityKey = await ApiKey.findOne({
      userId,
      status: 'active',
      prioritySupport: true,
    }).select('_id').lean();

    const hasPriority = !!priorityKey;

    // Cache result
    try {
      await redis.set(cacheKey, hasPriority ? '1' : '0', { ex: CACHE_TTL_SECONDS });
    } catch {
      // Non-critical
    }

    return hasPriority;
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to check priority support status.', { userId, error });
    return false;
  }
}

/**
 * Sends a priority support notification email to the admin.
 * Uses Mailgun if configured, otherwise logs a warning.
 */
export async function notifyAdminOfPriorityConversation(
  subject: string,
  userName: string,
  userEmail: string
): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.EMAIL_FROM;
  if (!adminEmail) {
    Logger.warning(LogContext.SYSTEM, 'No admin email configured for priority support notifications.');
    return;
  }

  try {
    // Dynamic import to avoid loading Mailgun when not needed
    const formData = (await import('form-data')).default;
    const Mailgun = (await import('mailgun.js')).default;

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY || '',
    });

    await mg.messages.create(process.env.MAILGUN_DOMAIN || '', {
      from: process.env.EMAIL_FROM || 'noreply@flashlearn.ai',
      to: adminEmail,
      subject: `[PRIORITY] New support ticket: ${subject}`,
      text: `A priority support user has submitted a new ticket.\n\nUser: ${userName} (${userEmail})\nSubject: ${subject}\n\nView it in the admin panel at /admin/conversations`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #7C3AED; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">Priority Support Ticket</h2>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p><strong>User:</strong> ${userName} (${userEmail})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p style="margin-top: 20px;">
              <a href="${process.env.NEXTAUTH_URL || 'https://flashlearn.ai'}/admin/conversations"
                 style="background: #7C3AED; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View in Admin Panel
              </a>
            </p>
          </div>
        </div>
      `,
    });

    Logger.info(LogContext.SYSTEM, 'Priority support notification sent to admin.', {
      metadata: { subject, userEmail },
    });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to send priority support notification.', { error });
  }
}
