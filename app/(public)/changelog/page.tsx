import type { Metadata } from 'next';
import { CheckCircle, Zap, WifiOff, Link2, Code, Megaphone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'See what\'s new in FlashLearnAI. Feature releases, improvements, and fixes.',
  openGraph: {
    title: 'FlashLearnAI Changelog',
    description: 'Feature releases, improvements, and fixes.',
  },
};

interface Release {
  version: string;
  date: string;
  title: string;
  icon: React.ElementType;
  iconColor: string;
  items: string[];
}

const releases: Release[] = [
  {
    version: '1.5.0',
    date: '2026-03-25',
    title: 'Marketing & Link Tracking',
    icon: Link2,
    iconColor: 'text-blue-600',
    items: [
      'Switchy.io tracked short links on all versus challenges, public sets, and shared results',
      'Marketing pixel tracking (Facebook, GA4, TikTok, Twitter, and more) on every shared link',
      'Admin /admin/links dashboard with link analytics, type filtering, and missing link counts',
      'One-click backfill for existing content without short links',
      'UTM parameter passthrough for full attribution tracking across Twitter, Facebook, email, and native sharing',
      'Share modals automatically prefer short URLs with graceful fallback to full URLs',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-03-25',
    title: 'Offline Conflict Resolution',
    icon: WifiOff,
    iconColor: 'text-indigo-600',
    items: [
      'Automatic conflict detection when offline edits clash with server changes',
      'Side-by-side diff view at /dashboard/conflicts showing local vs server versions',
      'Keep Local or Keep Server resolution options with one-click resolution',
      'Red conflict banner on the offline indicator with direct "Review" link',
      'Toast notifications when conflicts are detected during sync',
      'Conflict queue stored in IndexedDB for offline-first access',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-03-25',
    title: 'White-Label Starter App Complete',
    icon: Code,
    iconColor: 'text-cyan-600',
    items: [
      'Full Next.js study app powered entirely by the Public API',
      'Single-file branding config for name, colors, logo, and feature toggles',
      'Visual branding editor at /admin/branding with live preview',
      'SEO config editor with Google search preview for all pages',
      'One-click Vercel deploy button for schools and organizations',
      '21 pages covering generate, sets, explore, study, versus, and usage',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-20',
    title: 'Social & Collaboration',
    icon: Megaphone,
    iconColor: 'text-orange-600',
    items: [
      'Public user profiles at /u/username with bio, achievements, and activity feed',
      'Follow/follower system with privacy controls',
      'Study teams with join codes, shared sets, and team chat',
      'Teacher-led classrooms with student management and analytics',
      'Help center with searchable articles and admin knowledge base',
      'Getting started onboarding wizard for new users',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-15',
    title: 'Public API & Developer Platform',
    icon: Zap,
    iconColor: 'text-purple-600',
    items: [
      '23 REST endpoints for generation, sets, study, and versus mode',
      '4 API key types with per-key rate limits and IP allowlisting',
      'Interactive API docs at /docs/api with OpenAPI 3.1 spec',
      'Webhook notifications at usage milestones (50/75/90/100%)',
      'Overage billing via Stripe metered usage',
      'Developer portal with key management and usage analytics',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-01',
    title: 'Initial Release',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    items: [
      'AI flashcard generation from topics, PDFs, YouTube, audio, and images',
      'Three study modes: Classic, Multiple Choice, Type Your Answer',
      'SM-2 spaced repetition algorithm with per-card scheduling',
      'Versus mode with composite scoring and ELO ratings',
      'Offline-first with PowerSync and IndexedDB',
      'Stripe subscriptions: Pro ($10/mo) and Lifetime ($100)',
      'Admin dashboard with analytics, moderation, and user management',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Changelog</h1>
        <p className="text-base sm:text-lg text-gray-600">
          What&apos;s new in FlashLearnAI. Feature releases, improvements, and fixes.
        </p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-gray-200" aria-hidden="true" />

        <div className="space-y-10" role="list" aria-label="Release history">
          {releases.map((release) => {
            const Icon = release.icon;
            return (
              <div key={release.version} className="relative pl-12 sm:pl-16" role="listitem">
                {/* Timeline dot */}
                <div
                  className="absolute left-2 sm:left-4 w-5 h-5 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center"
                  aria-hidden="true"
                >
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${release.iconColor} flex-shrink-0`} aria-hidden="true" />
                      <h2 className="text-lg font-bold text-gray-900">{release.title}</h2>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">v{release.version}</span>
                      <time dateTime={release.date}>
                        {new Date(release.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </time>
                    </div>
                  </div>

                  <ul className="space-y-1.5">
                    {release.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
