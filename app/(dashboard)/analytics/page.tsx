import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics | FlashLearn AI",
  description: "Track your learning progress",
};

export default async function AnalyticsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-gray-600">
          Track your learning progress and performance metrics.
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
