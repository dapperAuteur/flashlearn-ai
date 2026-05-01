/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  UserGroupIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";

interface StudentInfo {
  _id: string;
  name: string;
  email: string;
}

type LeaderboardScope = "classroom" | "global";

interface LeaderboardRow {
  rank: number;
  userId: string;
  userName: string;
  rating: number;
  wins: number;
  totalChallenges: number;
}

interface RawLeaderboardRow {
  rank?: number;
  userId: string | { _id: string };
  userName: string;
  rating: number;
  wins: number;
  totalChallenges?: number;
}

interface ClassroomDetail {
  _id: string;
  name: string;
  joinCode: string;
  students: StudentInfo[];
  teacherId: { name: string; email: string };
}

interface AssignmentEntry {
  _id: string;
  title: string;
  flashcardSetId: { title: string; cardCount: number };
  dueDate?: string;
  studentProgress: {
    studentId: string | { _id: string; name: string };
    status: string;
    accuracy?: number;
    completedAt?: string;
  }[];
}

export default function ClassroomDetailPage() {
  const params = useParams();
  const classroomId = params.id as string;
  const { data: session } = useSession();

  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [assignments, setAssignments] = useState<AssignmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>("classroom");
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classRes, assignRes] = await Promise.all([
          fetch(`/api/classrooms/${classroomId}`),
          fetch("/api/assignments"),
        ]);
        if (classRes.ok) {
          const data = await classRes.json();
          setClassroom(data.classroom);
        }
        if (assignRes.ok) {
          const data = await assignRes.json();
          // Filter assignments for this classroom
          setAssignments(
            (data.assignments || []).filter(
              (a: any) => a.classroomId?._id === classroomId || a.classroomId === classroomId,
            ),
          );
        }
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [classroomId]);

  useEffect(() => {
    setLeaderboardLoading(true);
    const url =
      leaderboardScope === "classroom"
        ? `/api/versus/leaderboard?type=classroom&classroomId=${classroomId}&limit=50&_t=${Date.now()}`
        : `/api/versus/leaderboard?type=global&limit=20&_t=${Date.now()}`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const rows = (data.leaderboard || []) as RawLeaderboardRow[];
        setLeaderboard(
          rows.map((r, idx) => ({
            rank: r.rank ?? idx + 1,
            userId: typeof r.userId === "string" ? r.userId : r.userId?._id ?? "",
            userName: r.userName,
            rating: r.rating,
            wins: r.wins,
            totalChallenges: r.totalChallenges ?? 0,
          })),
        );
      })
      .catch(() => setLeaderboard([]))
      .finally(() => setLeaderboardLoading(false));
  }, [classroomId, leaderboardScope]);

  const copyCode = () => {
    if (classroom) {
      navigator.clipboard.writeText(classroom.joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
      </div>
    );
  }

  if (!classroom) {
    return <div className="text-center py-10 text-gray-500">Classroom not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link href="/teacher/classrooms" className="text-sm text-blue-600 hover:text-blue-800 mb-1 block">
            &larr; All Classrooms
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{classroom.name}</h1>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-500">Join Code:</span>
          <code className="text-sm font-bold text-gray-900 tracking-wider">{classroom.joinCode}</code>
          <button onClick={copyCode} className="text-gray-600 hover:text-blue-600" title="Copy">
            <ClipboardDocumentIcon className="h-4 w-4" />
          </button>
          {copiedCode && <span className="text-xs text-green-600">Copied!</span>}
        </div>
      </div>

      {/* Students */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-gray-600" />
          <h2 className="text-base font-semibold text-gray-900">
            Students ({classroom.students?.length || 0})
          </h2>
        </div>
        {classroom.students?.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No students yet. Share the join code <strong>{classroom.joinCode}</strong> with your students.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {classroom.students?.map((s) => (
              <li key={s._id} className="px-4 sm:px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-amber-500" />
            Leaderboard
          </h2>
          <div
            role="tablist"
            aria-label="Leaderboard scope"
            className="inline-flex rounded-lg bg-gray-100 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={leaderboardScope === "classroom"}
              onClick={() => setLeaderboardScope("classroom")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                leaderboardScope === "classroom"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              This classroom
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={leaderboardScope === "global"}
              onClick={() => setLeaderboardScope("global")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                leaderboardScope === "global"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Everyone
            </button>
          </div>
        </div>
        {leaderboardLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
            <p className="mt-3 text-gray-500 text-sm">Loading leaderboard...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            {leaderboardScope === "classroom"
              ? "No leaderboard data yet for this classroom. Students appear here once they have a Versus rating."
              : "No global leaderboard data yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              role="table"
              aria-label={leaderboardScope === "classroom" ? "Classroom leaderboard" : "Global leaderboard"}
            >
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Rank
                  </th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Rating
                  </th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                    Wins
                  </th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                    Challenges
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaderboard.map((entry) => {
                  const isMe = entry.userId === session?.user?.id;
                  return (
                    <tr key={entry.userId} className={isMe ? "bg-blue-50" : "hover:bg-gray-50"}>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {entry.rank <= 3 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                            {entry.rank}
                          </span>
                        ) : (
                          <span className="text-gray-500">#{entry.rank}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {entry.userName}
                        {isMe && (
                          <span className="ml-2 text-xs font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        {entry.rating}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600 hidden sm:table-cell">
                        {entry.wins}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600 hidden sm:table-cell">
                        {entry.totalChallenges}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignments for this classroom */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Assignments ({assignments.length})
          </h2>
          <Link
            href="/teacher/assignments"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Create New
          </Link>
        </div>
        {assignments.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No assignments for this classroom yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {assignments.map((a) => {
              const completed = a.studentProgress?.filter((p) => p.status === "completed").length || 0;
              const inProgress = a.studentProgress?.filter((p) => p.status === "in_progress").length || 0;
              const notStarted = a.studentProgress?.filter((p) => p.status === "not_started").length || 0;

              return (
                <li key={a._id} className="px-4 sm:px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.title}</p>
                      <p className="text-xs text-gray-500">{a.flashcardSetId?.title} &middot; {a.flashcardSetId?.cardCount} cards</p>
                    </div>
                    {a.dueDate && (
                      <span className="text-xs text-gray-600">
                        Due {new Date(a.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> {completed} completed
                    </span>
                    <span className="inline-flex items-center gap-1 text-yellow-600">
                      <ClockIcon className="h-3.5 w-3.5" /> {inProgress} in progress
                    </span>
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <XCircleIcon className="h-3.5 w-3.5" /> {notStarted} not started
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
