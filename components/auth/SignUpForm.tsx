/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { track } from "@vercel/analytics";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';
import { Logger, LogContext } from "@/lib/logging/client-logger";
import { Eye, EyeOff } from "lucide-react";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_-]+$/, "Only lowercase letters, numbers, underscores, and hyphens")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email address"),
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

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Capture UTM params from the URL (may be passed through from shared links)
  const utmSource = searchParams.get('utm_source') ?? undefined;
  const utmMedium = searchParams.get('utm_medium') ?? undefined;
  const utmCampaign = searchParams.get('utm_campaign') ?? undefined;
  const signupSource = utmCampaign ?? utmSource ?? undefined;

  useEffect(() => {
    if (utmSource) {
      // Persist to sessionStorage so it survives page reloads within the auth flow
      sessionStorage.setItem('utm_source', utmSource);
      sessionStorage.setItem('utm_medium', utmMedium ?? 'share');
      sessionStorage.setItem('utm_campaign', utmCampaign ?? '');
    }
  }, [utmSource, utmMedium, utmCampaign]);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema)
  });

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const res = await fetch(`/api/user/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setUsernameAvailable(data.available);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };
  
  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    setError(null);
    Logger.log(LogContext.AUTH, 'Sign-up form submitted', { email: data.email });
    
    try {
      // Also pull from sessionStorage as fallback (set earlier in this auth flow)
      const storedUtmSource = utmSource ?? sessionStorage.getItem('utm_source') ?? undefined;
      const storedUtmMedium = utmMedium ?? sessionStorage.getItem('utm_medium') ?? undefined;
      const storedUtmCampaign = utmCampaign ?? sessionStorage.getItem('utm_campaign') ?? undefined;

      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          ...(data.username ? { username: data.username } : {}),
          ...(storedUtmSource ? { utmSource: storedUtmSource } : {}),
          ...(storedUtmMedium ? { utmMedium: storedUtmMedium } : {}),
          ...(storedUtmCampaign ? { utmCampaign: storedUtmCampaign } : {}),
          ...(signupSource ? { signupSource } : {}),
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        Logger.warning(LogContext.AUTH, 'User registration failed', { email: data.email, error: result.error });
        setError(result.error || "Registration failed");
        return;
      }
      
      Logger.log(LogContext.AUTH, 'User registration successful', { email: data.email });
      // Fire attribution event if signup came from a share
      if (storedUtmCampaign || storedUtmSource) {
        track('signup_from_share', {
          utmCampaign: storedUtmCampaign ?? '',
          utmSource: storedUtmSource ?? '',
        });
        sessionStorage.removeItem('utm_source');
        sessionStorage.removeItem('utm_medium');
        sessionStorage.removeItem('utm_campaign');
      }
      router.push('/auth/signin?status=signup-success');
    } catch (error: any) {
      Logger.error(LogContext.AUTH, 'Sign-up submission error', { email: data.email, error: error.message });
      setError(`Error: ${error.message || "An unexpected error occurred"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">Create an Account</h1>
        <p className="mt-2 text-gray-600">Join FlashLearn AI today</p>
      </div>
      
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            {...register("name")}
            aria-describedby={errors.name ? 'name-error' : undefined}
            aria-invalid={!!errors.name}
            className="text-base text-gray-700 w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="John Doe"
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username <span className="text-gray-500">(optional)</span>
          </label>
          <input
            id="username"
            type="text"
            {...register("username")}
            aria-describedby="username-hint username-availability"
            aria-invalid={!!errors.username}
            className="text-base text-gray-700 w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="cool_learner"
            onChange={(e) => {
              register("username").onChange(e);
              checkUsernameAvailability(e.target.value.toLowerCase());
            }}
          />
          <div id="username-availability" aria-live="polite" aria-atomic="true">
            {checkingUsername && (
              <p className="mt-1 text-xs text-gray-500">Checking availability...</p>
            )}
            {!checkingUsername && usernameAvailable === true && (
              <p className="mt-1 text-xs text-green-600">Username is available</p>
            )}
            {!checkingUsername && usernameAvailable === false && (
              <p className="mt-1 text-xs text-red-600">Username is already taken</p>
            )}
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>
          <p id="username-hint" className="mt-1 text-xs text-gray-500">Used on leaderboards instead of your email</p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
            aria-invalid={!!errors.email}
            className="text-base text-gray-700 w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
          {errors.email && (
            <p id="signup-email-error" className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
        
        <div className="relative">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
            aria-describedby={errors.password ? 'signup-password-error' : 'signup-password-hint'}
            aria-invalid={!!errors.password}
            className="text-base text-gray-700 w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="********"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
          <PasswordStrengthMeter password={watch("password") || ""} />
          {errors.password ? (
            <p id="signup-password-error" className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          ) : (
            <p id="signup-password-hint" className="mt-1 text-xs text-gray-500">
              Must be 10+ characters and include an uppercase, lowercase, number, and special character.
            </p>
          )}
        </div>
        
        <div className="relative">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            {...register("confirmPassword")}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            aria-invalid={!!errors.confirmPassword}
            className="text-base text-gray-700 w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="********"
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-500"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
          {errors.confirmPassword && (
            <p id="confirm-password-error" className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>
        
        <div>
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
