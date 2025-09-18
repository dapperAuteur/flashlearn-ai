'use client';

import PublicHeader from '@/components/layout/PublicHeader';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      {children}
    </div>
  );
}