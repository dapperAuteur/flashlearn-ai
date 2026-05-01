import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import { BASE_URL } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Privacy Policy | FlashLearn AI',
  description: 'Privacy policy for FlashLearn AI. Learn how we collect, use, and protect your data.',
  openGraph: {
    title: 'Privacy Policy | FlashLearn AI',
    description: 'Learn how FlashLearn AI collects, uses, and protects your data.',
    type: 'website',
    url: `${BASE_URL}/privacy`,
  },
  alternates: {
    canonical: `${BASE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <>
      <PublicHeader />
      <main id="main-content" className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: March 25, 2026</p>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 prose prose-gray max-w-none">
            <h2>1. Information We Collect</h2>
            <p>When you create an account on FlashLearn AI, we collect:</p>
            <ul>
              <li><strong>Account information:</strong> name, email address, username, and password (hashed)</li>
              <li><strong>Profile information:</strong> profile picture, bio, study interests (optional)</li>
              <li><strong>Usage data:</strong> study sessions, flashcard sets, quiz results, and learning analytics</li>
              <li><strong>Payment information:</strong> processed securely through Stripe; we do not store card numbers</li>
              <li><strong>Device information:</strong> browser type, IP address, and device identifiers for security</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and improve the FlashLearn AI service</li>
              <li>Generate AI-powered flashcards and personalize your learning experience</li>
              <li>Calculate spaced repetition schedules and study analytics</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send important account notifications (verification, password resets)</li>
              <li>Send marketing communications (only with your consent; you can unsubscribe anytime)</li>
              <li>Detect and prevent fraud, abuse, and security threats</li>
            </ul>

            <h2>3. AI-Generated Content</h2>
            <p>
              When you submit content for flashcard generation (text, PDFs, YouTube URLs, audio, or images),
              this content is processed by our AI service (Google Gemini) to create flashcards. We do not use
              your submitted content to train AI models. Generated flashcards are stored in your account and
              can be made public or kept private at your discretion.
            </p>

            <h2>4. Data Sharing</h2>
            <p>We do not sell your personal information. We share data only with:</p>
            <ul>
              <li><strong>Service providers:</strong> Stripe (payments), Cloudinary (image storage), Mailgun/Resend (email), Google (AI generation), Upstash (caching)</li>
              <li><strong>Other users:</strong> only information you choose to make public (public profile, public flashcard sets, versus challenge results)</li>
              <li><strong>Law enforcement:</strong> only when legally required</li>
            </ul>

            <h2>5. Data Storage &amp; Security</h2>
            <p>
              Your data is stored securely in MongoDB Atlas with encryption at rest and in transit. Passwords
              are hashed using bcrypt. We implement rate limiting, IP monitoring, and authentication logging
              to protect your account.
            </p>

            <h2>6. Offline Data</h2>
            <p>
              FlashLearn AI supports offline study through local data storage (IndexedDB/PowerSync). Offline
              data is stored only on your device and synced to our servers when you reconnect. You can clear
              offline data at any time through your browser settings.
            </p>

            <h2>7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Export your flashcard data</li>
              <li>Opt out of marketing communications</li>
              <li>Control profile visibility (public/private)</li>
            </ul>

            <h2>8. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We use analytics cookies
              (Vercel Analytics) to understand how the app is used. You can control cookies through your
              browser settings.
            </p>

            <h2>9. Children&apos;s Privacy</h2>
            <p>
              <strong>FlashLearn AI is for users 13 and older.</strong> We do not knowingly collect data
              from children under 13. Signup begins with an age self-attestation step; selecting &quot;under
              13&quot; closes the signup flow before any name, email, or other information is collected
              or saved. If you believe a child under 13 has created an account, contact us at the
              address below and we will delete the account and any associated data.
            </p>
            <p>
              A privacy-safe version with school-authorized access for users under 13 is in development
              and will launch separately with the additional consent and data-handling protections that
              COPPA, FERPA, and applicable state laws require.
            </p>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of significant changes
              via email or in-app notification. Continued use of the service after changes constitutes
              acceptance of the updated policy.
            </p>

            <h2>11. Contact</h2>
            <p>
              For privacy-related questions or data requests, please use our in-app feedback system or
              visit our <a href="/contact">contact page</a>.
            </p>

            <p className="text-sm text-gray-500 mt-8">
              FlashLearn AI is a product of WitUS.Online, a B4C LLC property.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
