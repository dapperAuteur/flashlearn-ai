'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { clientApi } from '@/lib/api';

interface DueSet { setId: string; setName: string; dueCount: number }
interface Schedule { today: number; tomorrow: number; thisWeek: number }

export default function StudyPage() {
  const [dueSets, setDueSets] = useState<DueSet[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [startingSetId, setStartingSetId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dueData, scheduleData] = await Promise.all([
          clientApi<{ sets: DueSet[]; totalDue: number }>('GET', '/study/due-cards'),
          clientApi<Schedule>('GET', '/study/due-cards/schedule'),
        ]);
        setDueSets(dueData.sets);
        setTotalDue(dueData.totalDue);
        setSchedule(scheduleData);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, []);

  const startSession = async (setId: string) => {
    setStartingSetId(setId);
    try {
      const data = await clientApi<{ sessionId: string }>('POST', '/study/sessions', {
        setId, studyMode: 'classic', studyDirection: 'front-to-back',
      });
      window.location.href = `/study/${data.sessionId}`;
    } catch { setStartingSetId(''); }
  };

  if (loading) return <p className="text-gray-500 text-center py-12">Loading study data...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Study</h1>

      {/* Schedule summary */}
      {schedule && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{schedule.today}</p>
            <p className="text-xs text-gray-500">Due Today</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{schedule.tomorrow}</p>
            <p className="text-xs text-gray-500">Tomorrow</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{schedule.thisWeek}</p>
            <p className="text-xs text-gray-500">This Week</p>
          </div>
        </div>
      )}

      {/* Due sets */}
      {totalDue === 0 ? (
        <div className="text-center py-12 bg-white border rounded-lg">
          <p className="text-gray-500 mb-4">No cards due for review right now!</p>
          <Link href="/generate" className="text-blue-600 hover:underline text-sm">Generate some flashcards</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {dueSets.map(set => (
            <div key={set.setId} className="bg-white border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h2 className="font-medium text-gray-900">{set.setName}</h2>
                <p className="text-xs text-gray-500">{set.dueCount} cards due</p>
              </div>
              <button onClick={() => startSession(set.setId)}
                disabled={startingSetId === set.setId}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}>
                {startingSetId === set.setId ? 'Starting...' : 'Study'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
