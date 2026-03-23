'use client';

import { useState, useId } from 'react';
import { branding } from '@/lib/branding';

export default function BrandingDashboard() {
  const formId = useId();
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
  const [copyStatus, setCopyStatus] = useState('');

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
    setCopyStatus('Config copied to clipboard');
    setTimeout(() => { setCopied(false); setCopyStatus(''); }, 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Branding Settings</h1>
      <p className="text-sm text-gray-500 mb-8">
        Customize your app&apos;s look and feel. Copy the generated config into <code className="bg-gray-100 px-1 rounded text-xs">branding.config.ts</code>.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <form onSubmit={e => e.preventDefault()} aria-label="Branding configuration form">
          <fieldset className="space-y-6">
            {/* Identity */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-3">Identity</legend>
              <div className="space-y-3">
                <Field id={`${formId}-appName`} label="App Name" value={config.appName} onChange={v => update('appName', v)} />
                <Field id={`${formId}-tagline`} label="Tagline" value={config.tagline} onChange={v => update('tagline', v)} />
                <Field id={`${formId}-domain`} label="Domain" value={config.domain} onChange={v => update('domain', v)} placeholder="https://study.myschool.edu" />
              </div>
            </fieldset>

            {/* Colors */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-3">Colors</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${formId}-primary-color`} className="block text-xs text-gray-500 mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input id={`${formId}-primary-color`} type="color" value={config.primaryColor}
                      onChange={e => update('primaryColor', e.target.value)}
                      aria-label="Primary color picker"
                      className="w-8 h-8 rounded border cursor-pointer" />
                    <input type="text" value={config.primaryColor} onChange={e => update('primaryColor', e.target.value)}
                      aria-label="Primary color hex value"
                      className="flex-1 border rounded px-2 py-1 text-xs font-mono" />
                  </div>
                </div>
                <div>
                  <label htmlFor={`${formId}-secondary-color`} className="block text-xs text-gray-500 mb-1">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input id={`${formId}-secondary-color`} type="color" value={config.secondaryColor}
                      onChange={e => update('secondaryColor', e.target.value)}
                      aria-label="Secondary color picker"
                      className="w-8 h-8 rounded border cursor-pointer" />
                    <input type="text" value={config.secondaryColor} onChange={e => update('secondaryColor', e.target.value)}
                      aria-label="Secondary color hex value"
                      className="flex-1 border rounded px-2 py-1 text-xs font-mono" />
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Logo & Favicon */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-3">Logo &amp; Favicon</legend>
              <div className="space-y-3">
                <Field id={`${formId}-logo`} label="Logo URL" value={config.logoUrl} onChange={v => update('logoUrl', v)} placeholder="/logo.png or https://..." />
                <Field id={`${formId}-favicon`} label="Favicon URL" value={config.faviconUrl} onChange={v => update('faviconUrl', v)} />
              </div>
            </fieldset>

            {/* Footer */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-3">Footer</legend>
              <div>
                <label htmlFor={`${formId}-footer`} className="block text-xs text-gray-500 mb-1">Custom Footer Text</label>
                <textarea id={`${formId}-footer`} value={config.footerText} onChange={e => update('footerText', e.target.value)}
                  placeholder="Leave blank for default" rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={config.poweredBy} onChange={e => update('poweredBy', e.target.checked)}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-600">Show &quot;Powered by FlashLearnAI.WitUS.Online&quot;</span>
              </label>
            </fieldset>

            {/* Feature Toggles */}
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700 mb-3">Feature Toggles</legend>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(config.features).map(([key, enabled]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={enabled} onChange={() => toggleFeature(key)}
                      aria-label={`Enable ${key} feature`}
                      className="rounded border-gray-300" />
                    <span className="text-sm text-gray-600 capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>
        </form>

        {/* Preview + Generated Config */}
        <div className="space-y-6">
          {/* Live Preview */}
          <section aria-labelledby="preview-heading">
            <h2 id="preview-heading" className="text-sm font-semibold text-gray-700 mb-3">Live Preview</h2>
            <div className="border rounded-lg overflow-hidden" role="region" aria-label="Branding preview" aria-live="polite">
              <div className="bg-white border-b px-4 py-3 flex items-center gap-2">
                {config.logoUrl && <div className="w-6 h-6 rounded bg-gray-200" aria-hidden="true" />}
                <span className="font-bold" style={{ color: config.primaryColor }}>{config.appName}</span>
              </div>
              <div className="p-6 text-center" style={{ background: `linear-gradient(135deg, ${config.primaryColor}10, ${config.secondaryColor}10)` }}>
                <p className="text-xl font-bold text-gray-900">{config.appName}</p>
                <p className="text-sm text-gray-500 mt-1">{config.tagline}</p>
                <div className="mt-4 px-4 py-2 text-sm text-white rounded-lg inline-block" style={{ backgroundColor: config.primaryColor }}>
                  Get Started
                </div>
              </div>
              <div className="bg-gray-50 border-t px-4 py-3 text-xs text-gray-500">
                {config.footerText || `\u00A9 ${new Date().getFullYear()} ${config.appName}`}
                {config.poweredBy && <span className="ml-2">Powered by FlashLearnAI.WitUS.Online</span>}
              </div>
            </div>
          </section>

          {/* Generated Config */}
          <section aria-labelledby="config-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="config-heading" className="text-sm font-semibold text-gray-700">Generated Config</h2>
              <button onClick={copyConfig} aria-label="Copy configuration to clipboard"
                className="px-3 py-1 text-xs font-medium text-white rounded"
                style={{ backgroundColor: config.primaryColor }}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            {/* Screen reader announcement for copy action */}
            <div aria-live="assertive" className="sr-only">{copyStatus}</div>
            <pre className="bg-gray-900 text-gray-300 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed max-h-96 overflow-y-auto"
              role="region" aria-label="Generated branding configuration code">
              <code>{generatedConfig}</code>
            </pre>
            <p className="text-xs text-gray-400 mt-2">
              Paste into <code className="bg-gray-100 px-1 rounded">branding.config.ts</code> and redeploy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-gray-500 mb-1">{label}</label>
      <input id={id} type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}
