/* eslint-disable @typescript-eslint/no-explicit-any */
// components/auth/SignInForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

// Validation schema for sign in form
const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    
    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResendSuccess(true);
        setError(null);
      } else {
        setError(data.error || "Failed to resend verification email");
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      setError("An unexpected error occurred");
    } finally {
      setResendLoading(false);
    }
  };

  
  const { register, handleSubmit, formState: { errors } } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema)
  });
  
  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Signing in user:", data.email);
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password
      });
      
      if (result?.error) {
        console.log("Sign in error:", result.error);

        // Check for specific error types
      if (result.error.includes("email_not_verified")) {
        setError("Please verify your email address before signing in");
        setShowResendButton(true);
        setResendEmail(data.email);
        // Redirect to error page with specific error
        router.push("/auth/error?error=email_not_verified");
        return;
      }
      
      setError("Invalid email or password");
      return;
    }
      
      console.log("User signed in successfully, redirecting to dashboard");
      router.push("/generate");
      router.refresh(); // Refresh the page to update the session
    } catch (error: any) {
      console.error("Sign in error:", error);
      setError(`Connection error: ${error.message || "Failed to connect to authentication server"}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Sign In</h1>
        <p className="mt-2 text-gray-600">Welcome back to FlashLearn AI</p>
      </div>
      
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            className="w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register("password")}
            className="w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="********"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
          {showResendButton && (
            <div className="mt-4">
              {resendSuccess ? (
                <p className="text-sm text-green-600">
                  Verification email sent! Please check your inbox.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="text-sm text-blue-600 hover:text-blue-500"
                  disabled={resendLoading}
                >
                  {resendLoading ? "Sending..." : "Resend verification email"}
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="remember-me" className="block ml-2 text-sm text-gray-900">
              Remember me
            </label>
          </div>
          
          <div className="text-sm">
            <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
              Forgot your password?
            </Link>
          </div>
        </div>
        
        <div>
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}