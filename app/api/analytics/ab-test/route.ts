// app/api/analytics/ab-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import dbConnect from "@/lib/db/dbConnect";
import { ABTestEvent } from "@/models/ABTestEvent";
import {
  HOME_AB_TEST_NAME,
  isHomeAbEvent,
  isHomeAbTestEnabled,
  normalizeHomeVariant,
  HOME_VARIANTS,
  type HomeVariant,
} from "@/lib/analytics/ab-test";

function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? undefined;
}

/** Keep stored strings bounded so a hostile client can't bloat the collection. */
function clamp(value: unknown, max: number): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value.slice(0, max);
}

// POST — record a single view or CTA click. Open to anonymous visitors (the
// homepage is public); the userId is attached only when a session exists.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const variant = normalizeHomeVariant(body?.variant);

    if (!isHomeAbEvent(body?.event)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    const sessionId = clamp(body?.sessionId, 100);
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    await dbConnect();
    const session = await getServerSession(authOptions);

    await ABTestEvent.create({
      test: clamp(body?.test, 64) ?? HOME_AB_TEST_NAME,
      variant,
      event: body.event,
      sessionId,
      userId: session?.user?.id || undefined,
      referrer: clamp(body?.referrer, 512),
      userAgent: clamp(request.headers.get("user-agent"), 512),
      ip: getClientIp(request),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("AB test POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

interface VariantStats {
  variant: HomeVariant;
  views: number;
  signups: number;
  signins: number;
  generates: number;
  studies: number;
  dashboards: number;
  conversionRate: number; // signups / views, as a percentage
  engagementRate: number; // (generates + studies) / views, as a percentage
}

// GET — admin-only aggregated results for one test. Counting happens in the
// database, not by streaming raw events to the client.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const test = searchParams.get("test") || HOME_AB_TEST_NAME;

    await dbConnect();

    const grouped = (await ABTestEvent.aggregate([
      { $match: { test } },
      { $group: { _id: { variant: "$variant", event: "$event" }, count: { $sum: 1 } } },
    ])) as Array<{ _id: { variant: string; event: string }; count: number }>;

    const stats: Record<HomeVariant, VariantStats> = HOME_VARIANTS.reduce(
      (acc, variant) => {
        acc[variant] = {
          variant,
          views: 0,
          signups: 0,
          signins: 0,
          generates: 0,
          studies: 0,
          dashboards: 0,
          conversionRate: 0,
          engagementRate: 0,
        };
        return acc;
      },
      {} as Record<HomeVariant, VariantStats>,
    );

    for (const row of grouped) {
      const variant = normalizeHomeVariant(row._id.variant);
      const bucket = stats[variant];
      switch (row._id.event) {
        case "view":
          bucket.views += row.count;
          break;
        case "signup_click":
          bucket.signups += row.count;
          break;
        case "signin_click":
          bucket.signins += row.count;
          break;
        case "generate_click":
          bucket.generates += row.count;
          break;
        case "study_click":
          bucket.studies += row.count;
          break;
        case "dashboard_click":
          bucket.dashboards += row.count;
          break;
      }
    }

    const variants = Object.values(stats).map((s) => {
      if (s.views > 0) {
        s.conversionRate = (s.signups / s.views) * 100;
        s.engagementRate = ((s.generates + s.studies) / s.views) * 100;
      }
      return s;
    });

    const totalViews = variants.reduce((sum, v) => sum + v.views, 0);

    return NextResponse.json({
      test,
      enabled: isHomeAbTestEnabled(),
      variants,
      totalViews,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AB test GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
