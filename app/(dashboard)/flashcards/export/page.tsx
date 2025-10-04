import {
  ArrowDownTrayIcon,
  BeakerIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CloudArrowUpIcon,
  CpuChipIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
// import Link from 'next/link';

const liveFeatures = [
  {
    icon: CpuChipIcon,
    title: 'AI-Powered Flashcard Generation',
    description: 'Instantly create flashcard sets from your notes, text, or by topic.',
  },
  {
    icon: CloudArrowUpIcon,
    title: 'CSV Import',
    description: 'Easily import your existing flashcard sets from a CSV file.',
  },
  {
    icon: SparklesIcon,
    title: 'Smart Study Sessions',
    description: 'Engage in interactive study sessions with multiple learning modes.',
  },
  {
    icon: ChartBarIcon,
    title: 'Study History & Results',
    description: 'Track your performance and review results from past sessions.',
  },
];

const comingSoonFeatures = [
  {
    icon: ArrowDownTrayIcon,
    title: 'Export to CSV & PDF',
    description: 'You are here! Soon, you will be able to export your sets for offline use or printing.',
  },
  {
    icon: BeakerIcon,
    title: 'Advanced Spaced Repetition (SRS)',
    description: 'An intelligent algorithm to show you cards at the perfect time to maximize retention.',
  },
  {
    icon: ClockIcon,
    title: 'More Study Modes',
    description: 'Including multiple-choice questions and timed quizzes to diversify your learning.',
  },
];

export default function ExportPage() {
  return (
    <div className="bg-gray-50/50">
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full p-3 mb-4">
            <SparklesIcon className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            What&apos;s New & What&apos;s Next
          </h1>
          <p className="mt-4 text-lg max-w-2xl mx-auto text-gray-600">
            We&apos;re constantly working to make FlashLearn AI the best learning tool for you. Here&apos;s a look at our progress.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Live Features Column */}
          <div className="space-y-6">
            <h2 className="flex items-center text-2xl font-bold text-gray-900">
              <CheckCircleIcon className="h-7 w-7 text-green-500 mr-3" />
              Available Now
            </h2>
            <div className="space-y-4">
              {liveFeatures.map((feature) => (
                <div key={feature.title} className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 bg-green-100 text-green-600 rounded-lg p-2">
                      <feature.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                      <p className="mt-1 text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coming Soon Features Column */}
          <div className="space-y-6">
            <h2 className="flex items-center text-2xl font-bold text-gray-900">
              <ClockIcon className="h-7 w-7 text-amber-500 mr-3" />
              Coming Soon
            </h2>
            <div className="space-y-4">
              {comingSoonFeatures.map((feature) => (
                <div key={feature.title} className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm opacity-80">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 bg-amber-100 text-amber-600 rounded-lg p-2">
                      <feature.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                      <p className="mt-1 text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-600">Have an idea or feedback?</p>
          <a href="mailto:flashlearnai@awews.com" className="font-semibold text-blue-600 hover:text-blue-500">
            Let us know!
          </a>
        </div>
      </div>
    </div>
  );
}