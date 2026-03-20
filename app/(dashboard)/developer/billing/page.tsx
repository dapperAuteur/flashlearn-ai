"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Check, ArrowRight, ExternalLink } from "lucide-react";

const API_PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "100 generations/month",
      "1,000 API calls/month",
      "2 API keys",
      "10 req/min burst limit",
    ],
    cta: "Current Plan",
    disabled: true,
  },
  {
    key: "developer",
    name: "Developer",
    price: "$19",
    period: "/month",
    features: [
      "5,000 generations/month",
      "50,000 API calls/month",
      "5 API keys",
      "60 req/min burst limit",
      "$0.005/gen overage",
    ],
    cta: "Upgrade to Developer",
    highlighted: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$49",
    period: "/month",
    features: [
      "25,000 generations/month",
      "250,000 API calls/month",
      "10 API keys",
      "120 req/min burst limit",
      "$0.003/gen overage",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [currentTier, setCurrentTier] = useState("Free");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
    if (searchParams.get("canceled") === "true") {
      setShowCanceled(true);
      setTimeout(() => setShowCanceled(false), 5000);
    }
  }, [searchParams]);

  // Fetch current API tier from the user's keys
  useEffect(() => {
    fetch("/api/developer/keys?keyType=public")
      .then((r) => r.json())
      .then((data) => {
        const activeKeys = data.keys?.filter((k: { status: string }) => k.status === "active") || [];
        if (activeKeys.length > 0) {
          // Use the highest tier among active keys
          const tierRank: Record<string, number> = { Free: 0, Developer: 1, Pro: 2, Enterprise: 3 };
          const highestTier = activeKeys.reduce(
            (best: string, k: { apiTier: string }) =>
              (tierRank[k.apiTier] || 0) > (tierRank[best] || 0) ? k.apiTier : best,
            "Free"
          );
          setCurrentTier(highestTier);
        }
      })
      .catch(() => {});
  }, []);

  const handleUpgrade = async (plan: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Handle error
    }
    setLoading(false);
  };

  const handleManage = async () => {
    try {
      const res = await fetch("/api/stripe/portal");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Handle error
    }
  };

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
          <Check className="w-5 h-5" />
          Subscription activated! Your API keys have been upgraded.
        </div>
      )}

      {showCanceled && (
        <div className="p-4 bg-gray-50 border rounded-lg text-sm text-gray-600">
          Checkout was canceled. No changes were made.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">API Subscription Plans</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Current tier: <span className="font-medium text-gray-700">{currentTier}</span>
          </p>
        </div>
        {currentTier !== "Free" && (
          <button
            onClick={handleManage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Manage Subscription
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {API_PLANS.map((plan) => {
          const isCurrent = plan.name === currentTier;
          return (
            <div
              key={plan.key}
              className={`bg-white rounded-lg border p-5 flex flex-col ${
                plan.highlighted ? "border-blue-300 ring-1 ring-blue-100" : ""
              }`}
            >
              {plan.highlighted && (
                <span className="text-xs font-medium text-blue-600 mb-2">Most Popular</span>
              )}
              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-1 mb-4">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-sm text-gray-500">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="w-full py-2 text-center text-sm font-medium text-gray-500 bg-gray-100 rounded-lg">
                  Current Plan
                </div>
              ) : plan.disabled ? (
                <div className="w-full py-2 text-center text-sm font-medium text-gray-400 bg-gray-50 rounded-lg">
                  {plan.cta}
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg ${
                    plan.highlighted
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  } disabled:opacity-50`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Enterprise */}
      <div className="bg-white rounded-lg border p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Enterprise</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Unlimited calls, custom rate limits, dedicated support, and SLA.
          </p>
        </div>
        <a
          href="mailto:support@flashlearnai.witus.online?subject=Enterprise%20API%20Plan"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border rounded-lg hover:bg-gray-50"
        >
          <CreditCard className="w-4 h-4" />
          Contact Sales
        </a>
      </div>
    </div>
  );
}
