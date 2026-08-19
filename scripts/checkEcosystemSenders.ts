/**
 * Inbox and Outbox connectivity smoke test.
 *
 * Sends one real, clearly-labelled submission through the same sender code the
 * app uses, then prints exactly what each receiver said. Use it when a feedback
 * item or a social draft does not turn up on the other side: it separates "we
 * never sent it" from "we sent it and the receiver refused", which the app's own
 * logs cannot do because both look like silence.
 *
 * Inbox only:
 *   npx tsx --env-file=.env.local scripts/checkEcosystemSenders.ts inbox
 * Outbox only:
 *   npx tsx --env-file=.env.local scripts/checkEcosystemSenders.ts outbox
 * Both (default):
 *   npx tsx --env-file=.env.local scripts/checkEcosystemSenders.ts
 *
 * This posts REAL rows. Inbox items are prefixed [CONNECTIVITY TEST] and outbox
 * items go as drafts, so both are safe to delete on the receiving side.
 *
 * Note it reads the same env the deployed app reads. Passing against .env.local
 * while production still fails means the values differ in Vercel, not that the
 * code is wrong.
 */
import { sendToInbox } from '../lib/inbox-sender';
import { sendToOutbox } from '../lib/sender-outbox';

const MIN_SECRET_LENGTH = 32;

interface EnvVar {
  name: string;
  value: string | undefined;
  required: boolean;
}

/** Report what is set without ever printing a secret. */
function reportEnv(label: string, vars: EnvVar[]): boolean {
  console.log(`\n--- ${label} configuration ---`);
  let ok = true;

  for (const v of vars) {
    if (!v.value) {
      console.log(`  ${v.name.padEnd(24)} MISSING${v.required ? '  <-- required' : '  (optional)'}`);
      if (v.required) ok = false;
      continue;
    }
    // Secrets are described, never shown. Length matters because the receivers
    // require at least 32 characters and a truncated paste is a common cause.
    const described = v.name.includes('SECRET')
      ? `set, ${v.value.length} chars${v.value.length < MIN_SECRET_LENGTH ? `  <-- shorter than the ${MIN_SECRET_LENGTH} the receiver requires` : ''}`
      : v.value;
    console.log(`  ${v.name.padEnd(24)} ${described}`);
    if (v.name.includes('SECRET') && v.value.length < MIN_SECRET_LENGTH) ok = false;
  }

  return ok;
}

async function checkInbox(): Promise<boolean> {
  const inboxUrl = process.env.INBOX_INGEST_URL;
  const sourceSlug = process.env.INBOX_SOURCE_SLUG;
  const hmacSecret = process.env.INBOX_INGEST_SECRET;

  const configured = reportEnv('Inbox', [
    { name: 'INBOX_INGEST_URL', value: inboxUrl, required: true },
    { name: 'INBOX_SOURCE_SLUG', value: sourceSlug, required: true },
    { name: 'INBOX_INGEST_SECRET', value: hmacSecret, required: true },
  ]);

  if (!configured) {
    console.log('\n  Skipping the send: the app skips too when any of these is missing.');
    return false;
  }

  console.log('\n  Sending a test submission...');
  try {
    const result = await sendToInbox({
      inboxUrl: inboxUrl!,
      sourceSlug: sourceSlug!,
      hmacSecret: hmacSecret!,
      submission: {
        form_type: 'flash-feedback',
        priority: 'normal',
        payload: {
          kind: 'new',
          type: 'general',
          subject: '[CONNECTIVITY TEST] Inbox sender check',
          message:
            'Sent by scripts/checkEcosystemSenders.ts to verify the signed-webhook path. Safe to delete.',
          app: 'flashlearnai',
        },
      },
    });

    if (result.ok) {
      console.log(`  OK. Receiver accepted it, id ${result.id} (HTTP ${result.status}).`);
      console.log('  If real submissions still do not arrive, the send path works and the');
      console.log('  problem is upstream: check that the deployed env matches this one.');
      return true;
    }

    console.log(`  REJECTED. HTTP ${result.status}.`);
    console.log(`  Receiver said: ${result.detail?.slice(0, 400) ?? '(empty body)'}`);
    console.log('\n  Most common causes, in order:');
    console.log(`    401/403  the slug "${sourceSlug}" is not in the receiver's INGEST_SOURCES,`);
    console.log('             or its stored secret differs from this one');
    console.log('    400      the payload shape does not match what the receiver expects');
    console.log('    404      INBOX_INGEST_URL points at the wrong path');
    return false;
  } catch (err) {
    console.log(`  REQUEST FAILED before any response: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
    console.log('  That is a DNS, TLS, or reachability problem, not a signing one.');
    return false;
  }
}

async function checkOutbox(): Promise<boolean> {
  const outboxUrl = process.env.OUTBOX_INGEST_URL;
  const sourceSlug = process.env.OUTBOX_SOURCE_SLUG;
  const hmacSecret = process.env.OUTBOX_INGEST_SECRET;

  const configured = reportEnv('Outbox', [
    { name: 'OUTBOX_INGEST_URL', value: outboxUrl, required: true },
    { name: 'OUTBOX_SOURCE_SLUG', value: sourceSlug, required: true },
    { name: 'OUTBOX_INGEST_SECRET', value: hmacSecret, required: true },
    { name: 'OUTBOX_TRIGGER_ENABLED', value: process.env.OUTBOX_TRIGGER_ENABLED, required: false },
    { name: 'PRODUCT_OWNER_USER_ID', value: process.env.PRODUCT_OWNER_USER_ID, required: false },
  ]);

  if (process.env.OUTBOX_TRIGGER_ENABLED !== 'true') {
    console.log('\n  Note: OUTBOX_TRIGGER_ENABLED is not "true", so the app will not fire');
    console.log('  drafts even though the credentials below may be fine.');
  }
  if (!process.env.PRODUCT_OWNER_USER_ID) {
    console.log('\n  Note: PRODUCT_OWNER_USER_ID is unset. fireOutboxDrafts() gates on it, so');
    console.log('  no draft fires for anybody until it matches a real user id.');
  }

  if (!configured) {
    console.log('\n  Skipping the send.');
    return false;
  }

  console.log('\n  Sending a test draft...');
  try {
    const result = await sendToOutbox({
      outboxUrl: outboxUrl!,
      sourceSlug: sourceSlug!,
      hmacSecret: hmacSecret!,
      submission: {
        external_ref: `connectivity-test-${process.pid}`,
        platform: 'bluesky',
        caption: '[CONNECTIVITY TEST] Outbox sender check. Safe to delete.',
        media_urls: [],
        scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
        as_draft: true,
      },
    });

    if (result.ok) {
      console.log(`  OK. Receiver accepted it (HTTP ${result.status}).`);
      return true;
    }

    console.log(`  REJECTED. HTTP ${result.status}.`);
    console.log(`  Receiver said: ${result.detail?.slice(0, 400) ?? '(empty body)'}`);
    return false;
  } catch (err) {
    console.log(`  REQUEST FAILED before any response: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
    return false;
  }
}

async function main(): Promise<void> {
  const which = process.argv[2];
  const runInbox = !which || which === 'inbox';
  const runOutbox = !which || which === 'outbox';

  console.log('=== WitUS ecosystem sender check ===');

  let allOk = true;
  if (runInbox) allOk = (await checkInbox()) && allOk;
  if (runOutbox) allOk = (await checkOutbox()) && allOk;

  console.log(`\n${allOk ? 'All checked senders reached their receiver.' : 'At least one sender did not get through. See above.'}`);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
