// app/(auth)/signup/page.tsx
import { Metadata } from "next";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up | FlashLearn AI",
  description: "Create a new FlashLearn AI account",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <SignUpForm />
    </div>
  );
}