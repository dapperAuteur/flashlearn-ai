/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  UserGroupIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface StudentInfo {
  _id: string;
  name: string;
  email: string;
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

  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [assignments, setAssignments] = useState<AssignmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

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
          <button onClick={copyCode} className="text-gray-400 hover:text-blue-600" title="Copy">
            <ClipboardDocumentIcon className="h-4 w-4" />
          </button>
          {copiedCode && <span className="text-xs text-green-600">Copied!</span>}
        </div>
      </div>

      {/* Students */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-gray-400" />
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
                      <span className="text-xs text-gray-400">
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
                    <span className="inline-flex items-center gap-1 text-gray-400">
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
