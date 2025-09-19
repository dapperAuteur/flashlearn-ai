// components/study/ConfidenceResults.tsx
import { Bar } from 'react-chartjs-2';
import { useSession } from 'next-auth/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { CardResult } from '@/lib/db/indexeddb';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ConfidenceResultsProps {
  cardResults: CardResult[];
  hasConfidenceData?: boolean; // Make optional since we calculate it
}

interface ConfidenceStats {
  distribution: { [key: number]: { correct: number; incorrect: number } };
  averageConfidence: number;
  luckyGuesses: number;
  overconfidentErrors: number;
  totalAnswers: number;
}

export default function ConfidenceResults({ cardResults }: ConfidenceResultsProps) {
  const { data: session } = useSession();
  
  // Check if we have confidence data to display
  const hasConfidenceData = cardResults.some(result => result.confidenceRating !== undefined);
  
  if (!hasConfidenceData || cardResults.length === 0) {
    return null; // Don't show anything if no confidence data
  }

  const confidenceStats: ConfidenceStats = cardResults.reduce(
    (stats, result) => {
      if (!result.confidenceRating) return stats;
      
      const level = result.confidenceRating;
      if (!stats.distribution[level]) {
        stats.distribution[level] = { correct: 0, incorrect: 0 };
      }
      
      if (result.isCorrect) {
        stats.distribution[level].correct++;
        if (level <= 2) stats.luckyGuesses++;
      } else {
        stats.distribution[level].incorrect++;
        if (level >= 4) stats.overconfidentErrors++;
      }
      
      stats.totalAnswers++;
      stats.averageConfidence = ((stats.averageConfidence * (stats.totalAnswers - 1)) + level) / stats.totalAnswers;
      
      return stats;
    },
    {
      distribution: {},
      averageConfidence: 0,
      luckyGuesses: 0,
      overconfidentErrors: 0,
      totalAnswers: 0,
    } as ConfidenceStats
  );

  const chartData = {
    labels: ['1 - Guessing', '2 - Not Sure', '3 - Somewhat', '4 - Confident', '5 - Very Confident'],
    datasets: [
      {
        label: 'Correct',
        data: [1, 2, 3, 4, 5].map(level => confidenceStats.distribution[level]?.correct || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
      {
        label: 'Incorrect',
        data: [1, 2, 3, 4, 5].map(level => confidenceStats.distribution[level]?.incorrect || 0),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Confidence vs Performance',
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
      },
    },
  };

  const generateInsights = () => {
    const insights = [];
    
    if (confidenceStats.luckyGuesses > 0) {
      insights.push({
        type: 'warning',
        text: `You got ${confidenceStats.luckyGuesses} cards right by guessing. Review these topics to build real understanding.`,
        icon: '🎯'
      });
    }
    
    if (confidenceStats.overconfidentErrors > 0) {
      insights.push({
        type: 'caution',
        text: `${confidenceStats.overconfidentErrors} confident answers were wrong. Double-check your understanding of these concepts.`,
        icon: '⚠️'
      });
    }
    
    if (confidenceStats.averageConfidence >= 3.5 && confidenceStats.totalAnswers > 2) {
      const accuracy = cardResults.filter(r => r.isCorrect).length / cardResults.length;
      if (accuracy >= 0.8) {
        insights.push({
          type: 'success',
          text: 'Great confidence calibration! You know when you know and when you don\'t.',
          icon: '🎯'
        });
      }
    }
    
    if (confidenceStats.averageConfidence < 2.5) {
      insights.push({
        type: 'info',
        text: 'Consider reviewing the material more before testing. Your confidence will grow with familiarity.',
        icon: '📚'
      });
    }

    return insights;
  };

  const insights = generateInsights();

  return (
    <div className="mt-6 space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <Bar data={chartData} options={chartOptions} />
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-800">
            {confidenceStats.averageConfidence.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Avg Confidence</div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-800">
            {confidenceStats.luckyGuesses}
          </div>
          <div className="text-sm text-yellow-600">Lucky Guesses</div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-800">
            {confidenceStats.overconfidentErrors}
          </div>
          <div className="text-sm text-red-600">Overconfident Errors</div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-800">
            {Math.round((cardResults.filter(r => r.isCorrect).length / cardResults.length) * 100)}%
          </div>
          <div className="text-sm text-blue-600">Accuracy</div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">📊 Study Insights</h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  insight.type === 'success'
                    ? 'bg-green-50 border-green-400 text-green-800'
                    : insight.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                    : insight.type === 'caution'
                    ? 'bg-red-50 border-red-400 text-red-800'
                    : 'bg-blue-50 border-blue-400 text-blue-800'
                }`}
              >
                <span className="mr-2">{insight.icon}</span>
                {insight.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign-in prompt for unauthenticated users */}
      {!session?.user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-blue-800 text-sm">
            <strong>💡 Sign in to track confidence patterns</strong> - See which cards you got right by guessing vs. actual knowledge
          </p>
        </div>
      )}
    </div>
  );
}