import { after } from "next/server";
import { createHash } from "node:crypto";
import { sendToOutbox, type OutboxPlatform } from "./sender-outbox";

const PRODUCT_NAME = "FlashLearn AI";

/**
 * Reads the per-user consent flag. Fails closed: an unreadable user, a
 * malformed id, or a database error all mean "do not post". Imported lazily so
 * that a module importing this trigger does not pull mongoose in at load time.
 */
async function hasOutboxOptIn(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const [{ default: dbConnect }, { User }] = await Promise.all([
      import("./db/dbConnect"),
      import("../models/User"),
    ]);
    await dbConnect();
    const user = (await User.findById(userId)
      .select("shareToOutboxOptIn")
      .lean()) as { shareToOutboxOptIn?: boolean } | null;
    return Boolean(user?.shareToOutboxOptIn);
  } catch (error) {
    console.error("[outbox-trigger] opt-in lookup failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Fire one outbox draft per platform. Three layered gates run BEFORE any
 * network call:
 *   1. OUTBOX_TRIGGER_ENABLED env kill-switch
 *   2. the product owner (PRODUCT_OWNER_USER_ID), for smoke runs
 *   3. or any user who set `shareToOutboxOptIn` on their account
 *
 * Gates 2 and 3 are an OR: the product owner never needs the flag, and everyone
 * else needs nothing but the flag. Gate 3 costs one indexed read, so it runs
 * inside `after()` and returns before the first network call rather than after.
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
  const isProductOwner =
    Boolean(process.env.PRODUCT_OWNER_USER_ID) &&
    args.triggerUserId === process.env.PRODUCT_OWNER_USER_ID;

  const platforms = args.platforms ?? (["twitter", "bluesky", "linkedin"] as const);
  const placeholderTime =
    args.scheduledAt ?? new Date(Date.now() + 7 * 24 * 60 * 60_000);
  const asDraft = args.asDraft ?? true;

  after(async () => {
    if (!isProductOwner && !(await hasOutboxOptIn(args.triggerUserId))) return;

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
 * twitter+bluesky; paid (monthly/annual/lifetime) add linkedin with
 * welcome-tier copy.
 *
 * Skips the BAM-only gate from `fireOutboxDrafts` — every new signup fires a
 * draft (drafts don't auto-publish; BAM reviews each in /outbox/[id]).
 */
export async function fireSignupTrigger(args: {
  newUser: { id: string; handle?: string | null; email: string };
  tier: "free" | "monthly" | "annual" | "lifetime";
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
