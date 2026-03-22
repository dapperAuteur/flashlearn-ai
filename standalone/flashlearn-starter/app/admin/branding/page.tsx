'use client';

import { useState } from 'react';
import { branding } from '@/lib/branding';

/**
 * Admin Branding Dashboard
 *
 * Provides a visual editor for branding.config.ts values.
 * Shows a live preview and generates the config file content
 * that the customer can copy into their branding.config.ts.
 *
 * Note: This doesn't write to the file system (Next.js can't do that at runtime).
 * Instead it generates the config text for the customer to paste.
 */
export default function BrandingDashboard() {
  const [config, setConfig] = useState({
    appName: branding.appName,
    tagline: branding.tagline,
    domain: branding.domain,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    logoUrl: branding.logoUrl || '',
    faviconUrl: branding.faviconUrl,
    footerText: branding.footerText,
    poweredBy: branding.poweredBy,
    features: { ...branding.features },
  });

  const [copied, setCopied] = useState(false);

  const update = (key: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleFeature = (feature: string) => {
    setConfig(prev => ({
      ...prev,
      features: { ...prev.features, [feature]: !prev.features[feature as keyof typeof prev.features] },
    }));
  };

  const generatedConfig = `export const branding = ${JSON.stringify({
    appName: config.appName,
    tagline: config.tagline,
    domain: config.domain,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    logoUrl: config.logoUrl || null,
    faviconUrl: config.faviconUrl,
    footerText: config.footerText,
    poweredBy: config.poweredBy,
    features: config.features,
  }, null, 2)};

export type Branding = typeof branding;`;

  const copyConfig = () => {
    navigator.clipboard.writeText(generatedConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Branding Settings</h1>
      <p className="text-sm text-gray-500 mb-8">
        Customize your app&apos;s look and feel. When you&apos;re done, copy the generated config and paste it into <code className="bg-gray-100 px-1 rounded text-xs">branding.config.ts</code>.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Identity</h2>
            <div className="space-y-3">
              <Field label="App Name" value={config.appName} onChange={v => update('appName', v)} />
              <Field label="Tagline" value={config.tagline} onChange={v => update('tagline', v)} />
              <Field label="Domain" value={config.domain} onChange={v => update('domain', v)} placeholder="https://study.myschool.edu" />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Colors</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Primary</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.primaryColor} onChange={e => update('primaryColor', e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer" />
                  <input type="text" value={config.primaryColor} onChange={e => update('primaryColor', e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-xs font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Secondary</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.secondaryColor} onChange={e => update('secondaryColor', e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer" />
                  <input type="text" value={config.secondaryColor} onChange={e => update('secondaryColor', e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-xs font-mono" />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Logo &amp; Favicon</h2>
            <div className="space-y-3">
              <Field label="Logo URL" value={config.logoUrl} onChange={v => update('logoUrl', v)} placeholder="/logo.png or https://..." />
              <Field label="Favicon URL" value={config.faviconUrl} onChange={v => update('faviconUrl', v)} />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Footer</h2>
            <Field label="Custom Footer Text" value={config.footerText} onChange={v => update('footerText', v)} placeholder="Leave blank for default" />
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={config.poweredBy} onChange={e => update('poweredBy', e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-600">Show &quot;Powered by FlashLearnAI.WitUS.Online&quot;</span>
            </label>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Feature Toggles</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(config.features).map(([key, enabled]) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={enabled} onChange={() => toggleFeature(key)} className="rounded" />
                  <span className="text-sm text-gray-600 capitalize">{key}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Preview + Generated Config */}
        <div className="space-y-6">
          {/* Live Preview */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Live Preview</h2>
            <div className="border rounded-lg overflow-hidden">
              {/* Header preview */}
              <div className="bg-white border-b px-4 py-3 flex items-center gap-2">
                {config.logoUrl && (
                  <div className="w-6 h-6 rounded bg-gray-200" />
                )}
                <span className="font-bold" style={{ color: config.primaryColor }}>{config.appName}</span>
              </div>
              {/* Hero preview */}
              <div className="p-6 text-center" style={{ background: `linear-gradient(135deg, ${config.primaryColor}10, ${config.secondaryColor}10)` }}>
                <p className="text-xl font-bold text-gray-900">{config.appName}</p>
                <p className="text-sm text-gray-500 mt-1">{config.tagline}</p>
                <button className="mt-4 px-4 py-2 text-sm text-white rounded-lg" style={{ backgroundColor: config.primaryColor }}>
                  Get Started
                </button>
              </div>
              {/* Footer preview */}
              <div className="bg-gray-50 border-t px-4 py-3 text-xs text-gray-500">
                {config.footerText || `\u00A9 2026 ${config.appName}`}
                {config.poweredBy && (
                  <span className="ml-2">Powered by FlashLearnAI.WitUS.Online</span>
                )}
              </div>
            </div>
          </section>

          {/* Generated Config */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Generated Config</h2>
              <button onClick={copyConfig}
                className="px-3 py-1 text-xs font-medium text-white rounded"
                style={{ backgroundColor: config.primaryColor }}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-300 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed max-h-96 overflow-y-auto">
              <code>{generatedConfig}</code>
            </pre>
            <p className="text-xs text-gray-400 mt-2">
              Paste this into <code className="bg-gray-100 px-1 rounded">branding.config.ts</code> in your project root and redeploy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}
