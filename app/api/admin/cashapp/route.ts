import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { CashAppPayment } from '@/models/CashAppPayment';
import { User } from '@/models/User';
import { Logger, LogContext } from '@/lib/logging/logger';
import { Notification } from '@/models/Notification';
import { sendEmail } from '@/lib/email/sendEmail';
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userMap = new Map<string, { name: string; email: string }>();
    for (const u of users) {
      const user = u as any;
      userMap.set(String(user._id), { name: user.name, email: user.email });
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
      const user = await User.findByIdAndUpdate(
        payment.userId,
        { subscriptionTier: 'Lifetime Learner' },
        { new: true }
      ).select('name email');

      // In-app notification
      await Notification.create({
        userId: payment.userId,
        type: 'system',
        title: 'Lifetime membership activated!',
        message: 'Your Cash App payment has been verified. You now have lifetime access to all Pro features.',
        href: '/dashboard',
      });

      // Email notification (fire-and-forget)
      if (user?.email) {
        const baseUrl = process.env.NEXTAUTH_URL || 'https://flashlearnai.witus.online';
        const firstName = (user.name || 'there').split(' ')[0];
        sendEmail({
          to: user.email,
          subject: 'Your FlashLearnAI Lifetime membership is active!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #4A7BF7; padding: 24px 32px; border-radius: 8px 8px 0 0; text-align: center;">
                <p style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0;">FlashLearnAI.WitUS.Online</p>
              </div>
              <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
                <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 22px;">Welcome to Lifetime, ${firstName}!</h2>
                <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
                  Your Cash App payment of $${payment.amount} has been verified. Your Lifetime Learner membership is now active.
                </p>
                <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
                  You now have unlimited access to all Pro features &mdash; forever. No recurring charges.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${baseUrl}/dashboard" style="background-color: #4A7BF7; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px;">
                    Go to Dashboard
                  </a>
                </div>
              </div>
              <div style="background-color: #f9fafb; padding: 16px 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} FlashLearnAI.WitUS.Online. All rights reserved.</p>
              </div>
            </div>
          `,
        }).catch(() => { /* non-critical */ });
      }

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

      // In-app notification for rejection
      await Notification.create({
        userId: payment.userId,
        type: 'system',
        title: 'Cash App payment not verified',
        message: adminNotes
          ? `Your payment could not be verified: ${adminNotes}. Please contact support.`
          : 'Your Cash App payment could not be verified. Please contact support or try again.',
        href: '/pricing',
      });

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
