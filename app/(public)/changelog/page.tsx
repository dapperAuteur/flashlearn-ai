import type { Metadata } from 'next';
import {
  CheckCircle,
  Zap,
  WifiOff,
  Link2,
  Code,
  Megaphone,
  Webhook,
  GraduationCap,
  Sigma,
  Activity,
  ShieldCheck,
  Image as ImageIcon,
  Cpu,
} from 'lucide-react';

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
    version: '1.13.0',
    date: '2026-08-19',
    title: 'Proctored Study, Set Ratings, and Card Images',
    icon: GraduationCap,
    iconColor: 'text-emerald-600',
    items: [
      'Getting started checklist now appears for new accounts and remembers being dismissed, on every device. It was written months ago and never mounted, so nobody had seen it',
      'New Sharing your milestones setting. Off by default. When on, a study milestone can become a draft social post that a person reviews before anything publishes',
      'Offline study failing to start now says so, instead of showing an empty set list to someone with plenty of sets. Most often this is a private window, which cannot keep an offline copy at all',
      'Teacher-proctored study sessions: an adult runs the session and the student\'s spaced-repetition schedule is the one that advances',
      'Two authorization edges for proctoring: an active classroom the actor teaches, or a student linked to the actor\'s account. Archived classrooms do not count.',
      'GET /api/study/proctorable-students backs the picker on the study setup screen. It returns names, usernames, and classroom names, and no email addresses.',
      'Proctored sessions started offline carry their subject through the sync queue, so attribution survives a reconnect',
      'One-to-five-star ratings on public sets: one rating per person per set, with the average and count cached on the set and recomputed rather than nudged',
      'Rating a set you own is refused, since the score exists for the next browser rather than the author',
      'Attach an image to the front or back of a card from inside the app. Card media was previously reachable only through the public API.',
      '/admin/archived reassigns an archived classroom, study group, or school to a new owner, with eligibility checked per container kind',
      'Removed the /lists and /statistics placeholder pages and every link that pointed at them',
      'Retired the MongoDB-to-PowerSync migration path. Background sync already fills a fresh device with your sets, so signing in on a new browser no longer prompts for a migration you were not allowed to run.',
      'Removed the offline conflict-resolution screen and its banner. The feature never worked: the sync service watched for a 409 response that no route has ever returned, so no conflict was ever recorded and the review page was always empty. The 1.4.0 entry below describes behavior the app did not have.',
      'Corrected the offline documentation to match the code. The local set copy runs one way, server to device, on a five-minute poll, and study results upload with retry when you reconnect. There is no live streaming and no clash detection.',
      'The homepage now shows your real study numbers. Cards due, average accuracy, and streak come from the same endpoints the dashboard uses. They used to be hardcoded, so a brand new account was congratulated on a twelve-day streak.',
      'A figure on the homepage now appears only when it is yours. Every other state, including a fresh account and a request that did not land, reads "Review your due cards" or "Track your progress" with no number in it. The streak pill is only a number, so it does not render until there is a streak.',
      'Replaced the two homepage claims that had no source, "2,000+ active learners" and "4.9/5 average rating". In their place: a count of the ready-to-study sets taken from the curated content itself, the fact that every math fact is verified against the arithmetic by an automated test, and a live count of accounts that finished a session in the last 30 days. The live count is cached hourly and prints nothing at all if the count fails.',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-08-18',
    title: 'Curated Math Library, Analytics, and Account Deletion',
    icon: Sigma,
    iconColor: 'text-blue-600',
    items: [
      'Curated math library seeded into the public catalogue: 110 sets and 1,504 cards covering single-digit facts, geometry, trigonometry, and calculus',
      'Account deletion works. It soft-deletes with a 30-day grace period, then a scheduled purge splits records into delete, anonymize and retain, and pull-membership.',
      'The privacy page now describes what deletion actually does, collection by collection',
      'Archived classrooms, study groups, and schools are frozen and say so on screen, since a container is archived when its owner deletes their account',
      'PostHog product analytics on the ecosystem standard',
      'Type checks and the Jest suite now run in CI on every push and pull request, on every branch, and the suite is green',
      'Security: migrateAll now requires an Admin role, and the two unauthenticated dev routes are gone',
      'Removed every dead link and dead button in the header and on the homepage',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-08-16',
    title: 'Tracing, the E2E Gate, and Tutorials as Tests',
    icon: Activity,
    iconColor: 'text-amber-600',
    items: [
      'OpenTelemetry tracing wired to Honeycomb through @vercel/otel',
      'Playwright plus axe accessibility gate runs against real Vercel deployments, so it tests live infrastructure rather than a checkout',
      'Cleared the serious axe findings on the homepage footer, the API section, and sign-in',
      'Tutorial pipeline: the deck-flow and feedback-user specs run as tests and record their own walkthroughs, so a stale tutorial fails CI',
      'Playwright and tutorial-recording traffic is tagged synthetic and surfaced that way in traces, so it does not distort real usage',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-08-05',
    title: 'Sign in with WitUS, Health Checks, and Error Monitoring',
    icon: ShieldCheck,
    iconColor: 'text-teal-600',
    items: [
      'Sign in with WitUS single sign-on over NextAuth OIDC, off until the client id is configured',
      'Better Stack error monitoring wired through the Sentry SDK',
      'GET /api/health uptime probe that really pings MongoDB instead of returning a fixed string',
      'Global error boundary so an unhandled render failure reports rather than blanking the page',
      'Editing pass across reader-facing copy to strip machine-written phrasing',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-06-19',
    title: 'Card Media and Authored Answers',
    icon: ImageIcon,
    iconColor: 'text-pink-600',
    items: [
      'Authored multiple-choice options on a card, so the wrong answers are yours rather than generated, and reusable through the API',
      'Images on cards, with upload through POST /api/v1/media',
      'Video on cards with an in-study player',
      'Ecosystem keys now work on Sets and Study, and cards carry a per-card externalId',
      'Per-student spaced-repetition tracking for partners via externalStudentId and /v1/study/external-results',
      'Dropped duplicate Mongo indexes and hardened the connection handling',
      'Registered the Category model on every category-populating route, which fixed a set of intermittent 500s',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-06-11',
    title: 'Swappable AI Providers and Admin Configuration',
    icon: Cpu,
    iconColor: 'text-violet-600',
    items: [
      'Text generation runs through a provider layer instead of one vendor SDK. LLM_PROVIDER selects cerebras, openrouter, mistral, together, or gemini, and the default is cerebras.',
      'A separate vision provider, default mistral, handles image input, because text-only providers cannot accept images',
      'Guided, validated admin forms for app configuration, replacing free-text key and value editing',
      'FLASHCARD_MAX is wired to the admin config, a lifetime-sales toggle was added, and dead config keys were retired',
      'Audio generation is held behind a database-backed admin flag and shows as coming soon until it launches',
      'Homepage A/B testing framework rebuilt, default off',
      'Support conversations mirror into the WitUS Inbox',
      'Weekly engagement-check script for the gamification work',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-05-13',
    title: 'Press Room, Promotions, and Group Activity',
    icon: Megaphone,
    iconColor: 'text-orange-600',
    items: [
      'Press room at /press, published straight from markdown, with a tracked short link on every URL in every release',
      'Generic promotion model with an admin UI and a public read endpoint, replacing the one hardcoded promo',
      'Per-tier 30-day generation caps, with a finals-season override',
      'Announcement banner is sticky at the top and can be given an expiry that hides it automatically',
      'Activity feeds on study groups and teacher classrooms, with past events backfilled so the feeds are not empty on day one',
      'Leaderboards on classrooms and study groups, each with a group or global toggle',
      'Age gate at 13 and older on signup, and a three-email cap on study group invites',
      'Optional prompt alongside PDF, YouTube, audio, image, and text generation, so you can steer what the cards cover',
      'Social drafting triggers wired at study completion, recall milestones, challenge created and completed, public sets, signup, and new groups',
      'Study session rebuilt to a single viewport with no scrolling, and a next-card answer leak fixed',
      'Restored the review-due or study-all choice at session start',
      'Per-IP rate limit on recon-probe paths, short-circuited in middleware before any auth or database work',
      'Markdown tables render on press and blog pages',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-04-26',
    title: 'Ecosystem API & Signed Webhooks',
    icon: Webhook,
    iconColor: 'text-cyan-600',
    items: [
      'New Ecosystem API for cross-product partners: POST /sessions, POST /sessions/:id/results, GET /mastery/:childId, DELETE /children/:childId',
      'New ecosystem key type (fl_eco_) with kids:* permission group; admin-issued, separate rate-limit tier',
      'Curriculum standards library: Indiana K kindergarten standards seeded, sessions validated against framework + code',
      'Per-standard mastery rollups (exposed → practiced → demonstrated) with sticky promotion at ≥80% over last 5 first-attempts',
      'Cascade-delete: DELETE /children/:childId purges sessions, attempts, rollups, decks, deliveries. Idempotent re-delete returns 200 with count 0.',
      'Signed outbound session.completed webhooks: HMAC-SHA256, X-FlashLearn-Signature/Delivery/Event/Timestamp headers, 7-attempt exponential backoff over ~24h, dead-letter, auto-disable after 50 consecutive failures',
      'AES-256-GCM encryption-at-rest for per-endpoint signing secrets',
      'Self-service /developer/webhooks dashboard: register, rotate secrets, view delivery history, manual replay',
      'Public docs: /docs/api/ecosystem and /docs/api/webhooks',
      'OpenAPI spec extended with 4 new paths and the session.completed webhook block',
      'Powers Wanderlearn Stories (ages 4-7, Indiana Kindergarten) as its spaced-repetition + comprehension backend',
    ],
  },
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
