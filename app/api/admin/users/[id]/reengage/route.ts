import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
import { getReengagementTemplate } from '@/lib/email/templates/reengagement';
import formData from 'form-data';
import Mailgun from 'mailgun.js';

const secret = process.env.NEXTAUTH_SECRET;

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY as string || '',
});

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
    const body = await request.json();
    const { template } = body;

    if (!template || !['we-miss-you', 'new-features', 'study-reminder'].includes(template)) {
      return NextResponse.json(
        { error: 'Invalid template. Must be one of: we-miss-you, new-features, study-reminder' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findById(id).select('name email emailUnsubscribed');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.emailUnsubscribed) {
      return NextResponse.json(
        { error: 'User has unsubscribed from emails' },
        { status: 400 }
      );
    }

    const { subject, html } = getReengagementTemplate(template, user.name);

    await mg.messages.create(process.env.MAILGUN_DOMAIN as string, {
      from: process.env.EMAIL_FROM as string,
      to: user.email,
      subject,
      html,
    });

    return NextResponse.json({
      success: true,
      message: `Re-engagement email (${template}) sent to ${user.email}`,
    });
  } catch (error) {
    console.error('Error sending re-engagement email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
