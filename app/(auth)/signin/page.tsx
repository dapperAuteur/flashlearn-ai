'use client';

import { Suspense,useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import SignInForm from '@/components/auth/SignInForm';
import { Logger, LogContext } from '@/lib/logging/client-logger';

// New client component to handle the success message and useSearchParams
function SignInMessageDisplay() {
  const searchParams = useSearchParams();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (searchParams.get('status') === 'signup-success') {
      setShowSuccessMessage(true);
      Logger.log(LogContext.AUTH, 'Sign-up success message displayed to user.');
    }
  }, [searchParams]);

  return (
    <>
      {showSuccessMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-md" role="alert">
          <div className="flex">
            <div className="py-1">
              <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
            </div>
            <div>
              <p className="font-bold">Sign-up successful!</p>
              <p className="text-sm">Please sign in to continue.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


export default function SignInPage() {
  // We no longer call useSearchParams here
  // const searchParams = useSearchParams();
  // const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // useEffect(() => {
  //   if (searchParams.get('status') === 'signup-success') {
  //     setShowSuccessMessage(true);
  //     // Log that the user has seen the success message.
  //     Logger.log(LogContext.AUTH, 'Sign-up success message displayed to user.');
  //   }
  // }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        
        {/* We now wrap the component that uses useSearchParams in a Suspense boundary */}
        <Suspense fallback={<div>Loading...</div>}>
          <SignInMessageDisplay />
        </Suspense>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-gray-600">Welcome back to FlashLearn AI</p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
