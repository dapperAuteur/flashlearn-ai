// app/api/analytics/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { UserAnalytics } from '@/models/UserAnalytics';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { event, properties } = await request.json();

    await dbConnect();

    // Track anonymous events for acquisition
    if (event === 'acquisition' && !session) {
      // Store in temporary collection or log for later attribution
      return NextResponse.json({ success: true });
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get or create user analytics record
    let analytics = await UserAnalytics.findOne({ userId });
    
    if (!analytics) {
      analytics = new UserAnalytics({
        userId,
        firstVisit: new Date(),
        acquisitionSource: properties?.source,
        acquisitionMedium: properties?.medium,
        acquisitionCampaign: properties?.campaign,
        landingPage: properties?.landingPage,
      });
    }

    // Update based on event type
    switch (event) {
      case 'page_view':
        analytics.totalSessions += 1;
        analytics.lastActive = new Date();
        break;

      case 'page_time':
        analytics.totalTimeSpent += properties?.timeSpent || 0;
        analytics.averageSessionLength = analytics.totalTimeSpent / analytics.totalSessions;
        break;

      case 'study_session_completed':
        analytics.studySessionsCompleted += 1;
        if (properties?.flashcardSetId && !analytics.flashcardSetsUsed.includes(properties.flashcardSetId)) {
          analytics.flashcardSetsUsed.push(properties.flashcardSetId);
        }
        break;

      case 'purchase_completed':
        analytics.purchaseDate = new Date();
        analytics.purchasedPlan = properties?.plan;
        analytics.conversionValue = properties?.value;
        analytics.sessionsBeforePurchase = analytics.totalSessions;
        
        // Calculate days to conversion
        const daysSinceFirstVisit = Math.round(
          (new Date().getTime() - analytics.firstVisit.getTime()) / (1000 * 60 * 60 * 24)
        );
        analytics.timeToConversion = daysSinceFirstVisit;
        break;

      case 'feature_used':
        const feature = properties?.feature;
        if (feature && !analytics.favoriteFeatures.includes(feature)) {
          analytics.favoriteFeatures.push(feature);
        }
        break;
    }

    // Update behavioral patterns
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    analytics.mostActiveTimeOfDay = currentHour;
    analytics.mostActiveDay = currentDay;

    await analytics.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}

// GET route for analytics dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const analytics = await UserAnalytics.findOne({ userId: session.user.id });
    
    return NextResponse.json(analytics || {});
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}