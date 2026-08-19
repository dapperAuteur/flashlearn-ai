import { NextResponse, after } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';
import { checkUserHasPrioritySupport, notifyAdminOfPriorityConversation } from '@/lib/api/prioritySupport';
import { mirrorFeedbackToInbox } from '@/lib/feedback/inbox-mirror';

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

    // Check if user has priority support via any active API key
    const hasPriority = await checkUserHasPrioritySupport(session.user.id);

    const conversation = await Conversation.create({
      userId: session.user.id,
      type: type || 'general',
      subject,
      isPriority: hasPriority,
      tags: hasPriority ? ['priority'] : [],
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

    // Notify admin immediately for priority conversations
    const user = session.user as { name?: string; email?: string };
    if (hasPriority) {
      // after() rather than a floating promise: on Vercel the invocation can
      // freeze once the response is sent, killing any work still in flight.
      after(async () => {
        try {
          await notifyAdminOfPriorityConversation(
            subject,
            user.name || 'Unknown',
            user.email || ''
          );
        } catch {
          // The email is a courtesy; the conversation is already saved.
        }
      });
    }

    // Non-blocking mirror to the WitUS Inbox (→ Triage). MongoDB stays the
    // system of record; this gets the submission into BAM's one triage view.
    mirrorFeedbackToInbox({
      type: type || 'general',
      subject,
      message,
      conversationId: conversation._id.toString(),
      kind: 'new',
      submitterEmail: user.email,
      submitterName: user.name,
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
