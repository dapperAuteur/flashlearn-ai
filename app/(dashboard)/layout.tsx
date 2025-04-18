// app/(dashboard)/layout.tsx
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Dashboard | FlashLearn AI',
  description: 'FlashLearn AI Dashboard',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout provides server-side authentication protection
  // for all routes in the (dashboard) group
  const user = await getCurrentUser();
  
  if (!user) {
    console.log('User not authenticated, redirecting to sign in page');
    redirect('/signin');
  }
  
  return (
    <>
      {children}
    </>
  );
}