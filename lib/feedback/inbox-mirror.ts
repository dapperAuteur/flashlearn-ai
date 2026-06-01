import { sendToInbox } from '@/lib/inbox-sender';

/**
 * Mirror an in-app support conversation (feedback/help/bug) into the WitUS
 * Inbox so BAM triages every product's submissions from one place
 * (inbox.witus.online → Triage agent). MongoDB stays the system of record;
 * this is a non-blocking side-channel. Never throws — a down/unconfigured
 * Inbox must not break the user's submission. Call fire-and-forget (after the
 * response is returned), e.g. `mirrorFeedbackToInbox(...).catch(() => {})`.
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

export async function mirrorFeedbackToInbox(args: MirrorArgs): Promise<void> {
  const inboxUrl = process.env.INBOX_INGEST_URL;
  const sourceSlug = process.env.INBOX_SOURCE_SLUG;
  const hmacSecret = process.env.INBOX_INGEST_SECRET;

  // Side-channel mirror, not the system of record. Skip silently if unconfigured.
  if (!inboxUrl || !sourceSlug || !hmacSecret) return;

  const formType = FORM_TYPE_BY_TYPE[args.type] ?? 'flash-feedback';

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
          url: `https://flashlearn.ai/dashboard/feedback/${args.conversationId}`,
        },
      },
    });
    if (!result.ok) {
      console.error('[inbox-mirror] failed', {
        source: sourceSlug,
        form_type: formType,
        http_status: result.status,
      });
    }
  } catch (err) {
    console.error('[inbox-mirror] error', {
      source: sourceSlug,
      form_type: formType,
      err: err instanceof Error ? err.name : 'UnknownError',
    });
  }
}
