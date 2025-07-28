import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Verification Error | FlashLearn AI",
  description: "Email verification error",
};

export default function VerificationErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">Verification Error</h1>
          <div className="mt-6">
            <p className="text-gray-600 mb-4">
              We couldn&apos;t verify your email address. The verification link may be invalid or expired.
            </p>
            <p className="text-gray-600">
              Please try signing in again. You can request a new verification email from there.
            </p>
          </div>
          <div className="mt-6">
            <Link 
              href="/signin" 
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}