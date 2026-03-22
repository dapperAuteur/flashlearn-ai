"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

interface PageSEO {
  path: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
}

const DEFAULT_PAGES: PageSEO[] = [
  { path: '/', title: 'Home', description: 'AI-powered flashcard generation, spaced repetition, and competitive learning.', ogTitle: '', ogDescription: '' },
  { path: '/pricing', title: 'Pricing', description: 'Simple, transparent pricing for FlashLearnAI.WitUS.Online.', ogTitle: '', ogDescription: '' },
  { path: '/explore', title: 'Explore', description: 'Browse public flashcard sets created by the community.', ogTitle: '', ogDescription: '' },
  { path: '/roadmap', title: 'Roadmap', description: 'See what features are coming next.', ogTitle: '', ogDescription: '' },
  { path: '/docs/api', title: 'API Reference', description: 'Interactive API documentation for developers.', ogTitle: '', ogDescription: '' },
  { path: '/docs/api/getting-started', title: 'Getting Started', description: 'Get started with the FlashLearnAI.WitUS.Online API in 60 seconds.', ogTitle: '', ogDescription: '' },
  { path: '/docs/api/generation', title: 'Generation Guide', description: 'Generate AI flashcards from any topic via API.', ogTitle: '', ogDescription: '' },
  { path: '/docs/api/spaced-repetition', title: 'Spaced Repetition Guide', description: 'Build study apps with SM-2 spaced repetition via API.', ogTitle: '', ogDescription: '' },
  { path: '/docs/api/versus-mode', title: 'Versus Mode Guide', description: 'Build competitive quiz challenges via API.', ogTitle: '', ogDescription: '' },
];

export default function SEOAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pages, setPages] = useState<PageSEO[]>(DEFAULT_PAGES);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  const loadSEOConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/configs');
      if (res.ok) {
        const data = await res.json();
        const seoConfig = data.configs?.find((c: { key: string }) => c.key === 'SEO_CONFIG');
        if (seoConfig?.value && Array.isArray(seoConfig.value)) {
          setPages(seoConfig.value);
        }
      }
    } catch { /* use defaults */ }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "Admin") {
      router.push("/dashboard");
      return;
    }
    loadSEOConfig();
  }, [session, status, router, loadSEOConfig]);

  const updatePage = (index: number, field: keyof PageSEO, value: string) => {
    setPages(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'SEO_CONFIG',
          value: pages,
          description: 'SEO metadata for public pages',
        }),
      });
      setSavedMessage('SEO settings saved');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch {
      setSavedMessage('Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Edit page titles, descriptions, and Open Graph tags for all public pages.</p>
        </div>
        <div className="flex items-center gap-3">
          {savedMessage && (
            <span className="text-sm text-green-600" role="status" aria-live="polite">{savedMessage}</span>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {pages.map((page, index) => (
          <div key={page.path} className="bg-white border rounded-lg">
            <button
              type="button"
              onClick={() => setExpandedPath(expandedPath === page.path ? null : page.path)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
              aria-expanded={expandedPath === page.path}
            >
              <div>
                <p className="font-medium text-sm text-gray-900">{page.title}</p>
                <p className="text-xs text-gray-400 font-mono">{page.path}</p>
              </div>
              <span className="text-xs text-gray-400">{expandedPath === page.path ? 'Collapse' : 'Edit'}</span>
            </button>

            {expandedPath === page.path && (
              <div className="px-4 pb-4 space-y-3 border-t pt-3">
                <div>
                  <label htmlFor={`title-${index}`} className="block text-xs text-gray-500 mb-1">Page Title</label>
                  <input id={`title-${index}`} type="text" value={page.title}
                    onChange={e => updatePage(index, 'title', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor={`desc-${index}`} className="block text-xs text-gray-500 mb-1">Meta Description</label>
                  <textarea id={`desc-${index}`} value={page.description} rows={2}
                    onChange={e => updatePage(index, 'description', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <p className="text-xs text-gray-400 mt-1">{page.description.length}/160 characters</p>
                </div>
                <div>
                  <label htmlFor={`og-title-${index}`} className="block text-xs text-gray-500 mb-1">OG Title (optional)</label>
                  <input id={`og-title-${index}`} type="text" value={page.ogTitle}
                    onChange={e => updatePage(index, 'ogTitle', e.target.value)}
                    placeholder="Defaults to page title"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor={`og-desc-${index}`} className="block text-xs text-gray-500 mb-1">OG Description (optional)</label>
                  <textarea id={`og-desc-${index}`} value={page.ogDescription} rows={2}
                    onChange={e => updatePage(index, 'ogDescription', e.target.value)}
                    placeholder="Defaults to meta description"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>

                {/* Google Preview */}
                <div className="p-3 bg-gray-50 rounded-lg" role="region" aria-label="Search result preview">
                  <p className="text-xs text-gray-400 mb-2">Google Search Preview</p>
                  <p className="text-blue-700 text-sm font-medium truncate">{page.title} | FlashLearnAI.WitUS.Online</p>
                  <p className="text-green-700 text-xs truncate">flashlearnai.witus.online{page.path}</p>
                  <p className="text-gray-600 text-xs line-clamp-2 mt-0.5">{page.description}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
