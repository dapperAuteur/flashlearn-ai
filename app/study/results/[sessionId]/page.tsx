/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getResults, getStudyHistory, StudySessionHistory, CardResult } from '@/lib/db/indexeddb';
import ShareableResultsCard from '@/components/study/ShareableResultsCard';

interface TransformedSession {
  _id: string;
  userId: string;
  listId: string;
  startTime: Date;
  endTime?: Date;
  status: 'completed';
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  completedCards: number;
  durationSeconds: number;
  setName: string;
}

export default function StudyResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [sessionData, setSessionData] = useState<TransformedSession | null>(null);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessionData = async () => {
      try {
        console.log('Loading session data for:', sessionId);
        
        // OFFLINE-FIRST: Always check IndexedDB first
        const [results, history] = await Promise.all([
          getResults(sessionId),
          getStudyHistory(100)
        ]);
        
        console.log('Results from IndexedDB:', results.length);
        console.log('History from IndexedDB:', history.length);
        
        // Find session in local history
        let session = history.find(h => h.sessionId === sessionId);
        
        if (!session && results.length > 0) {
          // Reconstruct session from results if not in history
          const correctCount = results.filter(r => r.isCorrect).length;
          const incorrectCount = results.filter(r => !r.isCorrect).length;
          const totalTime = results.reduce((sum, r) => sum + r.timeSeconds, 0);
          
          session = {
            sessionId,
            setId: 'unknown',
            setName: sessionId.includes('offline-') ? 'Offline Study Set' : 'Study Set',
            startTime: new Date(Date.now() - (totalTime * 1000)),
            endTime: new Date(),
            totalCards: results.length,
            correctCount,
            incorrectCount,
            accuracy: results.length > 0 ? (correctCount / results.length) * 100 : 0,
            durationSeconds: totalTime,
            isOfflineSession: sessionId.includes('offline-')
          };
        }
        
        if (session) {
          // Transform to expected format
          const transformedSession: TransformedSession = {
            _id: session.sessionId,
            userId: 'unknown',
            listId: session.setId,
            startTime: session.startTime,
            endTime: session.endTime,
            status: 'completed',
            totalCards: session.totalCards,
            correctCount: session.correctCount,
            incorrectCount: session.incorrectCount,
            completedCards: session.totalCards,
            durationSeconds: session.durationSeconds,
            setName: session.setName
          };
          
          setSessionData(transformedSession);
          setCardResults(results);
          console.log('Session data loaded successfully');
        } else {
          console.error('Session not found in IndexedDB:', sessionId);
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSessionData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Results Not Available</h1>
          <p className="text-gray-600 mb-4">
            This session could not be found. It may have been cleared or expired.
          </p>
          <div className="space-x-4">
            <Link 
              href="/study" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Start New Session
            </Link>
            <Link 
              href="/study/results" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              View All Results
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/study/results"
            className="inline-flex items-center text-blue-600 hover:text-blue-500 text-sm"
          >
            ← Back to All Results
          </Link>
        </div>
        
        <ShareableResultsCard 
          initialResults={sessionData} 
          cardResults={cardResults} 
        />
      </div>
    </div>
  );
}