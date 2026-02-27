import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { EmailCampaign } from '@/models/EmailCampaign';
import { User } from '@/models/User';
import { sendCampaign } from '@/lib/email/campaignSender';

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id } = await params;
    await dbConnect();

    const campaign = await EmailCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft campaigns can be sent' },
        { status: 400 }
      );
    }

    // Count recipients for the segment
    const recipientQuery: Record<string, unknown> = { emailUnsubscribed: { $ne: true } };

    switch (campaign.segment) {
      case 'all':
        break;
      case 'free-tier':
        recipientQuery.subscriptionTier = 'Free';
        break;
      case 'paid':
        recipientQuery.subscriptionTier = { $ne: 'Free' };
        break;
      case 'inactive-7d':
      case 'inactive-30d':
      case 'no-sets':
      case 'no-study':
        // For complex segments, count all non-unsubscribed users as an estimate
        break;
      default:
        break;
    }

    const recipientCount = await User.countDocuments(recipientQuery);

    // Set status to sending
    await EmailCampaign.findByIdAndUpdate(id, {
      status: 'sending',
      recipientCount,
      sentAt: new Date(),
    });

    // Fire-and-forget: trigger campaign send without awaiting
    sendCampaign(id).catch((err) => {
      console.error(`Background campaign send failed for ${id}:`, err);
    });

    return NextResponse.json({
      status: 'sending',
      recipientCount,
    });
  } catch (error) {
    console.error('Error triggering campaign send:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
