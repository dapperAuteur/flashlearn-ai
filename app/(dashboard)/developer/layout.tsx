"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Key, BarChart3, CreditCard, LayoutDashboard, Webhook } from "lucide-react";

const devNavItems = [
  { label: "Overview", href: "/developer", icon: LayoutDashboard },
  { label: "API Keys", href: "/developer/keys", icon: Key },
  { label: "Webhooks", href: "/developer/webhooks", icon: Webhook },
  { label: "Usage", href: "/developer/usage", icon: BarChart3 },
  { label: "Billing", href: "/developer/billing", icon: CreditCard },
];

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "Admin";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Developer Portal</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your API keys, monitor usage, and control billing.
        </p>
      </div>

      <nav className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {devNavItems.map((item) => {
          // Hide billing from non-admin for now (public keys are free by default)
          if (item.href === "/developer/billing" && !isAdmin) return null;

          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
