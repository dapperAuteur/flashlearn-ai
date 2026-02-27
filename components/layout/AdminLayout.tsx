/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ReactNode, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  BarChart3,
  FolderTree,
  Star,
  Flag,
  Users,
  HeartPulse,
  Mail,
  DollarSign,
  Ticket,
  Megaphone,
  MessageSquare,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  ArrowLeft,
} from "lucide-react";

type AdminLayoutProps = {
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Categories", href: "/admin/categories", icon: FolderTree },
      { label: "Featured", href: "/admin/featured", icon: Star },
      { label: "Flags", href: "/admin/flags", icon: Flag },
    ],
  },
  {
    label: "Users",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Health", href: "/admin/health", icon: HeartPulse },
      { label: "Invitations", href: "/admin/invitations", icon: Mail },
    ],
  },
  {
    label: "Revenue",
    items: [
      { label: "Revenue", href: "/admin/revenue", icon: DollarSign },
      { label: "Coupons", href: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
      { label: "Conversations", href: "/admin/conversations", icon: MessageSquare },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Logs", href: "/admin/logs", icon: ScrollText },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  const user = session?.user as any;
  if (user?.role !== "Admin") {
    router.push("/flashcards");
    return null;
  }

  const isActive = (href: string) => pathname === href;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Admin</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.label);
          return (
            <div key={group.label} className="mb-2">
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
              >
                {group.label}
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {!isCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 flex-shrink-0 ${
                            active ? "text-blue-600" : "text-gray-400"
                          }`}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-700">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            App
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-200 ease-in-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-gray-900">
            FlashLearn AI Admin
          </span>
        </div>

        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
