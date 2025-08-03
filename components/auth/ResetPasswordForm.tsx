'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Logger, LogContext } from '@/lib/logging/client-logger';
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Eye, EyeOff } from "lucide-react";

const resetPasswordSchema = z.object({
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string()
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      Logger.log(LogContext.AUTH, 'Reset password page loaded with token.');
    } else {
      Logger.warning(LogContext.AUTH, 'Reset password page loaded without a token.');
      setError('No reset token provided. Please request a new reset link.');
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('No reset token available.');
      return;
    }

    setIsLoading(true);
    setError(null);
    Logger.log(LogContext.AUTH, 'Reset password form submitted.');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        Logger.warning(LogContext.AUTH, 'Reset password API call failed', { error: result.error });
        throw new Error(result.error || 'Failed to reset password.');
      }

      Logger.log(LogContext.AUTH, 'Password successfully reset.');
      setIsSuccess(true);

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        Logger.error(LogContext.AUTH, 'Reset password submission error', { error: errorMessage });
        setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
        <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">Password Reset!</h2>
            <p className="mt-2 text-sm text-gray-600">
                Your password has been updated successfully.
            </p>
            <Link href="/auth/sign-in" className="font-medium text-blue-600 hover:text-blue-500 inline-block mt-4">
                Proceed to Sign In
            </Link>
        </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Choose a new password</h2>
        <p className="mt-2 text-gray-600">
          Make sure it&apos;s a strong one!
        </p>
      </div>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            {...register('password')}
            className="text-gray-700 w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="********"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          <PasswordStrengthMeter password={watch("password") || ""} />
          {errors.password ? (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Must be 10+ characters and include an uppercase, lowercase, number, and special character.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            {...register('confirmPassword')}
            className="text-gray-700 w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="********"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-500"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>
        <div>
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading || !token}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </form>
    </>
  );
}
