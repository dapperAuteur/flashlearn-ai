import { after } from 'next/server';
import { sendToInbox } from '@/lib/inbox-sender';
import { Logger, LogContext } from '@/lib/logging/logger';

/**
 * Send a "this article did not help, and here is why" note to the WitUS Inbox
 * (→ Triage), the same place the in-app feedback widget lands.
 *
 * Separate from `lib/feedback/inbox-mirror.ts` because that one mirrors a
 * Conversation, which requires a signed-in user. Help articles are public, and
 * the reader who most needs to tell you an article is wrong is usually the one
 * who has not signed up yet. There is no conversation to mirror, so there is no
 * conversation id in the payload; the article slug is the thread instead.
 *
 * Same `after()` discipline as the other senders: a bare floating promise is
 * killed when the serverless function freezes after the response, which is how
 * submissions were being dropped on Vercel while working in local dev. Never
 * throws. A down or unconfigured Inbox must not cost the reader their comment.
 */
interface HelpFeedbackArgs {
  slug: string;
  title: string;
  comment: string;
  /** Present only when the reader happened to be signed in. */
  submitterEmail?: string | null;
  submitterName?: string | null;
}

export function mirrorHelpFeedbackToInbox(args: HelpFeedbackArgs): void {
  const inboxUrl = process.env.INBOX_INGEST_URL;
  const sourceSlug = process.env.INBOX_SOURCE_SLUG;
  const hmacSecret = process.env.INBOX_INGEST_SECRET;

  // A silent skip is indistinguishable from a silent failure, and that
  // ambiguity is what made a dropped submission hard to diagnose last time.
  if (!inboxUrl || !sourceSlug || !hmacSecret) {
    Logger.warning(LogContext.SYSTEM, 'Help feedback mirror skipped: not configured', {
      metadata: {
        hasUrl: Boolean(inboxUrl),
        hasSourceSlug: Boolean(sourceSlug),
        hasSecret: Boolean(hmacSecret),
      },
    });
    return;
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://flashlearnai.witus.online';

  after(async () => {
    try {
      const result = await sendToInbox({
        inboxUrl,
        sourceSlug,
        hmacSecret,
        submission: {
          form_type: 'flash-help-feedback',
          priority: 'normal',
          ...(args.submitterEmail ? { submitter_email: args.submitterEmail } : {}),
          ...(args.submitterName ? { submitter_name: args.submitterName } : {}),
          payload: {
            kind: 'new',
            type: 'help-article',
            subject: `Help article not helpful: ${args.title}`,
            message: args.comment,
            article_slug: args.slug,
            app: 'flashlearnai',
            // Link to the article itself. Triage needs to read what the
            // reader read, not a list of every article.
            url: `${baseUrl}/help/${args.slug}`,
          },
        },
      });

      if (!result.ok) {
        // Source, form type and status only. Never the body or the secret.
        Logger.error(LogContext.SYSTEM, 'Help feedback rejected by Inbox', {
          metadata: {
            source: sourceSlug,
            form_type: 'flash-help-feedback',
            http_status: result.status,
            article_slug: args.slug,
          },
        });
      }
    } catch (err) {
      Logger.error(LogContext.SYSTEM, 'Help feedback request failed', {
        metadata: {
          source: sourceSlug,
          article_slug: args.slug,
          err: err instanceof Error ? err.name : 'UnknownError',
        },
      });
    }
  });
}
