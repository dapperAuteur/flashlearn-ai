import { after } from 'next/server';
import { sendToInbox } from '@/lib/inbox-sender';
import { Logger, LogContext } from '@/lib/logging/logger';

/**
 * Mirror an in-app support conversation (feedback/help/bug) into the WitUS
 * Inbox so BAM triages every product's submissions from one place
 * (inbox.witus.online → Triage agent). MongoDB stays the system of record;
 * this is a non-blocking side-channel. Never throws — a down or unconfigured
 * Inbox must not break the user's submission.
 *
 * Call it synchronously and ignore the return value. The network work is
 * handed to Next's `after()`, which keeps the serverless invocation alive
 * until it finishes. That detail is the whole point of this function: a bare
 * floating promise gets killed when the function freezes after the response is
 * sent, so submissions were being dropped on Vercel while working fine in
 * local dev. `lib/outbox-trigger.ts` uses the same pattern.
 */

// Conversation.type → Inbox form_type (aligns with the Triage agent's taxonomy:
// bug_report / feature_request / support_question).
const FORM_TYPE_BY_TYPE: Record<string, string> = {
  bug: 'flash-bug-report',
  feature: 'flash-feature-request',
  general: 'flash-feedback',
  praise: 'flash-praise',
};

interface MirrorArgs {
  /** Conversation.type: 'bug' | 'feature' | 'general' | 'praise' */
  type: string;
  /** Conversation subject (omitted on replies). */
  subject?: string;
  /** The message/reply body. */
  message: string;
  /** Conversation _id (the support "thread"). */
  conversationId: string;
  kind?: 'new' | 'reply';
  submitterEmail?: string | null;
  submitterName?: string | null;
}

export function mirrorFeedbackToInbox(args: MirrorArgs): void {
  const inboxUrl = process.env.INBOX_INGEST_URL;
  const sourceSlug = process.env.INBOX_SOURCE_SLUG;
  const hmacSecret = process.env.INBOX_INGEST_SECRET;

  // Side-channel mirror, not the system of record. Skip if unconfigured, but
  // say so: a silent skip here is indistinguishable from a silent failure, and
  // that ambiguity is what made a dropped submission hard to diagnose.
  if (!inboxUrl || !sourceSlug || !hmacSecret) {
    Logger.warning(LogContext.SYSTEM, 'Inbox mirror skipped: not configured', {
      metadata: {
        hasUrl: Boolean(inboxUrl),
        hasSourceSlug: Boolean(sourceSlug),
        hasSecret: Boolean(hmacSecret),
      },
    });
    return;
  }

  const formType = FORM_TYPE_BY_TYPE[args.type] ?? 'flash-feedback';
  // Triage happens in the admin console, so that is where the link should land.
  // There is no per-conversation admin route; the id travels in the payload.
  const baseUrl = process.env.NEXTAUTH_URL || 'https://flashlearnai.witus.online';

  after(async () => {
    try {
      const result = await sendToInbox({
        inboxUrl,
        sourceSlug,
        hmacSecret,
        submission: {
          form_type: formType,
          priority: args.type === 'bug' ? 'high' : 'normal',
          ...(args.submitterEmail ? { submitter_email: args.submitterEmail } : {}),
          ...(args.submitterName ? { submitter_name: args.submitterName } : {}),
          payload: {
            kind: args.kind ?? 'new',
            type: args.type,
            ...(args.subject ? { subject: args.subject } : {}),
            message: args.message,
            conversation_id: args.conversationId,
            app: 'flashlearnai',
            url: `${baseUrl}/admin/conversations`,
          },
        },
      });

      if (!result.ok) {
        // Log at most source, form_type and status. Never the body, the secret,
        // or the signature.
        Logger.error(LogContext.SYSTEM, 'Inbox mirror rejected by receiver', {
          metadata: {
            source: sourceSlug,
            form_type: formType,
            http_status: result.status,
            conversation_id: args.conversationId,
          },
        });
      }
    } catch (err) {
      Logger.error(LogContext.SYSTEM, 'Inbox mirror request failed', {
        metadata: {
          source: sourceSlug,
          form_type: formType,
          conversation_id: args.conversationId,
          err: err instanceof Error ? err.name : 'UnknownError',
        },
      });
    }
  });
}
