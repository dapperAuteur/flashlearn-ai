'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import { MailCheck } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    Logger.log(LogContext.AUTH, 'Forgot password form submitted', { email: data.email });

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      // Even if the request fails (e.g., email not found), we show a success
      // message to prevent email enumeration. The backend handles the logic.
      if (!response.ok) {
         Logger.warning(LogContext.AUTH, 'Request password reset API call failed', { email: data.email, status: response.status });
      }

      setIsSubmitted(true);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      Logger.error(LogContext.AUTH, 'Forgot password submission error', { email: data.email, error: errorMessage });
      // In case of a network error, we can show a generic error message.
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        {isSubmitted ? (
          <div className="text-center">
            <MailCheck className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">Check your email</h2>
            <p className="mt-2 text-sm text-gray-600">
              If an account with that email exists, we&apos;ve sent a link to reset your password.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
              <p className="mt-2 text-gray-600">
                No worries, we&apos;ll send you reset instructions.
              </p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="text-gray-700 w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
