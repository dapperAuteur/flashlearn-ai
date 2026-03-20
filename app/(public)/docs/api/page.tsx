"use client";

import { useRef } from "react";
import Script from "next/script";

/**
 * Interactive API Reference page powered by Scalar.
 * Renders the OpenAPI spec in a visual, try-it-out interface.
 */
export default function ApiDocsPage() {
  const initialized = useRef(false);

  return (
    <article>
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Interactive API Reference
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-2">
          Explore all 23 endpoints. Click any endpoint to see parameters, try it live, and view response schemas.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <a
            href="/api/v1/openapi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100"
          >
            OpenAPI Spec (JSON)
          </a>
          <a
            href="/developer/keys"
            className="inline-flex items-center text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100"
          >
            Get an API Key
          </a>
        </div>
      </header>

      <div
        id="api-reference"
        data-url="/api/v1/openapi"
        data-configuration={JSON.stringify({
          theme: "default",
          hideModels: false,
          hideDownloadButton: false,
          darkMode: false,
          metaData: {
            title: "FlashLearnAI.WitUS.Online API",
            description: "Interactive API documentation",
          },
        })}
        role="region"
        aria-label="Interactive API reference explorer"
      />

      <Script
        src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest"
        onLoad={() => { initialized.current = true; }}
        strategy="afterInteractive"
      />
    </article>
  );
}
