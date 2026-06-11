import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { generateBanner } from '@/lib/ai/generate';
import clientPromise from '@/lib/db/mongodb';

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();
    const client = await clientPromise;
    const db = client.db();

    // Gather app usage stats for context
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, newUsersThisWeek, totalSets, sessionsThisWeek, topSets] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('users').countDocuments({ createdAt: { $gte: weekAgo } }),
      db.collection('flashcard_sets').countDocuments({ isPublic: true }),
      db.collection('studysessions').countDocuments({ createdAt: { $gte: weekAgo } }),
      db.collection('flashcard_sets')
        .find({ isPublic: true })
        .sort({ cardCount: -1 })
        .limit(5)
        .project({ title: 1, cardCount: 1 })
        .toArray(),
    ]);

    const topSetNames = topSets.map((s) => s.title).join(', ');

    const prompt = `You are a marketing copywriter for FlashLearnAI.WitUS.Online, an AI-powered flashcard study platform. Generate a short, engaging announcement banner message (max 120 characters) based on these app stats:

- Total users: ${totalUsers}
- New users this week: ${newUsersThisWeek}
- Public flashcard sets: ${totalSets}
- Study sessions this week: ${sessionsThisWeek}
- Popular sets: ${topSetNames}

Generate 3 different banner messages. Make them feel celebratory, encouraging, or highlight trending content. No emojis.`;

    const suggestions = await generateBanner(prompt);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating banner:', error);
    return NextResponse.json({ error: 'Failed to generate announcement' }, { status: 500 });
  }
}
