// app/(auth)/signin/page.tsx
import { Metadata } from "next";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign In | FlashLearn AI",
  description: "Sign in to your FlashLearn AI account",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <SignInForm />
    </div>
  );
}