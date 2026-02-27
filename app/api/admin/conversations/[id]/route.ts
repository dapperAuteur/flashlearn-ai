import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { getConversationReplyTemplate } from '@/lib/email/templates/conversationReply';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await dbConnect();

    const conversation = await Conversation.findById(id)
      .populate('userId', 'name email role subscriptionTier createdAt')
      .lean();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messages = await Message.find({ conversationId: id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name')
      .lean();

    // Mark as read by admin
    await Conversation.findByIdAndUpdate(id, { unreadByAdmin: false });

    return NextResponse.json({ conversation, messages });
  } catch (error) {
    console.error('Error fetching conversation:', error);
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

  const { id } = await params;

  try {
    const { status, tags } = await request.json();

    await dbConnect();

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (tags !== undefined) updateData.tags = tags;

    const conversation = await Conversation.findByIdAndUpdate(id, updateData, {
      new: true,
    }).lean();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { content, attachments } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    await dbConnect();

    const conversation = await Conversation.findById(id)
      .populate('userId', 'name email')
      .lean() as { _id: unknown; userId: { name: string; email: string } | null; subject: string } | null;

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const message = await Message.create({
      conversationId: id,
      senderId: token.id,
      senderRole: 'admin',
      content,
      attachments: attachments || [],
    });

    await Conversation.findByIdAndUpdate(id, {
      lastMessageAt: new Date(),
      unreadByUser: true,
      unreadByAdmin: false,
    });

    // Send email notification to user
    try {
      const user = conversation.userId;

      if (user?.email) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const conversationUrl = `${baseUrl}/dashboard`;

        const html = getConversationReplyTemplate({
          userName: user.name || 'there',
          adminMessage: content,
          conversationUrl,
        });

        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({
          username: 'api',
          key: process.env.MAILGUN_API_KEY as string || '',
        });

        await mg.messages.create(process.env.MAILGUN_DOMAIN as string, {
          from: process.env.EMAIL_FROM as string,
          to: user.email,
          subject: `Re: ${conversation.subject} - FlashLearn AI Support`,
          html,
        });
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error sending admin reply:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
