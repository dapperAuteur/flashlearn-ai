import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { EmailCampaign } from '@/models/EmailCampaign';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const [campaigns, total] = await Promise.all([
      EmailCampaign.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EmailCampaign.countDocuments({}),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { name, subject, htmlContent, segment } = await request.json();

    if (!name || !subject || !htmlContent || !segment) {
      return NextResponse.json(
        { error: 'name, subject, htmlContent, and segment are required' },
        { status: 400 }
      );
    }

    // Strip <script> tags from htmlContent
    const sanitizedHtml = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    await dbConnect();

    const campaign = await EmailCampaign.create({
      name,
      subject,
      htmlContent: sanitizedHtml,
      segment,
      status: 'draft',
      sentBy: token.id,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
