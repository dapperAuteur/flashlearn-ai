'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import StudentAnalytics from '@/components/teacher/StudentAnalytics';

/**
 * /teacher/students/:studentId/analytics
 *
 * Reached from the classroom roster. The optional `classroom` query parameter
 * only decides where the back link goes; it grants nothing, because the API
 * this page reads decides for itself who may see a student's numbers.
 *
 * The search-param read sits inside its own boundary so the rest of the route
 * can still be prerendered.
 */

function StudentAnalyticsWithBackLink({ studentId }: { studentId: string }) {
  const searchParams = useSearchParams();
  return (
    <StudentAnalytics studentId={studentId} classroomId={searchParams.get('classroom')} />
  );
}

export default function StudentAnalyticsPage() {
  const params = useParams();
  const studentId = typeof params.studentId === 'string' ? params.studentId : '';

  return (
    <Suspense
      fallback={
        <p role="status" className="text-sm text-gray-700">
          Loading their progress...
        </p>
      }
    >
      <StudentAnalyticsWithBackLink studentId={studentId} />
    </Suspense>
  );
}
