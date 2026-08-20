"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AcademicCapIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

interface ClassroomSummary {
  _id: string;
  name: string;
  students: string[];
  joinCode: string;
}

interface AssignmentSummary {
  _id: string;
  title: string;
  classroomId: { _id: string; name: string };
  flashcardSetId: { title: string; cardCount: number };
  dueDate?: string;
  studentProgress: { status: string }[];
}

export default function TeacherDashboardPage() {
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classRes, assignRes] = await Promise.all([
          fetch("/api/classrooms"),
          fetch("/api/assignments"),
        ]);
        if (classRes.ok) {
          const data = await classRes.json();
          setClassrooms(data.classrooms || []);
        }
        if (assignRes.ok) {
          const data = await assignRes.json();
          setAssignments(data.assignments || []);
        }
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalStudents = classrooms.reduce((sum, c) => sum + (c.students?.length || 0), 0);
  const recentAssignments = assignments.slice(0, 5);
  // With one classroom the roster is the obvious destination, so skip the list
  // page. With none, the same button still lands somewhere that can create one.
  const rosterHref =
    classrooms.length === 1 ? `/teacher/classrooms/${classrooms[0]._id}` : "/teacher/classrooms";

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Teacher Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 mb-1">
            <AcademicCapIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-500">Classrooms</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{classrooms.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserGroupIcon className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-500">Students</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardDocumentListIcon className="h-5 w-5 text-purple-600" />
            <span className="text-sm text-gray-500">Assignments</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/teacher/classrooms"
          className="flex items-center gap-3 bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="bg-blue-100 p-2 rounded-lg">
            <PlusIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">Create Classroom</p>
            <p className="text-xs text-gray-500">Set up a new class and invite students</p>
          </div>
        </Link>
        <Link
          href={rosterHref}
          className="flex items-center gap-3 bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="bg-amber-100 p-2 rounded-lg">
            <UserPlusIcon className="h-5 w-5 text-amber-700" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">Add Students</p>
            <p className="text-xs text-gray-600">
              Make accounts for students with no email, then study with them in class
            </p>
          </div>
        </Link>
        <Link
          href="/teacher/assignments"
          className="flex items-center gap-3 bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="bg-purple-100 p-2 rounded-lg">
            <ClipboardDocumentListIcon className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">Create Assignment</p>
            <p className="text-xs text-gray-500">Assign flashcard sets to your students</p>
          </div>
        </Link>
      </div>

      {/* Classrooms, each linking straight to its roster */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Your Classrooms</h2>
          <Link href="/teacher/classrooms" className="text-sm text-blue-600 hover:text-blue-800">
            Manage
          </Link>
        </div>
        {classrooms.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-600">
            No classrooms yet. Create one, then add students by name.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {classrooms.map((c) => (
              <li key={c._id} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-600">
                    {c.students?.length || 0} students &middot; Join code {c.joinCode}
                  </p>
                </div>
                <Link
                  href={`/teacher/classrooms/${c._id}`}
                  className="shrink-0 min-h-11 inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50"
                >
                  Roster
                  <span className="sr-only"> for {c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Assignments */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Recent Assignments</h2>
          {assignments.length > 5 && (
            <Link href="/teacher/assignments" className="text-sm text-blue-600 hover:text-blue-800">
              View all
            </Link>
          )}
        </div>
        {recentAssignments.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No assignments yet. Create one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentAssignments.map((a) => {
              const completed = a.studentProgress?.filter((p) => p.status === "completed").length || 0;
              const total = a.studentProgress?.length || 0;
              return (
                <li key={a._id} className="px-4 sm:px-6 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                      <p className="text-xs text-gray-500">
                        {a.classroomId?.name} &middot; {a.flashcardSetId?.cardCount} cards
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-medium text-gray-900">{completed}/{total}</p>
                      <p className="text-xs text-gray-500">completed</p>
                    </div>
                  </div>
                  {a.dueDate && (
                    <p className="text-xs text-gray-600 mt-1">
                      Due: {new Date(a.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
