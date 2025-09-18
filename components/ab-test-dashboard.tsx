/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  RefreshCw, 
  X, 
  TrendingUp, 
  Users, 
  MousePointer, 
  Eye 
} from 'lucide-react';
import { 
  calculateResults, 
  getStoredEvents, 
  getStatisticalSignificance, 
  exportToCSV, 
  resetABTest,
  type ABTestResults
} from '@/lib/analytics/ab-test';

interface ABTestDashboardProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ABTestDashboard: React.FC<ABTestDashboardProps> = ({ 
  isOpen = false, 
  onClose 
}) => {
  const [results, setResults] = useState<Record<'A' | 'B' | 'C', ABTestResults>>({
    A: { variant: 'A', views: 0, signups: 0, generates: 0, studies: 0, conversionRate: 0, engagementRate: 0 },
    B: { variant: 'B', views: 0, signups: 0, generates: 0, studies: 0, conversionRate: 0, engagementRate: 0 },
    C: { variant: 'C', views: 0, signups: 0, generates: 0, studies: 0, conversionRate: 0, engagementRate: 0 }
  });
  const [events, setEvents] = useState(0);
  const [significance, setSignificance] = useState<any>(null);

  const refreshData = () => {
    const newResults = calculateResults();
    const eventCount = getStoredEvents().length;
    const sig = getStatisticalSignificance(newResults);
    
    setResults(newResults);
    setEvents(eventCount);
    setSignificance(sig);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleExportCSV = () => {
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ab-test-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all A/B test data? This cannot be undone.')) {
      resetABTest();
      refreshData();
      alert('A/B test data has been reset. Please refresh the page.');
    }
  };

  if (!isOpen) return null;

  const variants = Object.values(results);
  const bestVariant = variants.reduce((best, current) => 
    current.conversionRate > best.conversionRate ? current : best
  );

  const totalViews = variants.reduce((sum, v) => sum + v.views, 0);
  const totalSignups = variants.reduce((sum, v) => sum + v.signups, 0);
  const overallConversion = totalViews > 0 ? (totalSignups / totalViews) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">A/B Test Analytics Dashboard</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{totalViews}</div>
              <div className="text-sm text-gray-600">Total Views</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{totalSignups}</div>
              <div className="text-sm text-gray-600">Total Signups</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{overallConversion.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Overall Conversion</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <MousePointer className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{events}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
          </div>

          {/* Statistical Significance */}
          {significance && (
            <div className={`p-4 rounded-lg ${significance.isSignificant ? 'bg-green-100 border border-green-200' : 'bg-yellow-100 border border-yellow-200'}`}>
              <div className="flex items-center space-x-2">
                <TrendingUp className={`h-5 w-5 ${significance.isSignificant ? 'text-green-600' : 'text-yellow-600'}`} />
                <span className={`font-medium ${significance.isSignificant ? 'text-green-800' : 'text-yellow-800'}`}>
                  {significance.isSignificant ? 'Statistically Significant!' : 'Need More Data'}
                </span>
              </div>
              <p className={`mt-1 text-sm ${significance.isSignificant ? 'text-green-700' : 'text-yellow-700'}`}>
                {significance.message}
              </p>
            </div>
          )}
        </div>

        {/* Variant Comparison */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Variant Performance Comparison</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {(['A', 'B', 'C'] as const).map(variant => {
              const data = results[variant];
              const isBest = data.variant === bestVariant.variant && bestVariant.conversionRate > 0;
              
              return (
                <div 
                  key={variant} 
                  className={`relative bg-white border-2 rounded-xl p-6 ${isBest ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                >
                  {isBest && (
                    <div className="absolute -top-2 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      WINNING VARIANT
                    </div>
                  )}
                  
                  <div className="text-center mb-4">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Variant {variant}</h4>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {data.conversionRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Conversion Rate</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Views</span>
                      <span className="font-semibold">{data.views}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Signups</span>
                      <span className="font-semibold text-green-600">{data.signups}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Generates</span>
                      <span className="font-semibold text-purple-600">{data.generates}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Studies</span>
                      <span className="font-semibold text-blue-600">{data.studies}</span>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Engagement Rate</span>
                        <span className="font-semibold">{data.engagementRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Visual Progress Bar for Conversion Rate */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${isBest ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ 
                          width: totalViews > 0 ? `${Math.min(100, (data.conversionRate / Math.max(...variants.map(v => v.conversionRate))) * 100)}%` : '0%' 
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center pt-6 border-t">
            <button
              onClick={refreshData}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </button>
            
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            
            <button
              onClick={handleReset}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Test Data
            </button>
          </div>
        </div>

        {/* Recommendations */}
        {totalViews > 50 && (
          <div className="p-6 bg-blue-50 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
            <div className="space-y-2 text-sm text-gray-700">
              {significance?.isSignificant ? (
                <>
                  <p>✅ <strong>Variant {bestVariant.variant}</strong> is the clear winner with {bestVariant.conversionRate.toFixed(1)}% conversion rate.</p>
                  <p>🚀 Consider implementing Variant {bestVariant.variant} as your default experience.</p>
                </>
              ) : totalViews < 100 ? (
                <p>⏳ Keep running the test. You need at least 100 views per variant for reliable results.</p>
              ) : totalSignups < 30 ? (
                <p>📊 Need more conversions (at least 30) to determine statistical significance.</p>
              ) : (
                <p>📈 Results are close. Consider running the test longer or testing different elements.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Floating Dashboard Trigger Button
export const ABTestTrigger: React.FC = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setEventCount(getStoredEvents().length);
    };
    
    updateCount();
    
    // Update count every 5 seconds
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        onClick={() => setShowDashboard(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 z-40 flex items-center space-x-2"
      >
        <BarChart3 className="h-4 w-4" />
        <span className="text-sm font-medium">
          A/B Test ({eventCount} events)
        </span>
      </button>
      
      <ABTestDashboard 
        isOpen={showDashboard} 
        onClose={() => setShowDashboard(false)} 
      />
    </>
  );
};