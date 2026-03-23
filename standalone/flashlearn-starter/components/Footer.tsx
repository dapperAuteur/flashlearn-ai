import { branding } from '@/lib/branding';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t mt-auto" role="contentinfo" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">
              {branding.footerText || `\u00A9 ${year} ${branding.appName}. All rights reserved.`}
            </p>
            {branding.poweredBy && (
              <p className="text-xs text-gray-400 mt-1">
                Powered by{' '}
                <a href="https://flashlearnai.witus.online" target="_blank" rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700 underline">
                  FlashLearnAI.WitUS.Online
                </a>
              </p>
            )}
          </div>
          <div className="flex gap-4 text-xs text-gray-400">
            <a href="https://flashlearnai.witus.online/docs/api" target="_blank" rel="noopener noreferrer"
              className="hover:text-gray-600">API Docs</a>
            <a href="https://WitUS.Online" target="_blank" rel="noopener noreferrer"
              className="hover:text-gray-600">WitUS.Online</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
