import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { CashAppPayment } from '@/models/CashAppPayment';
import { User } from '@/models/User';
import { Logger, LogContext } from '@/lib/logging/logger';
import mongoose from 'mongoose';

// GET — list all CashApp payments with user info
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();

    const payments = await CashAppPayment.find()
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with user data
    const userIds = payments.map((p) => p.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email')
      .lean();

    const userMap = new Map<string, { name: string; email: string }>();
    for (const u of users) {
      const obj = JSON.parse(JSON.stringify(u));
      userMap.set(String(obj._id), { name: obj.name || '', email: obj.email || '' });
    }

    const enriched = payments.map((p) => ({
      ...p,
      userName: userMap.get(p.userId.toString())?.name || 'Unknown',
      userEmail: userMap.get(p.userId.toString())?.email || 'Unknown',
    }));

    const pendingCount = payments.filter((p) => p.status === 'pending').length;

    return NextResponse.json({ payments: enriched, pendingCount });
  } catch (error) {
    console.error('[admin/cashapp] GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH — approve or reject a CashApp payment
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id, action, adminNotes } = await request.json();

    if (!id || !['verify', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'id and action (verify|reject) are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const payment = await CashAppPayment.findById(id);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { error: `Payment already ${payment.status}` },
        { status: 400 }
      );
    }

    const adminId = new mongoose.Types.ObjectId(session.user.id);

    if (action === 'verify') {
      // Update payment status
      payment.status = 'verified';
      payment.verifiedBy = adminId;
      payment.verifiedAt = new Date();
      if (adminNotes) payment.adminNotes = adminNotes;
      await payment.save();

      // Upgrade user to Lifetime Learner
      await User.findByIdAndUpdate(payment.userId, {
        subscriptionTier: 'Lifetime Learner',
      });

      Logger.info(LogContext.SYSTEM, `Admin verified CashApp payment ${id}`, {
        adminId: session.user.id,
        userId: payment.userId.toString(),
        amount: payment.amount,
      });
    } else {
      // Reject
      payment.status = 'rejected';
      payment.verifiedBy = adminId;
      payment.verifiedAt = new Date();
      if (adminNotes) payment.adminNotes = adminNotes;
      await payment.save();

      Logger.info(LogContext.SYSTEM, `Admin rejected CashApp payment ${id}`, {
        adminId: session.user.id,
        userId: payment.userId.toString(),
        reason: adminNotes,
      });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('[admin/cashapp] PATCH error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
