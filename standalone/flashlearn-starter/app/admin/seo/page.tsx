'use client';

import { useState } from 'react';
import { seoConfig } from '@/seo.config';
import { branding } from '@/lib/branding';

type PageSEO = { title: string; description: string; ogTitle?: string; ogDescription?: string };

export default function SEODashboard() {
  const [config, setConfig] = useState<Record<string, PageSEO>>({ ...seoConfig });
  const [copied, setCopied] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  const updatePage = (path: string, field: keyof PageSEO, value: string) => {
    setConfig(prev => ({
      ...prev,
      [path]: { ...prev[path], [field]: value },
    }));
  };

  const generatedConfig = `export const seoConfig: Record<string, { title: string; description: string; ogTitle?: string; ogDescription?: string }> = ${JSON.stringify(config, null, 2)};`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedConfig);
    setCopied(true);
    setCopyStatus('SEO config copied to clipboard');
    setTimeout(() => { setCopied(false); setCopyStatus(''); }, 2000);
  };

  const pages = Object.entries(config);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">SEO Settings</h1>
      <p className="text-sm text-gray-500 mb-8">
        Edit page titles, meta descriptions, and Open Graph tags for every page. Copy the generated config into <code className="bg-gray-100 px-1 rounded text-xs">seo.config.ts</code>.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Page list */}
        <div className="lg:col-span-2 space-y-3">
          {pages.map(([path, seo]) => (
            <div key={path} className="bg-white border rounded-lg">
              <button
                type="button"
                onClick={() => setExpandedPage(expandedPage === path ? null : path)}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
                aria-expanded={expandedPage === path}
                aria-controls={`seo-form-${path.replace(/\//g, '-')}`}
              >
                <div>
                  <p className="font-medium text-sm text-gray-900">{seo.title}</p>
                  <p className="text-xs text-gray-400 font-mono">{path}</p>
                </div>
                <span className="text-xs text-gray-400">{expandedPage === path ? 'Collapse' : 'Edit'}</span>
              </button>

              {expandedPage === path && (
                <div id={`seo-form-${path.replace(/\//g, '-')}`} className="px-4 pb-4 space-y-3 border-t">
                  <div className="pt-3">
                    <label htmlFor={`title-${path}`} className="block text-xs text-gray-500 mb-1">
                      Page Title <span className="text-gray-400">(appears in browser tab)</span>
                    </label>
                    <input id={`title-${path}`} type="text" value={seo.title}
                      onChange={e => updatePage(path, 'title', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <p className="text-xs text-gray-400 mt-1">
                      Preview: <span className="text-gray-600">{seo.title} | {branding.appName}</span>
                    </p>
                  </div>

                  <div>
                    <label htmlFor={`desc-${path}`} className="block text-xs text-gray-500 mb-1">
                      Meta Description <span className="text-gray-400">(shown in search results)</span>
                    </label>
                    <textarea id={`desc-${path}`} value={seo.description} rows={2}
                      onChange={e => updatePage(path, 'description', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <p className="text-xs text-gray-400 mt-1">{seo.description.length}/160 characters</p>
                  </div>

                  <div>
                    <label htmlFor={`og-title-${path}`} className="block text-xs text-gray-500 mb-1">
                      OG Title <span className="text-gray-400">(social media share title, optional)</span>
                    </label>
                    <input id={`og-title-${path}`} type="text" value={seo.ogTitle || ''}
                      onChange={e => updatePage(path, 'ogTitle', e.target.value)}
                      placeholder="Defaults to page title"
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>

                  <div>
                    <label htmlFor={`og-desc-${path}`} className="block text-xs text-gray-500 mb-1">
                      OG Description <span className="text-gray-400">(social media share description, optional)</span>
                    </label>
                    <textarea id={`og-desc-${path}`} value={seo.ogDescription || ''} rows={2}
                      onChange={e => updatePage(path, 'ogDescription', e.target.value)}
                      placeholder="Defaults to meta description"
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>

                  {/* Google Preview */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2">Google Search Preview</p>
                    <p className="text-blue-700 text-sm font-medium truncate">{seo.title} | {branding.appName}</p>
                    <p className="text-green-700 text-xs truncate">{branding.domain}{path}</p>
                    <p className="text-gray-600 text-xs line-clamp-2 mt-0.5">{seo.description}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Generated Config */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Generated Config</h2>
              <button onClick={copyToClipboard} aria-label="Copy SEO configuration to clipboard"
                className="px-3 py-1 text-xs font-medium text-white rounded"
                style={{ backgroundColor: 'var(--color-primary)' }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div aria-live="assertive" className="sr-only">{copyStatus}</div>
            <pre className="bg-gray-900 text-gray-300 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed max-h-[70vh] overflow-y-auto"
              role="region" aria-label="Generated SEO configuration code">
              <code>{generatedConfig}</code>
            </pre>
            <p className="text-xs text-gray-400 mt-2">
              Paste into <code className="bg-gray-100 px-1 rounded">seo.config.ts</code> and redeploy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
