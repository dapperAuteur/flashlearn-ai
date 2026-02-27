import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ContentFlag } from '@/models/ContentFlag';
import { FlashcardSet } from '@/models/FlashcardSet';
import { User } from '@/models/User';
import { getContentWarningTemplate } from '@/lib/email/templates/contentWarning';

const secret = process.env.NEXTAUTH_SECRET;

const VALID_STATUSES = ['pending', 'reviewed', 'dismissed', 'action-taken'];
const VALID_ACTIONS = ['none', 'set-private', 'set-deleted', 'user-warned', 'user-suspended'];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { status, adminAction, adminNotes } = await request.json();

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (adminAction && !VALID_ACTIONS.includes(adminAction)) {
      return NextResponse.json({ error: 'Invalid admin action' }, { status: 400 });
    }

    await dbConnect();

    const flag = await ContentFlag.findById(id);
    if (!flag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    // Update flag fields
    if (status) flag.status = status;
    if (adminAction) flag.adminAction = adminAction;
    if (adminNotes !== undefined) flag.adminNotes = adminNotes;
    flag.reviewedBy = token.id;

    await flag.save();

    // Execute admin actions on the flashcard set and its owner
    if (adminAction && adminAction !== 'none') {
      const set = await FlashcardSet.findById(flag.setId).populate('profile');

      if (set) {
        switch (adminAction) {
          case 'set-private': {
            set.isPublic = false;
            set.isFeatured = false;
            await set.save();
            break;
          }

          case 'set-deleted': {
            await FlashcardSet.findByIdAndDelete(flag.setId);
            break;
          }

          case 'user-warned': {
            // Find the set owner via the profile
            const { Profile } = await import('@/models/Profile');
            const profile = await Profile.findById(set.profile);
            if (profile?.user) {
              const owner = await User.findById(profile.user);
              if (owner?.email) {
                try {
                  const { subject, html } = getContentWarningTemplate(
                    owner.name || 'User',
                    set.title,
                    flag.reason
                  );

                  // Use Mailgun to send the warning email
                  const formData = (await import('form-data')).default;
                  const Mailgun = (await import('mailgun.js')).default;
                  const mailgun = new Mailgun(formData);
                  const mg = mailgun.client({
                    username: 'api',
                    key: process.env.MAILGUN_API_KEY as string || '',
                  });

                  await mg.messages.create(process.env.MAILGUN_DOMAIN as string, {
                    from: process.env.EMAIL_FROM as string,
                    to: owner.email,
                    subject,
                    html,
                  });

                  console.log(`[ContentFlag] Warning email sent to ${owner.email} for set "${set.title}"`);
                } catch (emailError) {
                  console.error('[ContentFlag] Failed to send warning email:', emailError);
                  // Don't fail the whole operation if email fails
                }
              }
            }
            break;
          }

          case 'user-suspended': {
            // Find the set owner via the profile and suspend them
            const { Profile: ProfileModel } = await import('@/models/Profile');
            const ownerProfile = await ProfileModel.findById(set.profile);
            if (ownerProfile?.user) {
              await User.findByIdAndUpdate(ownerProfile.user, { suspended: true });
              console.log(`[ContentFlag] User ${ownerProfile.user} suspended for set "${set.title}"`);
            }
            break;
          }
        }
      }
    }

    return NextResponse.json({ message: 'Flag updated successfully' });
  } catch (error) {
    console.error('Error updating content flag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
