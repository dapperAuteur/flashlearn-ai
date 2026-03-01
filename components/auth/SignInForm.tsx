/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Logger, LogContext } from "@/lib/logging/client-logger";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/flashcards';
  const [showPassword, setShowPassword] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Email code login state
  const [loginMode, setLoginMode] = useState<'password' | 'email-code'>('password');
  const [codeEmail, setCodeEmail] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    Logger.log(LogContext.AUTH, 'Resend verification email requested', { email: resendEmail });

    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        Logger.log(LogContext.AUTH, 'Resend verification email successful', { email: resendEmail });
        setResendSuccess(true);
        setError(null);
      } else {
        Logger.warning(LogContext.AUTH, 'Resend verification email failed', { email: resendEmail, error: data.error });
        setError(data.error || "Failed to resend verification email");
      }
    } catch (error: any) {
      Logger.error(LogContext.AUTH, 'Resend verification submission error', { email: resendEmail, error: error.message });
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
    Logger.log(LogContext.AUTH, 'Sign-in form submitted', { email: data.email });

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password
      });

      if (result?.error) {
        Logger.warning(LogContext.AUTH, 'User sign-in failed', { email: data.email, error: result.error });
        if (result.error.includes("email_not_verified")) {
          setError("Please verify your email address before signing in");
          setShowResendButton(true);
          setResendEmail(data.email);
          return;
        }
        setError("Invalid email or password");
        return;
      }

      Logger.log(LogContext.AUTH, 'User sign-in successful', { email: data.email });
      window.location.href = callbackUrl;
    } catch (error: any) {
      Logger.error(LogContext.AUTH, 'Sign-in submission error', { email: data.email, error: error.message });
      setError(`Connection error: ${error.message || "Failed to connect to authentication server"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!codeEmail) {
      setCodeError("Please enter your email address");
      return;
    }
    setSendingCode(true);
    setCodeError(null);
    Logger.log(LogContext.AUTH, 'Login code requested', { email: codeEmail });

    try {
      const response = await fetch("/api/auth/send-login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: codeEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setCodeSent(true);
        setCodeError(null);
      } else {
        setCodeError(data.error || "Failed to send login code");
      }
    } catch {
      setCodeError("An unexpected error occurred");
    } finally {
      setSendingCode(false);
    }
  };

  const handleCodeLogin = async () => {
    if (!loginCode || loginCode.length !== 6) {
      setCodeError("Please enter the 6-digit code");
      return;
    }
    setIsLoading(true);
    setCodeError(null);
    Logger.log(LogContext.AUTH, 'Email code sign-in submitted', { email: codeEmail });

    try {
      const result = await signIn("email-code", {
        redirect: false,
        email: codeEmail,
        code: loginCode,
      });

      if (result?.error) {
        Logger.warning(LogContext.AUTH, 'Email code sign-in failed', { email: codeEmail });
        if (result.error.includes("email_not_verified")) {
          setCodeError("Please verify your email address first");
          return;
        }
        setCodeError("Invalid or expired code. Please try again.");
        return;
      }

      Logger.log(LogContext.AUTH, 'Email code sign-in successful', { email: codeEmail });
      window.location.href = callbackUrl;
    } catch {
      setCodeError("An unexpected error occurred");
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

      {/* Login mode toggle */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            loginMode === 'password'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => { setLoginMode('password'); setError(null); setCodeError(null); }}
        >
          <Lock size={16} />
          Password
        </button>
        <button
          type="button"
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            loginMode === 'email-code'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => { setLoginMode('email-code'); setError(null); setCodeError(null); }}
        >
          <Mail size={16} />
          Email Code
        </button>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {loginMode === 'password' ? (
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="text-gray-700 w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
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
              <Link href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
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
              <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {codeError && (
            <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md">
              {codeError}
            </div>
          )}

          {!codeSent ? (
            <>
              <div>
                <label htmlFor="code-email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="code-email"
                  type="email"
                  value={codeEmail}
                  onChange={(e) => setCodeEmail(e.target.value)}
                  className="text-gray-700 w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
                <p className="mt-1 text-xs text-gray-500">
                  We&apos;ll send a 6-digit login code to your email
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode || !codeEmail}
                className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingCode ? "Sending code..." : "Send Login Code"}
              </button>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  We sent a code to <span className="font-medium">{codeEmail}</span>
                </p>
              </div>

              <div>
                <label htmlFor="login-code" className="block text-sm font-medium text-gray-700">
                  Enter 6-digit code
                </label>
                <input
                  id="login-code"
                  type="text"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-gray-700 w-full p-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">Code expires in 10 minutes</p>
              </div>

              <button
                type="button"
                onClick={handleCodeLogin}
                disabled={isLoading || loginCode.length !== 6}
                className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in..." : "Sign in with code"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setCodeSent(false); setLoginCode(""); setCodeError(null); }}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Didn&apos;t receive a code? Send again
                </button>
              </div>
            </>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
