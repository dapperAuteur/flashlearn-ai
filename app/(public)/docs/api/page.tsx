"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

/**
 * Public API documentation page using Scalar (https://github.com/scalar/scalar).
 * Loads the OpenAPI spec from /api/v1/openapi and renders interactive docs.
 */
export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Scalar will auto-initialize when the script loads
    // and finds the data-configuration attribute
  }, []);

  const initScalar = () => {
    if (initialized.current) return;
    initialized.current = true;

    // Scalar auto-discovers the element with id="api-reference"
    // when it loads, so nothing to do here
  };

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
          <p className="text-sm text-gray-500 mt-1">
            FlashLearn AI Public API v1 — Generate flashcards, manage sets, and more.
          </p>
          <div className="flex gap-3 mt-3">
            <a
              href="/api/v1/openapi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              OpenAPI Spec (JSON)
            </a>
            <a
              href="/developer/keys"
              className="text-xs text-blue-600 hover:underline"
            >
              Get an API Key
            </a>
          </div>
        </div>
      </div>

      {/* Scalar API Reference */}
      <div
        ref={containerRef}
        id="api-reference"
        data-url="/api/v1/openapi"
        data-configuration={JSON.stringify({
          theme: "default",
          hideModels: false,
          hideDownloadButton: false,
          darkMode: false,
          metaData: {
            title: "FlashLearn AI API Docs",
            description: "Interactive API documentation for FlashLearn AI",
          },
        })}
      />

      <Script
        src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest"
        onLoad={initScalar}
        strategy="afterInteractive"
      />
    </div>
  );
}
