import { Suspense } from "react";
import { Metadata } from "next";
import ClaimAccountForm from "@/components/auth/ClaimAccountForm";

export const metadata: Metadata = {
  title: "Claim Your Account | FlashLearnAI.WitUS.Online",
  description:
    "Turn the account your teacher made for you into your own, and keep everything you have studied.",
};

export default function ClaimAccountPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* The form reads a ?code= link, so it needs a boundary to render statically. */}
      <Suspense fallback={<p className="text-gray-700">Loading...</p>}>
        <ClaimAccountForm />
      </Suspense>
    </div>
  );
}
