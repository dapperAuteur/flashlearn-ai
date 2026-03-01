'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface SetDue {
  setId: string;
  setName: string;
  dueCount: number;
}

interface TimeBucket {
  count: number;
  sets: SetDue[];
}

interface DayCount {
  date: string;
  count: number;
}

interface ScheduleData {
  today: TimeBucket;
  tomorrow: TimeBucket;
  thisWeek: TimeBucket;
  next14Days: DayCount[];
}

export default function ReviewSchedule() {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch(`/api/study/due-cards/schedule?_t=${Date.now()}`);
        if (res.ok) {
          setSchedule(await res.json());
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-40" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 bg-gray-100 rounded-lg" />
            <div className="h-16 bg-gray-100 rounded-lg" />
            <div className="h-16 bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!schedule || (schedule.today.count === 0 && schedule.thisWeek.count === 0)) {
    return (
      <div className="bg-white shadow rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          <h2 className="text-base sm:text-lg font-medium text-gray-900">
            Review Schedule
          </h2>
        </div>
        <p className="text-sm text-gray-500">
          Study some cards to build your review schedule. Cards you study will
          automatically be scheduled for future review.
        </p>
      </div>
    );
  }

  const maxDailyCount = Math.max(...schedule.next14Days.map((d) => d.count), 1);

  const formatDay = (dateStr: string, index: number) => {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tmrw';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
  };

  return (
    <div className="bg-white shadow rounded-xl overflow-hidden">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-base sm:text-lg font-medium text-gray-900">
              Review Schedule
            </h2>
          </div>
          {schedule.today.count > 0 && (
            schedule.today.sets.length === 1 ? (
              <Link
                href={`/study?setId=${schedule.today.sets[0].setId}&review=true`}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Review Now
                <ArrowRightIcon className="h-3.5 w-3.5 ml-1" />
              </Link>
            ) : (
              <button
                onClick={() => setIsExpanded(true)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Review Now
                <ArrowRightIcon className="h-3.5 w-3.5 ml-1" />
              </button>
            )
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={`rounded-lg p-3 ${schedule.today.count > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Today
            </p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${schedule.today.count > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
              {schedule.today.count}
            </p>
            <p className="text-xs text-gray-500">cards</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Tomorrow
            </p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${schedule.tomorrow.count > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
              {schedule.tomorrow.count}
            </p>
            <p className="text-xs text-gray-500">cards</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              This Week
            </p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${schedule.thisWeek.count > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
              {schedule.thisWeek.count}
            </p>
            <p className="text-xs text-gray-500">cards</p>
          </div>
        </div>

        {/* 14-day timeline */}
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Next 14 days
          </p>
          <div className="flex items-end gap-1 h-12">
            {schedule.next14Days.map((day, i) => (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-0.5"
                title={`${day.date}: ${day.count} cards`}
              >
                <div
                  className={`w-full rounded-sm transition-all ${
                    day.count > 0
                      ? i === 0
                        ? 'bg-amber-400'
                        : 'bg-blue-400'
                      : 'bg-gray-100'
                  }`}
                  style={{
                    height: day.count > 0
                      ? `${Math.max(4, (day.count / maxDailyCount) * 40)}px`
                      : '4px',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1 mt-1">
            {schedule.next14Days.map((day, i) => (
              <div key={day.date} className="flex-1 text-center">
                <span className="text-[9px] text-gray-400 leading-none">
                  {i % 2 === 0 ? formatDay(day.date, i) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Expandable set breakdown */}
        {schedule.today.sets.length > 0 && (
          <div className="border-t border-gray-100 pt-3 mt-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors w-full"
            >
              <ClockIcon className="h-4 w-4" />
              <span className="font-medium">
                Due today across {schedule.today.sets.length} set{schedule.today.sets.length !== 1 ? 's' : ''}
              </span>
              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4 ml-auto" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 ml-auto" />
              )}
            </button>

            {isExpanded && (
              <ul className="mt-2 space-y-1.5">
                {schedule.today.sets.map((s) => (
                  <li key={s.setId}>
                    <Link
                      href={`/study?setId=${s.setId}&review=true`}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-blue-50 transition-colors group"
                    >
                      <span className="text-sm text-gray-700 group-hover:text-blue-700 truncate flex-1 mr-2">
                        {s.setName}
                      </span>
                      <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 group-hover:bg-blue-100 group-hover:text-blue-800 transition-colors">
                        {s.dueCount} due
                        <ArrowRightIcon className="h-3 w-3" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
