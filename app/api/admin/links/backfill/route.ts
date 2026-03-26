import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/db/mongodb";
import { createShortLink, toSwitchySlug } from "@/lib/switchy";

const secret = process.env.NEXTAUTH_SECRET;
const BATCH_SIZE = 100;
const DELAY_MS = 150; // ~400/min, well under 1000/hr limit

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });

  if (!token || token.role !== "Admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const siteUrl =
    process.env.NEXTAUTH_URL || "https://flashlearnai.witus.online";

  try {
    const client = await clientPromise;
    const db = client.db();

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // 1. Backfill active challenges without short links
    const challenges = await db
      .collection("challenges")
      .find({ shortLinkId: null, status: "active" })
      .project({ _id: 1, challengeCode: 1, setName: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    for (const c of challenges) {
      processed++;
      const link = await createShortLink({
        url: `${siteUrl}/versus/preview/${c.challengeCode}`,
        slug: toSwitchySlug("v", c.challengeCode.toLowerCase()),
        title: `FlashLearn Challenge: ${c.setName}`,
        description: `Join this flashcard battle on ${c.setName}!`,
        tags: ["versus", "challenge"],
      });
      if (link) {
        await db
          .collection("challenges")
          .updateOne(
            { _id: c._id },
            { $set: { shortLinkId: link.id, shortLinkUrl: link.short_url } }
          );
        succeeded++;
      } else {
        failed++;
      }
      await delay(DELAY_MS);
    }

    // 2. Backfill public sets without short links
    const sets = await db
      .collection("flashcard_sets")
      .find({ shortLinkId: null, isPublic: true })
      .project({ _id: 1, title: 1, description: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    for (const s of sets) {
      processed++;
      const link = await createShortLink({
        url: `${siteUrl}/sets/${s._id}`,
        slug: toSwitchySlug("s", s.title || String(s._id)),
        title: `FlashLearn: ${s.title}`,
        description: s.description || "Study this flashcard set on FlashLearnAI",
        tags: ["set", "flashcards"],
      });
      if (link) {
        await db
          .collection("flashcard_sets")
          .updateOne(
            { _id: s._id },
            { $set: { shortLinkId: link.id, shortLinkUrl: link.short_url } }
          );
        succeeded++;
      } else {
        failed++;
      }
      await delay(DELAY_MS);
    }

    // 3. Backfill shareable sessions without short links
    const sessions = await db
      .collection("studySessions")
      .find({ shortLinkId: null, isShareable: true })
      .project({ _id: 1, sessionId: 1, setName: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    for (const s of sessions) {
      processed++;
      const link = await createShortLink({
        url: `${siteUrl}/results/${s.sessionId}`,
        slug: toSwitchySlug("r", s.sessionId),
        title: `FlashLearn Study Results${s.setName ? `: ${s.setName}` : ""}`,
        description: "Check out my study session results on FlashLearnAI!",
        tags: ["results", "study"],
      });
      if (link) {
        await db
          .collection("studySessions")
          .updateOne(
            { _id: s._id },
            { $set: { shortLinkId: link.id, shortLinkUrl: link.short_url } }
          );
        succeeded++;
      } else {
        failed++;
      }
      await delay(DELAY_MS);
    }

    return NextResponse.json({ processed, succeeded, failed });
  } catch (error) {
    console.error("[admin/links/backfill] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
