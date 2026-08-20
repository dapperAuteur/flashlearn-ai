import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { getClientIp } from '@/lib/utils/utils';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';
import { mirrorHelpFeedbackToInbox } from '@/lib/feedback/helpArticleFeedback';
import { HelpArticle } from '@/models/HelpArticle';
import { Logger, LogContext } from '@/lib/logging/logger';

/**
 * POST /api/help/:slug/feedback
 *
 * "Was this article helpful?" from the foot of a help article.
 *
 * Deliberately unauthenticated. Help articles are public, and the reader most
 * likely to know an article is wrong is the one who has not signed up yet. The
 * in-app feedback widget only renders for signed-in users, so before this route
 * existed there was no way at all for a signed-out reader to report a bad
 * article. The buttons were rendered with no handler behind them, so every
 * answer anyone ever gave was discarded on the spot.
 *
 * A count is cheap and anonymous. A comment is only asked for after a No, and
 * only that comment reaches Triage, because a bare thumbs-down is not worth a
 * ticket and a hundred of them would bury the ones that say something.
 */

const MAX_COMMENT = 2000;

const feedbackSchema = z.object({
  helpful: z.boolean(),
  comment: z.string().trim().max(MAX_COMMENT).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = getClientIp(request);

  // Generous, because a classroom shares an IP and thirty students reading the
  // same article on the same wifi are not an attack. Tight enough that nobody
  // is inflating a counter by hand.
  try {
    const limiter = getRateLimiter('help-article-feedback', 30, 600);
    const { success, reset } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many responses from this connection. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(reset) } },
      );
    }
  } catch {
    // The rate limiter being down must not cost a reader their comment.
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { helpful, comment } = parsed.data;

  try {
    await dbConnect();

    // $inc on the article, so two readers answering at once cannot overwrite
    // each other the way a read-modify-write would.
    const article = await HelpArticle.findOneAndUpdate(
      { slug, isPublished: true },
      { $inc: helpful ? { helpfulYes: 1 } : { helpfulNo: 1 } },
      { new: true, projection: { slug: 1, title: 1, helpfulYes: 1, helpfulNo: 1 } },
    ).lean<{ slug: string; title: string; helpfulYes: number; helpfulNo: number } | null>();

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    if (!helpful && comment) {
      // Signed in is the exception here, not the rule. When it happens, the
      // name and address travel so Triage can reply; when it does not, the
      // comment still goes, anonymously, rather than being dropped.
      const session = await getServerSession(authOptions);
      mirrorHelpFeedbackToInbox({
        slug: article.slug,
        title: article.title,
        comment,
        submitterEmail: session?.user?.email ?? null,
        submitterName: session?.user?.name ?? null,
      });
    }

    return NextResponse.json({
      recorded: true,
      helpfulYes: article.helpfulYes,
      helpfulNo: article.helpfulNo,
      commentSent: Boolean(!helpful && comment),
    });
  } catch (error) {
    await Logger.error(LogContext.SYSTEM, 'Help article feedback failed', {
      metadata: { slug, err: error instanceof Error ? error.name : 'UnknownError' },
    });
    return NextResponse.json({ error: 'Could not record your answer' }, { status: 500 });
  }
}
