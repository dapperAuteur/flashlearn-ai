// app/(auth)/signin/page.tsx
import { Metadata } from "next";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign In | FlashLearn AI",
  description: "Sign in to your FlashLearn AI account",
};

export default function SignInPage({
  searchParams,
}: {
  searchParams: { verified?: string; registered?: string };
}) {
  const isVerified = searchParams.verified === "true";
  const isRegistered = searchParams.registered === "true";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {isVerified && (
        <div className="absolute top-4 left-0 right-0 mx-auto w-full max-w-md bg-green-100 p-4 rounded-md">
          <p className="text-center text-green-800">
            Your email has been verified successfully! You can now sign in.
          </p>
        </div>
      )}
      
      {isRegistered && (
        <div className="absolute top-4 left-0 right-0 mx-auto w-full max-w-md bg-blue-100 p-4 rounded-md">
          <p className="text-center text-blue-800">
            Account created successfully! Please check your email to verify your account.
          </p>
        </div>
      )}
      <SignInForm />
    </div>
  );
}