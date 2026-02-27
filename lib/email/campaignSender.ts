import formData from 'form-data';
import Mailgun from 'mailgun.js';
import dbConnect from '@/lib/db/dbConnect';
import { EmailCampaign } from '@/models/EmailCampaign';
import { User } from '@/models/User';
import { getCampaignEmailWrapper } from '@/lib/email/templates/campaign';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY as string || '',
});

const BATCH_SIZE = 50;

export async function sendCampaign(campaignId: string): Promise<void> {
  await dbConnect();

  const campaign = await EmailCampaign.findById(campaignId);
  if (!campaign || campaign.status !== 'sending') {
    console.error(`Campaign ${campaignId} not found or not in sending status`);
    return;
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Build user query based on segment
    const userQuery: Record<string, unknown> = { emailUnsubscribed: { $ne: true } };

    switch (campaign.segment) {
      case 'all':
        // No additional filter
        break;
      case 'free-tier':
        userQuery.subscriptionTier = 'Free';
        break;
      case 'paid':
        userQuery.subscriptionTier = { $ne: 'Free' };
        break;
      case 'inactive-7d': {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUserIds7d = await getActiveUserIds(sevenDaysAgo);
        userQuery._id = { $nin: activeUserIds7d };
        break;
      }
      case 'inactive-30d': {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeUserIds30d = await getActiveUserIds(thirtyDaysAgo);
        userQuery._id = { $nin: activeUserIds30d };
        break;
      }
      case 'no-sets':
        // Query all subscribed users and batch send
        break;
      case 'no-study': {
        const usersWithSessions = await getUserIdsWithStudySessions();
        userQuery._id = { $nin: usersWithSessions };
        break;
      }
      default:
        break;
    }

    const cursor = User.find(userQuery).select('email name').cursor();

    let sentCount = 0;
    let failedCount = 0;
    let batch: { email: string; name: string }[] = [];

    for await (const user of cursor) {
      batch.push({ email: user.email, name: user.name });

      if (batch.length >= BATCH_SIZE) {
        const result = await sendBatch(batch, campaign.subject, campaign.htmlContent, baseUrl);
        sentCount += result.sent;
        failedCount += result.failed;
        batch = [];

        // Update progress
        await EmailCampaign.findByIdAndUpdate(campaignId, {
          sentCount,
          failedCount,
        });
      }
    }

    // Send remaining batch
    if (batch.length > 0) {
      const result = await sendBatch(batch, campaign.subject, campaign.htmlContent, baseUrl);
      sentCount += result.sent;
      failedCount += result.failed;
    }

    // Mark campaign as sent
    await EmailCampaign.findByIdAndUpdate(campaignId, {
      status: 'sent',
      sentCount,
      failedCount,
      completedAt: new Date(),
    });

    console.log(`Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);
  } catch (error) {
    console.error(`Campaign ${campaignId} failed:`, error);
    await EmailCampaign.findByIdAndUpdate(campaignId, {
      status: 'failed',
    });
  }
}

async function sendBatch(
  recipients: { email: string; name: string }[],
  subject: string,
  htmlContent: string,
  baseUrl: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${Buffer.from(recipient.email).toString('base64')}`;
      const html = getCampaignEmailWrapper({
        content: htmlContent,
        unsubscribeUrl,
      });

      await mg.messages.create(process.env.MAILGUN_DOMAIN as string, {
        from: process.env.EMAIL_FROM as string,
        to: recipient.email,
        subject,
        html,
      });

      sent++;
    } catch (error) {
      console.error(`Failed to send to ${recipient.email}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

async function getActiveUserIds(since: Date): Promise<string[]> {
  const { default: mongoose } = await import('mongoose');
  const db = mongoose.connection.db;
  if (!db) return [];

  const results = await db.collection('studySessions').aggregate([
    { $match: { startTime: { $gte: since } } },
    { $group: { _id: '$userId' } },
  ]).toArray();

  return results.map((r) => r._id);
}

async function getUserIdsWithStudySessions(): Promise<string[]> {
  const { default: mongoose } = await import('mongoose');
  const db = mongoose.connection.db;
  if (!db) return [];

  const results = await db.collection('studySessions').aggregate([
    { $group: { _id: '$userId' } },
  ]).toArray();

  return results.map((r) => r._id);
}
