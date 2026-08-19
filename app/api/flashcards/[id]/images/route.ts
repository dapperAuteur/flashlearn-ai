// app/api/flashcards/[id]/images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Types } from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { authOptions } from '@/lib/auth/auth';
import { Logger, LogContext } from '@/lib/logging/logger';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';
import { validateMediaFile, uploadMediaBuffer } from '@/lib/media/cloudinaryUpload';

/**
 * Card media for signed-in users. `[id]` is the flashcard SET id, because cards
 * are embedded subdocuments of a set and the set is what carries ownership.
 * The card is addressed by `cardId` and the side by `side`.
 *
 * The Cloudinary work is shared with POST /api/v1/media through
 * lib/media/cloudinaryUpload, so both paths apply the same types and size caps.
 */

type Side = 'front' | 'back';

const ALT_MAX_LENGTH = 300;

function isSide(value: unknown): value is Side {
  return value === 'front' || value === 'back';
}

interface ProfileId {
  _id: Types.ObjectId;
}

/**
 * Build the query that limits a write to sets the caller may edit. Mirrors the
 * rule PATCH /api/sets/[id] uses: the set belongs to one of the caller's
 * profiles, and an admin may act on any set.
 */
async function buildOwnerFilter(setId: string, userId: string, role?: string) {
  if (role === 'Admin') {
    return { _id: new Types.ObjectId(setId) };
  }
  const profiles = (await Profile.find({ user: new Types.ObjectId(userId) })
    .select('_id')
    .lean()) as ProfileId[];
  return {
    _id: new Types.ObjectId(setId),
    profile: { $in: profiles.map((p) => p._id) },
  };
}

interface CardMediaRow {
  _id: Types.ObjectId;
  frontImage?: string;
  backImage?: string;
  frontImageAlt?: string;
  backImageAlt?: string;
}

// POST /api/flashcards/[id]/images - attach an image to one side of one card
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = await Logger.info(LogContext.FLASHCARD, 'Card image upload request');

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      await Logger.warning(LogContext.FLASHCARD, 'Unauthorized card image upload attempt', { requestId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const rateLimiter = getRateLimiter('card-image-upload', 20, 60);
      const { success } = await rateLimiter.limit(session.user.id);
      if (!success) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
    } catch {
      // Rate limiter unavailable — proceed without rate limiting
    }

    await dbConnect();
    const setId = (await params).id;

    if (!Types.ObjectId.isValid(setId)) {
      return NextResponse.json({ error: 'Invalid set ID' }, { status: 400 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Expected multipart/form-data with file, cardId, side, and alt fields.' },
        { status: 400 }
      );
    }

    const file = form.get('file');
    const cardId = form.get('cardId');
    const side = form.get('side');
    const alt = form.get('alt');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
    }
    if (typeof cardId !== 'string' || !Types.ObjectId.isValid(cardId)) {
      return NextResponse.json({ error: 'A valid cardId is required.' }, { status: 400 });
    }
    if (!isSide(side)) {
      return NextResponse.json({ error: "Side must be 'front' or 'back'." }, { status: 400 });
    }

    // Alt text is required, not optional. The study player reads it, and an image
    // with no description is unusable for anyone on a screen reader.
    const altText = typeof alt === 'string' ? alt.trim() : '';
    if (!altText) {
      return NextResponse.json(
        { error: 'Alt text is required. Describe the image for people using a screen reader.' },
        { status: 400 }
      );
    }
    if (altText.length > ALT_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Alt text must be ${ALT_MAX_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    const check = validateMediaFile(file.type, file.size);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
    if (check.kind !== 'image') {
      return NextResponse.json(
        { error: 'Only images can be attached here. Allowed: JPG, PNG, GIF, WebP.' },
        { status: 400 }
      );
    }

    // Confirm ownership and that the card exists before spending a Cloudinary
    // upload, so a rejected request never leaves an orphaned asset behind.
    const filter = await buildOwnerFilter(setId, session.user.id, session.user.role);
    const owned = (await FlashcardSet.findOne(filter)
      .select('flashcards._id')
      .lean()) as { flashcards?: CardMediaRow[] } | null;

    if (!owned) {
      await Logger.warning(LogContext.FLASHCARD, 'Card image upload denied - set not found or not owned', {
        requestId,
        metadata: { setId, userId: session.user.id },
      });
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    const cardExists = (owned.flashcards || []).some((card) => String(card._id) === cardId);
    if (!cardExists) {
      return NextResponse.json({ error: 'Card not found in this set' }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadMediaBuffer(buffer, 'image', 'flashlearn/card-media');

    await FlashcardSet.updateOne(
      filter,
      {
        $set: {
          [`flashcards.$[card].${side}Image`]: uploaded.url,
          [`flashcards.$[card].${side}ImageAlt`]: altText,
        },
      },
      { arrayFilters: [{ 'card._id': new Types.ObjectId(cardId) }] }
    );

    await Logger.info(LogContext.FLASHCARD, 'Card image attached', {
      requestId,
      metadata: { setId, cardId, side },
    });

    return NextResponse.json(
      { url: uploaded.url, publicId: uploaded.publicId, cardId, side, alt: altText },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(LogContext.FLASHCARD, `Error attaching card image: ${errorMessage}`, {
      requestId,
      metadata: { stack: error instanceof Error ? error.stack : undefined },
    });
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

// DELETE /api/flashcards/[id]/images?cardId=...&side=front - detach an image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = await Logger.info(LogContext.FLASHCARD, 'Card image delete request');

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      await Logger.warning(LogContext.FLASHCARD, 'Unauthorized card image deletion attempt', { requestId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const setId = (await params).id;

    if (!Types.ObjectId.isValid(setId)) {
      return NextResponse.json({ error: 'Invalid set ID' }, { status: 400 });
    }

    const searchParams = new URL(request.url).searchParams;
    const cardId = searchParams.get('cardId');
    const side = searchParams.get('side');

    if (!cardId || !Types.ObjectId.isValid(cardId)) {
      return NextResponse.json({ error: 'A valid cardId is required.' }, { status: 400 });
    }
    if (!isSide(side)) {
      return NextResponse.json({ error: "Side must be 'front' or 'back'." }, { status: 400 });
    }

    const filter = await buildOwnerFilter(setId, session.user.id, session.user.role);
    const owned = (await FlashcardSet.findOne(filter)
      .select('flashcards._id flashcards.frontImage flashcards.backImage')
      .lean()) as { flashcards?: CardMediaRow[] } | null;

    if (!owned) {
      await Logger.warning(LogContext.FLASHCARD, 'Card image deletion denied - set not found or not owned', {
        requestId,
        metadata: { setId, userId: session.user.id },
      });
      return NextResponse.json({ error: 'Set not found' }, { status: 404 });
    }

    const card = (owned.flashcards || []).find((c) => String(c._id) === cardId);
    if (!card) {
      return NextResponse.json({ error: 'Card not found in this set' }, { status: 404 });
    }

    if (!card[`${side}Image`]) {
      return NextResponse.json({ error: `No ${side} image exists on this card` }, { status: 404 });
    }

    // Clear the description alongside the image. A stale alt outliving its image
    // reads to a screen reader as a description of something that is not there.
    await FlashcardSet.updateOne(
      filter,
      {
        $unset: {
          [`flashcards.$[card].${side}Image`]: '',
          [`flashcards.$[card].${side}ImageAlt`]: '',
        },
      },
      { arrayFilters: [{ 'card._id': new Types.ObjectId(cardId) }] }
    );

    await Logger.info(LogContext.FLASHCARD, 'Card image removed', {
      requestId,
      metadata: { setId, cardId, side },
    });

    return NextResponse.json({ message: 'Image deleted successfully', setId, cardId, side });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(LogContext.FLASHCARD, `Error deleting card image: ${errorMessage}`, {
      requestId,
      metadata: { stack: error instanceof Error ? error.stack : undefined },
    });
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
