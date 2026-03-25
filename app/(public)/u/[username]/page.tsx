/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import FollowButton from '@/components/social/FollowButton';
import ActivityFeed from '@/components/social/ActivityFeed';
import BadgeGrid from '@/components/social/BadgeGrid';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
import { Achievement } from '@/models/Achievement';
import { profilePageSchema, BASE_URL } from '@/lib/structured-data';
import { Users, Calendar, BookOpen, Swords, Trophy } from 'lucide-react';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  await dbConnect();
  const user = await User.findOne({ username: username.toLowerCase() })
    .select('name username bio isProfilePublic')
    .lean() as any;

  if (!user || !user.isProfilePublic) {
    return { title: 'Profile Not Found | FlashLearn AI' };
  }

  return {
    title: `${user.name} (@${user.username}) | FlashLearn AI`,
    description: user.bio || `${user.name}'s profile on FlashLearn AI`,
    openGraph: {
      title: `${user.name} (@${user.username})`,
      description: user.bio || `${user.name}'s learning profile on FlashLearn AI`,
      type: 'profile',
      url: `${BASE_URL}/u/${user.username}`,
    },
    alternates: {
      canonical: `${BASE_URL}/u/${user.username}`,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  await dbConnect();

  const user = await User.findOne({ username: username.toLowerCase() })
    .select('name username profilePicture bio studyInterests isProfilePublic showStats showActivity followersCount followingCount createdAt')
    .lean() as any;

  if (!user || !user.isProfilePublic) {
    notFound();
  }

  // Fetch achievements
  const achievements = await Achievement.find({ userId: user._id })
    .select('type title description earnedAt')
    .sort({ earnedAt: -1 })
    .lean() as any[];

  const userId = user._id.toString();

  return (
    <>
      <PublicHeader />
      <main id="main-content" className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={`${user.name}'s profile picture`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{user.name}</h1>
                <p className="text-gray-500">@{user.username}</p>
                {user.bio && (
                  <p className="text-gray-700 mt-2">{user.bio}</p>
                )}

                {/* Follow stats */}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="text-gray-600">
                    <strong className="text-gray-900">{user.followersCount || 0}</strong> followers
                  </span>
                  <span className="text-gray-600">
                    <strong className="text-gray-900">{user.followingCount || 0}</strong> following
                  </span>
                </div>

                {/* Study interests */}
                {user.studyInterests && user.studyInterests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {user.studyInterests.map((interest: string) => (
                      <span key={interest} className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Follow button */}
              <div className="sm:self-start">
                <FollowButton targetUserId={userId} />
              </div>
            </div>

            {/* Joined date */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Stats */}
          {user.showStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <BookOpen className="h-5 w-5 text-blue-500 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xs text-gray-500">Public Sets</p>
                <p className="text-lg font-bold text-gray-900">--</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <Trophy className="h-5 w-5 text-yellow-500 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xs text-gray-500">Achievements</p>
                <p className="text-lg font-bold text-gray-900">{achievements.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <Swords className="h-5 w-5 text-orange-500 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xs text-gray-500">Challenges</p>
                <p className="text-lg font-bold text-gray-900">--</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <Users className="h-5 w-5 text-purple-500 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xs text-gray-500">Followers</p>
                <p className="text-lg font-bold text-gray-900">{user.followersCount || 0}</p>
              </div>
            </div>
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h2>
              <BadgeGrid
                earnedBadges={achievements.map(a => ({
                  type: a.type,
                  title: a.title,
                  description: a.description,
                  earnedAt: a.earnedAt?.toISOString(),
                }))}
              />
            </div>
          )}

          {/* Activity Feed */}
          {user.showActivity && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <ActivityFeed username={user.username} />
            </div>
          )}
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(profilePageSchema({
              name: user.name,
              username: user.username,
              bio: user.bio,
            })),
          }}
        />
      </main>
    </>
  );
}
