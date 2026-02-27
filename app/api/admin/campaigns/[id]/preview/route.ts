import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { EmailCampaign } from '@/models/EmailCampaign';
import { getCampaignEmailWrapper } from '@/lib/email/templates/campaign';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(
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

    const campaign = await EmailCampaign.findById(id).lean() as { htmlContent: string } | null;
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const html = getCampaignEmailWrapper({
      content: campaign.htmlContent,
      unsubscribeUrl: '#unsubscribe-preview',
    });

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error previewing campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
