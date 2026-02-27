import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { EmailCampaign } from '@/models/EmailCampaign';

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

    const campaign = await EmailCampaign.findById(id).lean();
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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
        { error: 'Only draft campaigns can be updated' },
        { status: 400 }
      );
    }

    const { name, subject, htmlContent, segment } = await request.json();

    // Strip <script> tags if htmlContent is provided
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (subject !== undefined) updates.subject = subject;
    if (htmlContent !== undefined) {
      updates.htmlContent = htmlContent.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ''
      );
    }
    if (segment !== undefined) updates.segment = segment;

    const updated = await EmailCampaign.findByIdAndUpdate(id, updates, { new: true }).lean();

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
        { error: 'Only draft campaigns can be deleted' },
        { status: 400 }
      );
    }

    await EmailCampaign.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Campaign deleted' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
