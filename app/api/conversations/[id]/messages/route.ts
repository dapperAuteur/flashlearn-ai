import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';
import { mirrorFeedbackToInbox } from '@/lib/feedback/inbox-mirror';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await dbConnect();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messages = await Message.find({ conversationId: id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name')
      .lean();

    // Mark conversation as read by user
    await Conversation.findByIdAndUpdate(id, { unreadByUser: false });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { content, attachments } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    await dbConnect();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const message = await Message.create({
      conversationId: id,
      senderId: session.user.id,
      senderRole: 'user',
      content,
      attachments: attachments || [],
    });

    await Conversation.findByIdAndUpdate(id, {
      lastMessageAt: new Date(),
      unreadByAdmin: true,
    });

    // Non-blocking mirror of the user's reply to the WitUS Inbox (→ Triage).
    // This route only ever creates user messages (senderRole 'user'); admin
    // replies go through a separate admin path, so nothing to skip here.
    const user = session.user as { name?: string; email?: string };
    mirrorFeedbackToInbox({
      type: conversation.type,
      subject: conversation.subject,
      message: content,
      conversationId: id,
      kind: 'reply',
      submitterEmail: user.email,
      submitterName: user.name,
    }).catch(() => {});

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
