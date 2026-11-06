'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import PublicHeader from '@/components/layout/PublicHeader';
import Footer from '@/components/layout/Footer';

// Route error boundary. It renders inside the root layout, but ClientRoot only mounts
// PublicHeader on "/", so the header and footer are rendered here (witus
// docs/shared-ui-ux-dx.md, "Error pages keep the app shell"). No error text is shown.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[route-error]', { digest: error.digest });
  }, [error]);

  return (
    <>
      <PublicHeader />
      <main id="main-content" className="min-h-[60vh] bg-white dark:bg-slate-900">
        <div role="alert" className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Something went wrong
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            This page hit an unexpected error. Try again, or head back home.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={reset}
              className="min-h-11 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              Try again
            </button>
            <Link
              href="/"
              className="min-h-11 inline-flex items-center justify-center px-6 py-3 border-2 border-slate-200 text-slate-900 dark:text-slate-100 font-semibold rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
