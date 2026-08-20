"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import PasswordStrengthMeter from "@/components/ui/PasswordStrengthMeter";
import { Logger, LogContext } from "@/lib/logging/client-logger";

/**
 * A student turns the account their teacher made into their own.
 *
 * The claim code is the whole credential, so there is nothing to sign in with
 * first. The account id never changes, which is why the copy promises the work
 * comes along: every session and the whole review schedule are already attached
 * to the same user row.
 *
 * The password rules match registration exactly. A weaker rule here would be a
 * side door into the same account system.
 */

const claimSchema = z
  .object({
    claimCode: z.string().trim().min(5, "Enter the claim code your teacher gave you"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ClaimFormData = z.infer<typeof claimSchema>;

type AgeGateState = "attest_pending" | "attest_yes" | "attest_no";

// Same key the signup gate writes, so answering once covers both doors into
// account creation.
const AGE_GATE_NO_TTL_MS = 24 * 60 * 60 * 1000;
const AGE_GATE_NO_KEY = "flai_attest_no_until";

export default function ClaimAccountForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [helpText, setHelpText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [claimedEmail, setClaimedEmail] = useState<string | null>(null);
  const [ageGate, setAgeGate] = useState<AgeGateState>("attest_pending");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClaimFormData>({ resolver: zodResolver(claimSchema) });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const until = window.localStorage.getItem(AGE_GATE_NO_KEY);
    if (until && Number(until) > Date.now()) {
      setAgeGate("attest_no");
    }
  }, []);

  // A teacher can hand out a link instead of reading the code aloud.
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setValue("claimCode", code.trim());
  }, [searchParams, setValue]);

  const handleAgeAttest = (isThirteenOrOver: boolean) => {
    if (isThirteenOrOver) {
      setAgeGate("attest_yes");
      return;
    }
    setAgeGate("attest_no");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AGE_GATE_NO_KEY, String(Date.now() + AGE_GATE_NO_TTL_MS));
    }
  };

  const onSubmit = async (data: ClaimFormData) => {
    setIsLoading(true);
    setError(null);
    setHelpText(null);

    try {
      const response = await fetch("/api/teacher/students/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimCode: data.claimCode.trim(),
          email: data.email,
          password: data.password,
          ageAttested: true,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 410) {
        setError(result.error || "That claim code has expired.");
        setHelpText("Ask your teacher for a new code. Your work is still on the account.");
        return;
      }

      if (response.status === 429) {
        setError(result.error || "Too many attempts. Please try again later.");
        return;
      }

      if (response.status === 409) {
        setError(result.error || "That email address is already in use.");
        setHelpText("Use a different address, or sign in with the account you already have.");
        return;
      }

      if (!response.ok) {
        const details = result.details as Record<string, string[]> | undefined;
        const firstDetail = details ? Object.values(details)[0]?.[0] : undefined;
        setError(firstDetail || result.error || "We could not claim that account.");
        if (!firstDetail) {
          setHelpText("Check the code with your teacher. Each code works once.");
        }
        return;
      }

      Logger.log(LogContext.AUTH, "Managed account claimed");
      setClaimedEmail(result.user?.email ?? data.email);
    } catch (submitError) {
      Logger.error(LogContext.AUTH, "Account claim submission failed", { error: submitError });
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (claimedEmail) {
    return (
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md" role="status">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">The account is yours</h1>
        <p className="text-gray-700">
          Check {claimedEmail} for a verification email and open the link inside it. You need
          to do that before your first sign in.
        </p>
        <p className="text-gray-700">
          Everything you studied in class is already on this account, including your review
          schedule.
        </p>
        <Link
          href="/auth/signin"
          className="inline-block w-full text-center px-4 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (ageGate === "attest_pending") {
    return (
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quick check first</h1>
          <p className="mt-3 text-gray-700">
            FlashLearn AI is built for learners 13 and older. Are you 13 or older?
          </p>
          <p className="mt-2 text-xs text-gray-600">
            We ask before collecting your email. Selecting &quot;No&quot; stops here and saves
            nothing.
          </p>
        </div>
        <div role="group" aria-label="Age verification" className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleAgeAttest(true)}
            className="w-full min-h-12 px-4 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Yes, I&apos;m 13 or older
          </button>
          <button
            type="button"
            onClick={() => handleAgeAttest(false)}
            className="w-full min-h-12 px-4 py-3 text-base font-medium text-gray-900 bg-gray-100 rounded-md hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          >
            No, I&apos;m under 13
          </button>
        </div>
      </div>
    );
  }

  if (ageGate === "attest_no") {
    return (
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Thanks for checking</h1>
        <p className="text-gray-700">
          FlashLearn AI is not built for kids under 13 yet. We are not collecting or saving any
          of your information. Your class account is untouched and your teacher can still study
          with you.
        </p>
        <Link href="/" className="font-medium text-blue-600 hover:text-blue-500">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Claim your account</h1>
        <p className="mt-2 text-gray-700">
          Your teacher made an account for you in class. Add your email and a password and it
          becomes yours, with everything you have already studied on it.
        </p>
      </div>

      {error && (
        <div role="alert" className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
          <p>{error}</p>
          {helpText && <p className="mt-1">{helpText}</p>}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="claimCode" className="block text-sm font-medium text-gray-900">
            Claim code
          </label>
          <input
            id="claimCode"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            {...register("claimCode")}
            aria-describedby={errors.claimCode ? "claim-code-error" : "claim-code-hint"}
            aria-invalid={!!errors.claimCode}
            className="font-mono tracking-widest text-base text-gray-900 w-full min-h-11 p-2 mt-1 border border-gray-300 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            placeholder="ABCDE-FGHJK"
          />
          {errors.claimCode ? (
            <p id="claim-code-error" role="alert" className="mt-1 text-sm text-red-700">
              {errors.claimCode.message}
            </p>
          ) : (
            <p id="claim-code-hint" className="mt-1 text-xs text-gray-600">
              Ten letters and numbers, from your teacher. It works once.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="claim-email" className="block text-sm font-medium text-gray-900">
            Your email address
          </label>
          <input
            id="claim-email"
            type="email"
            autoComplete="email"
            {...register("email")}
            aria-describedby={errors.email ? "claim-email-error" : undefined}
            aria-invalid={!!errors.email}
            className="text-base text-gray-900 w-full min-h-11 p-2 mt-1 border border-gray-300 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            placeholder="you@example.com"
          />
          {errors.email && (
            <p id="claim-email-error" role="alert" className="mt-1 text-sm text-red-700">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="relative">
          <label htmlFor="claim-password" className="block text-sm font-medium text-gray-900">
            Choose a password
          </label>
          <input
            id="claim-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("password")}
            aria-describedby={errors.password ? "claim-password-error" : "claim-password-hint"}
            aria-invalid={!!errors.password}
            className="text-base text-gray-900 w-full min-h-11 p-2 mt-1 border border-gray-300 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            placeholder="********"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
          <PasswordStrengthMeter password={watch("password") || ""} />
          {errors.password ? (
            <p id="claim-password-error" role="alert" className="mt-1 text-sm text-red-700">
              {errors.password.message}
            </p>
          ) : (
            <p id="claim-password-hint" className="mt-1 text-xs text-gray-600">
              Must be 10+ characters and include an uppercase, lowercase, number, and special
              character.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="claim-confirm-password" className="block text-sm font-medium text-gray-900">
            Confirm password
          </label>
          <input
            id="claim-confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("confirmPassword")}
            aria-describedby={errors.confirmPassword ? "claim-confirm-error" : undefined}
            aria-invalid={!!errors.confirmPassword}
            className="text-base text-gray-900 w-full min-h-11 p-2 mt-1 border border-gray-300 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            placeholder="********"
          />
          {errors.confirmPassword && (
            <p id="claim-confirm-error" role="alert" className="mt-1 text-sm text-red-700">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full min-h-12 px-4 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {isLoading ? "Claiming..." : "Claim my account"}
        </button>

        <p className="text-sm text-gray-700 text-center">
          Already have your own account?{" "}
          <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
