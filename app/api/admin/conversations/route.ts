import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';

    await dbConnect();

    // Build filter
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .populate('userId', 'name email subscriptionTier')
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    // Fetch last message preview for each conversation
    const conversationsWithPreview = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({ conversationId: conv._id })
          .sort({ createdAt: -1 })
          .select('content senderRole createdAt')
          .lean() as { content: string; senderRole: string; createdAt: Date } | null;

        return {
          ...conv,
          lastMessagePreview: lastMessage
            ? {
                content:
                  lastMessage.content.length > 100
                    ? lastMessage.content.substring(0, 100) + '...'
                    : lastMessage.content,
                senderRole: lastMessage.senderRole,
                createdAt: lastMessage.createdAt,
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      conversations: conversationsWithPreview,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching admin conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
