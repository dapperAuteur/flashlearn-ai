import {
  CheckCircle,
  Circle,
  Clock,
  Brain,
  WifiOff,
  BarChart3,
  Shield,
  Zap,
  Users,
  CreditCard,
  Megaphone,
  BookOpen,
} from 'lucide-react';

type Status = 'done' | 'in-progress' | 'planned';

interface RoadmapItem {
  title: string;
  description: string;
  status: Status;
  items: string[];
}

interface Phase {
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  features: RoadmapItem[];
}

const StatusBadge = ({ status }: { status: Status }) => {
  const config = {
    done: {
      icon: CheckCircle,
      label: 'Complete',
      className: 'bg-green-100 text-green-800',
    },
    'in-progress': {
      icon: Clock,
      label: 'In Progress',
      className: 'bg-yellow-100 text-yellow-800',
    },
    planned: {
      icon: Circle,
      label: 'Planned',
      className: 'bg-gray-100 text-gray-600',
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};

const phases: Phase[] = [
  {
    name: 'Foundation & Auth',
    icon: Shield,
    color: 'text-green-600',
    bgColor: 'from-green-500 to-green-600',
    borderColor: 'border-green-200',
    features: [
      {
        title: 'Project Foundation',
        description: 'Core infrastructure, database, and deployment.',
        status: 'done',
        items: [
          'Next.js 15 App Router with TypeScript',
          'MongoDB Atlas database integration',
          'Vercel deployment with CI/CD',
          'Tailwind CSS design system',
          'Progressive Web App (PWA) support',
        ],
      },
      {
        title: 'User Authentication',
        description: 'Secure account management with email/password.',
        status: 'done',
        items: [
          'Sign up / sign in with email & password',
          'Email verification flow',
          'Password reset via email',
          'Session management with JWT',
          'Role-based access (Student, Admin)',
        ],
      },
    ],
  },
  {
    name: 'Flashcard Management',
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-200',
    features: [
      {
        title: 'Create & Manage Sets',
        description: 'Full CRUD for flashcard sets and cards.',
        status: 'done',
        items: [
          'Create, edit, and delete flashcard sets',
          'Add/remove individual flashcards',
          'Public/private toggle per set',
          'Shareable set links with unique IDs',
          'Dashboard with all your sets',
        ],
      },
      {
        title: 'AI Content Generation',
        description: 'Generate flashcards from text using Google Gemini.',
        status: 'done',
        items: [
          'Generate cards from text prompts',
          'AI-powered front/back creation',
          'Bulk card generation',
        ],
      },
      {
        title: 'Advanced Import/Export',
        description: 'Import from files and export your data.',
        status: 'planned',
        items: [
          'CSV import with template download',
          'CSV export',
          'PDF text extraction',
          'YouTube transcript extraction',
          'Multi-image upload & OCR',
        ],
      },
    ],
  },
  {
    name: 'Study System',
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-200',
    features: [
      {
        title: 'Core Study Flow',
        description: 'Unified study experience with session tracking.',
        status: 'done',
        items: [
          'Single /study path for all users',
          'Set selection with search & filtering',
          'Flip-card study interface',
          'Self-reported correct/incorrect (Easy Mode)',
          'Session results with score & timing',
          'Shareable results with unique session IDs',
        ],
      },
      {
        title: 'Server-Side Study History',
        description: 'Persistent study history synced to the cloud.',
        status: 'done',
        items: [
          'Save sessions to MongoDB',
          'View past study sessions on dashboard',
          'Per-card performance tracking',
          'Review missed cards after each session',
        ],
      },
      {
        title: 'SM-2 Spaced Repetition',
        description: 'Science-backed algorithm for optimal review scheduling.',
        status: 'done',
        items: [
          'SM-2 algorithm (easiness factor, interval, repetitions)',
          'Per-card next review date',
          'Due cards API and dashboard widget',
          'Due card badges on study set selection',
        ],
      },
      {
        title: 'Multiple Study Modes',
        description: 'Different ways to test your knowledge.',
        status: 'planned',
        items: [
          'Multiple choice mode (Medium difficulty)',
          'Type-your-answer mode (Hard difficulty)',
          'AI-validated free-text answers',
          'Hint system with analytics tracking',
        ],
      },
    ],
  },
  {
    name: 'Offline & Sync',
    icon: WifiOff,
    color: 'text-indigo-600',
    bgColor: 'from-indigo-500 to-indigo-600',
    borderColor: 'border-indigo-200',
    features: [
      {
        title: 'Offline-First Architecture',
        description: 'Study anywhere, even without internet.',
        status: 'done',
        items: [
          'PowerSync local database (SQLite via wa-sqlite)',
          'IndexedDB for study sessions & sync queue',
          'Service worker with offline fallback page',
          'Consolidated sync service (single orchestrator)',
          'Automatic background sync on reconnection',
        ],
      },
      {
        title: 'Data Sync',
        description: 'Keep your data in sync between devices.',
        status: 'done',
        items: [
          'Pull flashcard data from server on app start',
          'Push local changes to MongoDB when online',
          'Pending change queue with retry logic',
          'Incremental sync with checkpoint tracking',
        ],
      },
      {
        title: 'Conflict Resolution',
        description: 'Handle sync conflicts gracefully.',
        status: 'planned',
        items: [
          'Side-by-side diff view for conflicts',
          'Keep Local / Keep Server / Merge options',
          'Offline indicator UI (persistent banner)',
          'Reconnection flash notification',
        ],
      },
    ],
  },
  {
    name: 'Analytics & Progress',
    icon: BarChart3,
    color: 'text-teal-600',
    bgColor: 'from-teal-500 to-teal-600',
    borderColor: 'border-teal-200',
    features: [
      {
        title: 'Student Analytics',
        description: 'Track your learning progress over time.',
        status: 'planned',
        items: [
          'Accuracy rates per set and per card',
          'Study frequency and streak tracking',
          'Performance-over-time charts',
          'Problem card identification (top 5 hardest)',
          'Study streak calendar (GitHub-style)',
        ],
      },
      {
        title: 'Celebration System',
        description: 'Stay motivated with achievements.',
        status: 'planned',
        items: [
          'Milestone celebrations (streaks, mastery)',
          'Achievement badges',
          'Progress notifications',
        ],
      },
    ],
  },
  {
    name: 'Social & Collaboration',
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'from-orange-500 to-orange-600',
    borderColor: 'border-orange-200',
    features: [
      {
        title: 'Sharing',
        description: 'Share your work with others.',
        status: 'done',
        items: [
          'Public flashcard set pages',
          'Shareable study results',
          'Share via link (copy to clipboard)',
        ],
      },
      {
        title: 'Versus Mode',
        description: 'Compete with friends and classmates.',
        status: 'planned',
        items: [
          'Async versus: share score link, others try to beat it',
          'Live versus: real-time matchmaking via Socket.IO',
          'Leaderboards by set, category, and global',
          'Time-based tiebreaker scoring',
        ],
      },
      {
        title: 'Teams & Roles',
        description: 'Classroom and group learning.',
        status: 'planned',
        items: [
          'Teacher/Parent role with student management',
          'Community Leader role with analytics',
          'Assign flashcard sets to students',
          'Cohort performance dashboards',
        ],
      },
    ],
  },
  {
    name: 'Premium & Monetization',
    icon: CreditCard,
    color: 'text-pink-600',
    bgColor: 'from-pink-500 to-pink-600',
    borderColor: 'border-pink-200',
    features: [
      {
        title: 'Subscription Management',
        description: 'Premium tiers via Stripe.',
        status: 'planned',
        items: [
          'Lifetime Learner tier ($100 one-time)',
          'Monthly & annual subscriptions',
          'Stripe checkout integration',
          'Free tier with on-device AI (TensorFlow.js)',
        ],
      },
    ],
  },
  {
    name: 'Admin & Platform',
    icon: Zap,
    color: 'text-red-600',
    bgColor: 'from-red-500 to-red-600',
    borderColor: 'border-red-200',
    features: [
      {
        title: 'Admin Dashboard',
        description: 'Platform management tools.',
        status: 'planned',
        items: [
          'Log viewer with filtering',
          'User management (roles, suspension)',
          'Analytics dashboard (new users, sessions)',
          'App configuration management',
        ],
      },
      {
        title: 'Public API',
        description: 'Third-party developer access.',
        status: 'planned',
        items: [
          'REST API with API key management',
          'Rate limiting per tier',
          'Developer documentation',
        ],
      },
    ],
  },
];

function getOverallStats() {
  let done = 0;
  let inProgress = 0;
  let planned = 0;

  for (const phase of phases) {
    for (const feature of phase.features) {
      if (feature.status === 'done') done++;
      else if (feature.status === 'in-progress') inProgress++;
      else planned++;
    }
  }

  const total = done + inProgress + planned;
  return { done, inProgress, planned, total, percent: Math.round((done / total) * 100) };
}

export default function RoadmapPage() {
  const stats = getOverallStats();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Megaphone className="h-4 w-4" />
          <span>Product Roadmap</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          What We&apos;re
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent"> Building</span>
        </h1>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          FlashLearn AI is evolving fast. Here&apos;s a transparent look at what&apos;s shipped, what&apos;s in progress, and what&apos;s coming next.
        </p>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Overall Progress</h2>
          <span className="text-sm text-gray-500">{stats.done} of {stats.total} feature areas complete</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
          <div
            className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.percent}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-700">{stats.done}</div>
            <div className="text-sm text-green-600">Complete</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-700">{stats.inProgress}</div>
            <div className="text-sm text-yellow-600">In Progress</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.planned}</div>
            <div className="text-sm text-gray-500">Planned</div>
          </div>
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-10">
        {phases.map((phase) => (
          <div key={phase.name}>
            {/* Phase header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`bg-gradient-to-br ${phase.bgColor} rounded-xl w-10 h-10 flex items-center justify-center`}>
                <phase.icon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{phase.name}</h2>
            </div>

            {/* Feature cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {phase.features.map((feature) => (
                <div
                  key={feature.title}
                  className={`bg-white rounded-xl p-5 shadow-sm border ${
                    feature.status === 'done'
                      ? 'border-green-200'
                      : feature.status === 'in-progress'
                        ? 'border-yellow-200'
                        : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{feature.description}</p>
                    </div>
                    <StatusBadge status={feature.status} />
                  </div>

                  <ul className="space-y-1.5">
                    {feature.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        {feature.status === 'done' ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : feature.status === 'in-progress' ? (
                          <Clock className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={feature.status === 'done' ? 'text-gray-700' : 'text-gray-600'}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-16 text-center text-sm text-gray-500">
        <p>This roadmap is updated as features ship. Priorities may shift based on user feedback.</p>
        <p className="mt-1">Have a feature request? We&apos;d love to hear from you.</p>
      </div>
    </div>
  );
}
