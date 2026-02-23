"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";

const teacherRoles = ["Teacher", "Tutor", "SchoolAdmin", "Admin"];

const navItems = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/classrooms", label: "Classrooms" },
  { href: "/teacher/assignments", label: "Assignments" },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!session || !teacherRoles.includes(session.user.role)) {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-1 overflow-x-auto">
              <Link href="/teacher" className="text-lg font-bold text-blue-600 mr-4 flex-shrink-0">
                Teacher
              </Link>
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/teacher" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 flex-shrink-0">
              Back to App
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
