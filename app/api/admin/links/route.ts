import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/db/mongodb";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });

  if (!token || token.role !== "Admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const [challenges, sets, sessions, missingChallenges, missingSets, missingSessions] =
      await Promise.all([
        db
          .collection("challenges")
          .find({ shortLinkUrl: { $ne: null } })
          .project({
            challengeCode: 1,
            setName: 1,
            shortLinkUrl: 1,
            shortLinkId: 1,
            createdAt: 1,
          })
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray(),
        db
          .collection("flashcard_sets")
          .find({ shortLinkUrl: { $ne: null } })
          .project({
            title: 1,
            shortLinkUrl: 1,
            shortLinkId: 1,
            createdAt: 1,
          })
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray(),
        db
          .collection("studySessions")
          .find({ shortLinkUrl: { $ne: null } })
          .project({
            sessionId: 1,
            setName: 1,
            shortLinkUrl: 1,
            shortLinkId: 1,
            createdAt: 1,
          })
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray(),
        db
          .collection("challenges")
          .countDocuments({ shortLinkId: null, status: "active" }),
        db
          .collection("flashcard_sets")
          .countDocuments({ shortLinkId: null, isPublic: true }),
        db
          .collection("studySessions")
          .countDocuments({ shortLinkId: null, isShareable: true }),
      ]);

    return NextResponse.json({
      links: [
        ...challenges.map((c) => ({
          type: "versus" as const,
          label: c.challengeCode,
          subtitle: c.setName,
          shortUrl: c.shortLinkUrl,
          shortId: c.shortLinkId,
          createdAt: c.createdAt,
        })),
        ...sets.map((s) => ({
          type: "set" as const,
          label: s.title,
          subtitle: null,
          shortUrl: s.shortLinkUrl,
          shortId: s.shortLinkId,
          createdAt: s.createdAt,
        })),
        ...sessions.map((s) => ({
          type: "results" as const,
          label: s.sessionId,
          subtitle: s.setName,
          shortUrl: s.shortLinkUrl,
          shortId: s.shortLinkId,
          createdAt: s.createdAt,
        })),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      totals: {
        challenges: challenges.length,
        sets: sets.length,
        sessions: sessions.length,
      },
      missing: {
        challenges: missingChallenges,
        sets: missingSets,
        sessions: missingSessions,
      },
    });
  } catch (error) {
    console.error("[admin/links] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
