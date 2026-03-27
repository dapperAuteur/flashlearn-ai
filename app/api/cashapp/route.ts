import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { CashAppPayment } from '@/models/CashAppPayment';
import { User } from '@/models/User';
import mongoose from 'mongoose';

const LIFETIME_AMOUNT = 100;

// GET — returns current user's latest CashApp payment status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    const latest = await CashAppPayment.findOne({ userId })
      .sort({ createdAt: -1 })
      .select('status cashAppName amount createdAt')
      .lean();

    return NextResponse.json({ payment: latest || null });
  } catch (error) {
    console.error('[cashapp] GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST — submit a new CashApp payment for lifetime membership
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { cashAppName } = await request.json();

    if (!cashAppName || typeof cashAppName !== 'string' || cashAppName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please enter your Cash App display name' },
        { status: 400 }
      );
    }

    await dbConnect();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Check if user is already Lifetime
    const user = await User.findById(userId).select('subscriptionTier').lean();
    if (user && (user as { subscriptionTier?: string }).subscriptionTier === 'Lifetime Learner') {
      return NextResponse.json(
        { error: 'You already have a Lifetime membership' },
        { status: 400 }
      );
    }

    // Check for existing pending payment
    const pending = await CashAppPayment.findOne({ userId, status: 'pending' }).lean();
    if (pending) {
      return NextResponse.json(
        { error: 'You already have a pending payment. Please wait for verification.' },
        { status: 400 }
      );
    }

    const payment = await CashAppPayment.create({
      userId,
      amount: LIFETIME_AMOUNT,
      cashAppName: cashAppName.trim(),
    });

    return NextResponse.json(
      {
        id: payment._id,
        status: payment.status,
        createdAt: payment.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[cashapp] POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
