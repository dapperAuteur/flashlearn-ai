"use client";

// import { Metadata } from "next";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  
  // Get error message based on error code
  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "missing_token":
        return "Verification link is invalid. It may be missing a token.";
      case "invalid_token":
        return "Verification link is invalid or has expired.";
      case "server_error":
        return "A server error occurred during verification.";
      case "email_not_verified":
        return "Please verify your email address before signing in.";
      default:
        return "An unknown error occurred.";
    }
  };
  
  const handleResendVerification = async () => {
    setIsSubmitting(true);
    setMessage("");
    
    try {
      const email = prompt("Please enter your email address");
      
      if (!email) {
        setIsSubmitting(false);
        return;
      }
      
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      setMessage(data.message || "Verification email has been sent if the account exists.");
    } catch (error) {
      setMessage(`Failed to resend verification email. Please try again later. Error: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Error</h2>
        <p className="mt-2 text-sm text-gray-600">
          {getErrorMessage(error)}
        </p>
        
        {error === "invalid_token" || error === "email_not_verified" ? (
          <div className="mt-6">
            <button
              onClick={handleResendVerification}
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isSubmitting ? "Sending..." : "Resend Verification Email"}
            </button>
            
            {message && (
              <p className="mt-2 text-sm text-green-600">{message}</p>
            )}
          </div>
        ) : null}
        
        <div className="mt-6">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}