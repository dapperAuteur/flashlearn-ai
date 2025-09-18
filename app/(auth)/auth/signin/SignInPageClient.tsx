'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import SignInForm from '@/components/auth/SignInForm';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export default function SignInPageClient() {
  const searchParams = useSearchParams();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (searchParams.get('status') === 'signup-success') {
      setShowSuccessMessage(true);
      Logger.log(LogContext.AUTH, 'Sign-up success message displayed to user.');
    }
  }, [searchParams]);

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
      
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

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-gray-600">Welcome back to FlashLearn AI</p>
      </div>
      <SignInForm />
    </div>
  );
}
