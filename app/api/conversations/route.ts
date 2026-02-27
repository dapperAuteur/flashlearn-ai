import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    const conversations = await Conversation.find({ userId: session.user.id })
      .sort({ lastMessageAt: -1 })
      .lean();

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, subject, message, attachments } = await request.json();

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const conversation = await Conversation.create({
      userId: session.user.id,
      type: type || 'general',
      subject,
      lastMessageAt: new Date(),
      unreadByAdmin: true,
      unreadByUser: false,
    });

    await Message.create({
      conversationId: conversation._id,
      senderId: session.user.id,
      senderRole: 'user',
      content: message,
      attachments: attachments || [],
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
