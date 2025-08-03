import { Suspense } from 'react';
import SignInPageClient from '@/app/auth/sign-in/SignInPageClient';
import { Skeleton } from '@/components/ui/skeleton';

function SignInSkeleton() {
  return (
    <div className='w-full max-w-md p-8 space-y-8'>
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<SignInSkeleton />}>
        <SignInPageClient />
      </Suspense>
    </div>
  );
}
