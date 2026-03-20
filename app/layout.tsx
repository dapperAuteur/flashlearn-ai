import { Inter } from 'next/font/google';
import './globals.css';
import type { Metadata } from 'next';
import ClientRoot from './ClientRoot';

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
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
