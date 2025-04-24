// app/(auth)/signin/page.tsx
'use client';

import SignInForm from '@/components/auth/SignInForm';

export default function SignInPage() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <p className="mt-2 text-gray-600">Welcome back to FlashLearn AI</p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}