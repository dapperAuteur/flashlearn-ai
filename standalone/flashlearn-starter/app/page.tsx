import Link from 'next/link';
import { branding, isFeatureEnabled } from '@/lib/branding';

export default function Home() {
  return (
    <div className="text-center py-12 sm:py-20">
      <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
        {branding.appName}
      </h1>
      <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
        {branding.tagline}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {isFeatureEnabled('generate') && (
          <FeatureCard href="/generate" title="Generate Flashcards" description="AI creates cards from any topic" />
        )}
        {isFeatureEnabled('explore') && (
          <FeatureCard href="/explore" title="Explore" description="Browse public flashcard sets" />
        )}
        {isFeatureEnabled('study') && (
          <FeatureCard href="/study" title="Study" description="Spaced repetition sessions" />
        )}
        {isFeatureEnabled('versus') && (
          <FeatureCard href="/versus" title="Versus Mode" description="Challenge friends to quiz battles" />
        )}
        {isFeatureEnabled('sets') && (
          <FeatureCard href="/sets" title="My Sets" description="Manage your flashcard collection" />
        )}
        {isFeatureEnabled('usage') && (
          <FeatureCard href="/usage" title="Usage" description="Track your API usage" />
        )}
      </div>
    </div>
  );
}

function FeatureCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href}
      className="block p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:border-blue-200 transition-all text-left">
      <h2 className="font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </Link>
  );
}
