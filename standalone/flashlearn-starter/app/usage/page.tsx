import { api } from '@/lib/api';

interface UsageData {
  keyType: string;
  apiTier: string;
  period: { start: string; end: string };
  usage: { apiCalls: number; generationCalls: number; overageCalls: number };
  limits: { burstPerMinute: number | null; monthlyGenerations: number | null; monthlyApiCalls: number | null };
}

export default async function UsagePage() {
  let usage: UsageData | null = null;
  try { usage = await api<UsageData>('GET', '/usage'); } catch { /* empty */ }

  if (!usage) return <p className="text-gray-500 text-center py-12">Could not load usage data.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">API Usage</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tier: <span className="font-medium text-gray-700">{usage.apiTier}</span> &middot;
        Period: {new Date(usage.period.start).toLocaleDateString()} — {new Date(usage.period.end).toLocaleDateString()}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UsageCard label="API Calls" value={usage.usage.apiCalls} limit={usage.limits.monthlyApiCalls} />
        <UsageCard label="Generations" value={usage.usage.generationCalls} limit={usage.limits.monthlyGenerations} />
        <UsageCard label="Overage Calls" value={usage.usage.overageCalls} limit={null} />
      </div>

      {usage.limits.burstPerMinute && (
        <p className="mt-6 text-sm text-gray-500">
          Burst limit: {usage.limits.burstPerMinute} requests/minute
        </p>
      )}
    </div>
  );
}

function UsageCard({ label, value, limit }: { label: string; value: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (value / limit) * 100) : 0;
  return (
    <div className="bg-white border rounded-lg p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">
        {value.toLocaleString()}
        {limit && <span className="text-sm font-normal text-gray-400"> / {limit.toLocaleString()}</span>}
      </p>
      {limit && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
          <div className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
