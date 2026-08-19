import { Inter } from 'next/font/google';
import './globals.css';
import type { Metadata } from 'next';
import ClientRoot from './ClientRoot';
import { PostHogProvider } from '@/lib/analytics/posthog-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://flashlearnai.witus.online'),
  title: 'FlashLearnAI.WitUS.Online',
  description: 'AI-powered flashcard creation and multiplayer study challenges',
  openGraph: {
    siteName: 'FlashLearnAI.WitUS.Online',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#3B82F6" />
      </head>
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        {/* Renders nothing — it only initialises PostHog and reports route views.
            The key is read HERE, in the Server Component, and passed down; `?? null`
            is what puts the provider in its supported keyless state (local dev, and
            any deploy before NEXT_PUBLIC_POSTHOG_KEY is set) rather than initialising
            with undefined.

            Mounted here rather than inside ClientRoot on purpose: ClientRoot returns
            a loading spinner early while PowerSync initialises, so a provider inside
            it would not exist during that window and would miss the landing route
            view — permanently, on any visit where PowerSync init fails. At this level
            it covers every route group, signed in or out. Vercel Analytics stays
            where it is, inside ClientRoot, and is untouched. */}
        <PostHogProvider
          apiKey={process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null}
          apiHost="/ingest"
        />
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
