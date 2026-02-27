'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { TrendingDown, Users, BarChart3 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface FunnelStep {
  label: string;
  count: number;
  dropOff: number;
}

interface FunnelData {
  steps: FunnelStep[];
  period: string;
}

const PERIODS = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
];

export default function AdminAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [period, setPeriod] = useState('30d');
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = session?.user as { role?: string } | undefined;

  const fetchFunnel = useCallback(async (selectedPeriod: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/analytics/funnel?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch funnel data');
      const data: FunnelData = await response.json();
      setFunnelData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || user?.role !== 'Admin') {
      router.push('/dashboard');
      return;
    }
    fetchFunnel(period);
  }, [session, status, router, user?.role, period, fetchFunnel]);

  if (status === 'loading') {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
        <p className="mt-3 text-gray-500 text-sm">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  const steps = funnelData?.steps || [];
  const totalRegistered = steps.length > 0 ? steps[0].count : 0;
  const totalSubscribed = steps.length > 0 ? steps[steps.length - 1].count : 0;
  const overallConversion = totalRegistered > 0
    ? ((totalSubscribed / totalRegistered) * 100).toFixed(1)
    : '0.0';

  // Find the step with the biggest drop-off (skip step 0 which has no drop-off)
  const biggestDropOff = steps.length > 1
    ? steps.slice(1).reduce((max, step) => (step.dropOff > max.dropOff ? step : max), steps[1])
    : null;

  // Chart data — horizontal bar chart
  const chartData = {
    labels: steps.map((s) => s.label),
    datasets: [
      {
        label: 'Users',
        data: steps.map((s) => s.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.9)',
          'rgba(59, 130, 246, 0.75)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(59, 130, 246, 0.45)',
          'rgba(59, 130, 246, 0.3)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(59, 130, 246)',
          'rgb(59, 130, 246)',
          'rgb(59, 130, 246)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { x: number } }) => {
            return `${context.parsed.x.toLocaleString()} users`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          precision: 0,
          font: { size: 12 },
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          font: { size: 13, weight: 500 as const },
          color: '#374151',
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Onboarding Funnel</h1>
          <p className="text-sm text-gray-500 mt-1">Track user progression from registration to subscription</p>
        </div>

        {/* Period Selector */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p.value
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Loading funnel data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Registered */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Registered</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalRegistered.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Overall Conversion */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Overall Conversion</p>
                  <p className="text-2xl font-semibold text-gray-900">{overallConversion}%</p>
                </div>
              </div>
            </div>

            {/* Biggest Drop-off */}
            <div className="bg-white shadow rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Biggest Drop-off</p>
                  {biggestDropOff ? (
                    <p className="text-2xl font-semibold text-gray-900">
                      {biggestDropOff.dropOff}%
                      <span className="text-sm font-normal text-gray-500 ml-1.5">{biggestDropOff.label}</span>
                    </p>
                  ) : (
                    <p className="text-2xl font-semibold text-gray-400">--</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Funnel Chart */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Funnel Visualization</h2>
            <div className="h-80">
              {steps.length > 0 ? (
                <Bar data={chartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  No data available for this period
                </div>
              )}
            </div>
          </div>

          {/* Drop-off Breakdown */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Step-by-Step Breakdown</h2>
            <div className="space-y-0">
              {steps.map((step, i) => {
                return (
                  <div key={step.label}>
                    {/* Step row */}
                    <div className="flex items-center justify-between py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{step.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{step.count.toLocaleString()} users</span>
                    </div>

                    {/* Drop-off indicator between steps */}
                    {i < steps.length - 1 && (
                      <div className="flex items-center gap-2 py-1.5 pl-12 pr-2">
                        <div className="flex-1 border-t border-dashed border-gray-200" />
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          steps[i + 1].dropOff > 50
                            ? 'bg-red-50 text-red-600'
                            : steps[i + 1].dropOff > 25
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-green-50 text-green-600'
                        }`}>
                          {steps[i + 1].dropOff > 0 ? (
                            <>-{steps[i + 1].dropOff}% ({(steps[i].count - steps[i + 1].count).toLocaleString()} lost)</>
                          ) : (
                            <>0% drop-off</>
                          )}
                        </span>
                        <div className="flex-1 border-t border-dashed border-gray-200" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
