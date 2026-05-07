import { after } from "next/server";
import { createHash } from "node:crypto";
import { sendToOutbox, type OutboxPlatform } from "./sender-outbox";

const OWNER_USER_ID = process.env.PRODUCT_OWNER_USER_ID;

const PRODUCT_NAME = "FlashLearn AI";

/**
 * Fire one outbox draft per platform. Three layered gates run BEFORE any
 * network call:
 *   1. OUTBOX_TRIGGER_ENABLED env kill-switch
 *   2. BAM-only smoke gate (PRODUCT_OWNER_USER_ID)
 *   3. (Future) per-user opt-in
 *
 * `as_draft: true` always — operator reviews + schedules from /outbox/[id]
 * before anything goes live.
 */
export function fireOutboxDrafts(args: {
  triggerUserId: string;
  externalRefBase: string;
  caption: string;
  mediaUrls?: string[];
  platforms?: readonly OutboxPlatform[];
  scheduledAt?: Date;
  asDraft?: boolean;
}) {
  if (process.env.OUTBOX_TRIGGER_ENABLED !== "true") return;
  if (args.triggerUserId !== OWNER_USER_ID) return;

  const platforms = args.platforms ?? (["twitter", "bluesky", "linkedin"] as const);
  const placeholderTime =
    args.scheduledAt ?? new Date(Date.now() + 7 * 24 * 60 * 60_000);
  const asDraft = args.asDraft ?? true;

  after(async () => {
    for (const platform of platforms) {
      const result = await sendToOutbox({
        outboxUrl: process.env.OUTBOX_INGEST_URL!,
        sourceSlug: process.env.OUTBOX_SOURCE_SLUG!,
        hmacSecret: process.env.OUTBOX_INGEST_SECRET!,
        submission: {
          external_ref: `${args.externalRefBase}-${platform}`,
          platform,
          caption: args.caption,
          media_urls: args.mediaUrls ?? [],
          scheduled_at: placeholderTime.toISOString(),
          as_draft: asDraft,
        },
      });
      if (!result.ok) {
        console.error("[outbox-trigger] failed", {
          source: process.env.OUTBOX_SOURCE_SLUG,
          platform,
          external_ref_base: args.externalRefBase,
          http_status: result.status,
        });
      }
    }
  });
}

/** Stable user-id hash for external_ref. SHA-256 truncated to 8 chars. */
export function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 8);
}

/**
 * Anonymized handle for captions when posting about another user's event.
 * NEVER full email or full name. Use the user's chosen handle if any;
 * otherwise initials + 4-char hash.
 */
export function anonymizedHandle(user: {
  handle?: string | null;
  email: string;
}): string {
  if (user.handle) return `@${user.handle}`;
  const local = user.email.split("@")[0] ?? "user";
  const initials =
    local
      .split(/[._-]/)
      .map((s) => s.charAt(0).toUpperCase())
      .filter((c) => c.length > 0)
      .join("") || "U";
  const hash = createHash("sha256").update(user.email).digest("hex").slice(0, 4);
  return `${initials}-${hash}`;
}

/**
 * Cross-cutting signup trigger from triggers/signups.md. Free signups go to
 * twitter+bluesky; paid (annual/lifetime) add linkedin with welcome-tier copy.
 *
 * Skips the BAM-only gate from `fireOutboxDrafts` — every new signup fires a
 * draft (drafts don't auto-publish; BAM reviews each in /outbox/[id]).
 */
export async function fireSignupTrigger(args: {
  newUser: { id: string; handle?: string | null; email: string };
  tier: "free" | "annual" | "lifetime";
}) {
  if (process.env.OUTBOX_TRIGGER_ENABLED !== "true") return;

  const isPaid = args.tier !== "free";
  const platforms = isPaid
    ? (["twitter", "bluesky", "linkedin"] as const)
    : (["twitter", "bluesky"] as const);
  const handle = anonymizedHandle(args.newUser);
  const caption = isPaid
    ? `Welcome to ${PRODUCT_NAME}, ${handle}. ${args.tier} members unlock unlimited sets and priority recall scheduling.`
    : `${handle} just joined ${PRODUCT_NAME}.`;

  after(async () => {
    for (const platform of platforms) {
      const result = await sendToOutbox({
        outboxUrl: process.env.OUTBOX_INGEST_URL!,
        sourceSlug: process.env.OUTBOX_SOURCE_SLUG!,
        hmacSecret: process.env.OUTBOX_INGEST_SECRET!,
        submission: {
          external_ref: `${process.env.OUTBOX_SOURCE_SLUG}-signup-${args.tier}-${hashUserId(args.newUser.id)}-${platform}`,
          platform,
          caption,
          media_urls: [],
          scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
          as_draft: true,
        },
      });
      if (!result.ok) {
        console.error("[signup-trigger] failed", {
          slug: process.env.OUTBOX_SOURCE_SLUG,
          platform,
          tier: args.tier,
          http_status: result.status,
        });
      }
    }
  });
}
