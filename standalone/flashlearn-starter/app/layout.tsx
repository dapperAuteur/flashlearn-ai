import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { branding, getBrandingCSSVars } from '@/lib/branding';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: { template: `%s | ${branding.appName}`, default: branding.appName },
  description: branding.tagline,
  ...(branding.domain && { metadataBase: new URL(branding.domain) }),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cssVars = getBrandingCSSVars();

  return (
    <html lang="en">
      <head>
        {branding.faviconUrl && <link rel="icon" href={branding.faviconUrl} />}
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`} style={cssVars}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-600 focus:rounded focus:shadow">
          Skip to main content
        </a>
        <Navbar />
        <main id="main-content" className="flex-1 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
