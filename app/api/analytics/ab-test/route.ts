// app/api/analytics/ab-test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import mongoose from 'mongoose';

export interface ABTestEvent {
  variant: 'A' | 'B' | 'C';
  event: 'view' | 'signup_click' | 'signin_click' | 'generate_click' | 'study_click' | 'dashboard_click';
  timestamp: number;
  userId?: string;
  sessionId: string;
  userAgent?: string;
  referrer?: string;
}

interface DatabaseEvent {
  variant: 'A' | 'B' | 'C';
  event: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  userAgent?: string;
  referrer?: string;
  ip?: string;
  createdAt: Date;
}

// Mongoose Schema for AB Test Events
const ABTestEventSchema = new mongoose.Schema<DatabaseEvent>({
  variant: { type: String, required: true, enum: ['A', 'B', 'C'] },
  event: { type: String, required: true },
  timestamp: { type: Number, required: true },
  sessionId: { type: String, required: true },
  userId: { type: String, required: false },
  userAgent: { type: String, required: false },
  referrer: { type: String, required: false },
  ip: { type: String, required: false },
  createdAt: { type: Date, default: Date.now }
});

// Create model or use existing
const ABTestEventModel = mongoose.models.ABTestEvent || mongoose.model<DatabaseEvent>('ABTestEvent', ABTestEventSchema);

function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    const body: ABTestEvent = await request.json();

    // Validate the data
    if (!body.variant || !body.event || !body.sessionId || !body.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Create the analytics document
    const analyticsEvent = new ABTestEventModel({
      variant: body.variant,
      event: body.event,
      timestamp: body.timestamp,
      sessionId: body.sessionId,
      userId: session?.user?.id || undefined,
      userAgent: body.userAgent || undefined,
      referrer: body.referrer || undefined,
      ip: getClientIP(request) || undefined,
      createdAt: new Date()
    });

    // Save to database
    await analyticsEvent.save();

    return NextResponse.json({ success: true }, { status: 201 });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    // Only allow authenticated users to view analytics
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const variant = searchParams.get('variant');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query filter
    interface FilterType {
      variant?: string;
      timestamp?: {
        $gte?: Date;
        $lte?: Date;
      };
    }
    
    const filter: FilterType = {};
    
    if (variant && ['A', 'B', 'C'].includes(variant)) {
      filter.variant = variant;
    }

    if (startDate) {
      filter.timestamp = { $gte: new Date(startDate) };
    }

    if (endDate) {
      filter.timestamp = { 
        ...filter.timestamp, 
        $lte: new Date(endDate) 
      };
    }

    // Get analytics data using Mongoose
    const events = await ABTestEventModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(1000)
      .lean();

    // Calculate summary stats
    type VariantStats = {
      views: number;
      signups: number;
      generates: number;
      studies: number;
    };

    const summary: Record<'A' | 'B' | 'C', VariantStats> = {
      A: { views: 0, signups: 0, generates: 0, studies: 0 },
      B: { views: 0, signups: 0, generates: 0, studies: 0 },
      C: { views: 0, signups: 0, generates: 0, studies: 0 }
    };

    events.forEach(event => {
      const variant = event.variant as 'A' | 'B' | 'C';
      const eventType = event.event as string;
      
      if (summary[variant]) {
        switch (eventType) {
          case 'view':
            summary[variant].views++;
            break;
          case 'signup_click':
            summary[variant].signups++;
            break;
          case 'generate_click':
            summary[variant].generates++;
            break;
          case 'study_click':
            summary[variant].studies++;
            break;
        }
      }
    });

    return NextResponse.json({
      events: events.map(e => ({
        ...e,
        _id: e._id?.toString()
      })),
      summary,
      totalEvents: events.length
    });

  } catch (error) {
    console.error('Analytics GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}