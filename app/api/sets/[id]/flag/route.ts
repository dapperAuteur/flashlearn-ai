import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { ContentFlag } from '@/models/ContentFlag';
import { FlashcardSet } from '@/models/FlashcardSet';
import { AppConfig, IAppConfig } from '@/models/AppConfig';

const VALID_REASONS = ['inappropriate', 'offensive', 'spam', 'copyright', 'other'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { reason, description } = await request.json();

    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason. Must be one of: inappropriate, offensive, spam, copyright, other' },
        { status: 400 }
      );
    }

    if (description && typeof description === 'string' && description.length > 1000) {
      return NextResponse.json(
        { error: 'Description must be 1000 characters or fewer' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify the set exists
    const set = await FlashcardSet.findById(id);
    if (!set) {
      return NextResponse.json({ error: 'Flashcard set not found' }, { status: 404 });
    }

    // Create the flag
    try {
      await ContentFlag.create({
        setId: id,
        reportedBy: session.user.id,
        reason,
        description: description || undefined,
      });
    } catch (err: unknown) {
      // Handle duplicate key error (user already flagged this set)
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        return NextResponse.json(
          { error: 'You have already reported this set' },
          { status: 409 }
        );
      }
      throw err;
    }

    // Check auto-flag threshold: if pending flags exceed threshold, auto-hide the set
    const autoFlagConfig = await AppConfig.findOne({ key: 'AUTO_FLAG_THRESHOLD' }).lean<IAppConfig>();
    const threshold = (autoFlagConfig?.value as number) || 5;

    const pendingFlagCount = await ContentFlag.countDocuments({
      setId: id,
      status: 'pending',
    });

    if (pendingFlagCount >= threshold && set.isPublic) {
      set.isPublic = false;
      await set.save();
      console.log(`[AutoFlag] Set "${set.title}" (${id}) auto-hidden after ${pendingFlagCount} pending flags.`);
    }

    return NextResponse.json({ message: 'Report submitted successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating content flag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
