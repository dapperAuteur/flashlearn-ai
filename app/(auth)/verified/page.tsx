import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VERIFIED_NOTICE_COOKIE } from "@/lib/auth/verified-notice";

export const metadata: Metadata = {
  title: "Email Verified | FlashLearnAI.WitUS.Online",
  description: "Your email has been verified",
};

// Public on purpose (verification happens before sign-in), but honest: it only says "verified" to
// the browser the verify route just sent here, which carries a 2-minute notice cookie. Anyone else,
// including someone who types the URL, goes to sign-in and is told nothing.
export default async function VerifiedPage() {
  const cookieStore = await cookies();
  if (cookieStore.get(VERIFIED_NOTICE_COOKIE)?.value !== "1") redirect("/auth/signin");
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Email Verified!</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your email has been successfully verified. You can now sign in to your account.
        </p>
        <div className="mt-6">
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}