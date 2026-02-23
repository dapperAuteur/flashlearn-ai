/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Handle loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
          <p className="text-gray-500">Please wait while we load your data.</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (status === "unauthenticated") {
    console.log("User not authenticated, redirecting to sign in page");
    router.push("/auth/signin");
    return null;
  }
  
  // If not admin, redirect to dashboard
  const user = session?.user as any;
  if (user?.role !== "Admin") {
    console.log("User not admin, redirecting to study page");
    router.push("/flashcards");
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-blue-600">FlashLearn AI Admin</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link href="/admin/dashboard"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/admin/logs"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Logs
                </Link>
                <Link href="/admin/users"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Users
                </Link>
                <Link href="/admin/settings"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Settings
                </Link>
              </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                <div className="ml-3 relative">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700 mr-2">
                      {session?.user?.name} (Admin)
                    </span>
                    <button
                      onClick={() => {
                        console.log("Admin signing out");
                        signOut({ callbackUrl: "/" });
                      }}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
        
        <main className="py-10">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    );
  }