/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useFlashcards } from "@/contexts/FlashcardContext";
import {
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface ClassroomOption {
  _id: string;
  name: string;
  students: string[];
}

interface AssignmentEntry {
  _id: string;
  title: string;
  flashcardSetId: { _id: string; title: string; cardCount: number };
  classroomId: { _id: string; name: string };
  dueDate?: string;
  studentProgress: { status: string; accuracy?: number }[];
  createdAt: string;
}

export default function AssignmentsPage() {
  const { flashcardSets } = useFlashcards();
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);

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

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedSetId || !selectedClassroomId) return;

    setCreating(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          flashcardSetId: selectedSetId,
          classroomId: selectedClassroomId,
          dueDate: dueDate || undefined,
        }),
      });
      if (res.ok) {
        setTitle("");
        setSelectedSetId("");
        setSelectedClassroomId("");
        setDueDate("");
        setShowCreate(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create assignment");
      }
    } catch {
      alert("Failed to create assignment");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Assignments</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-1.5" />
          New Assignment
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-4 sm:p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Create Assignment</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chapter 5 Review"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Flashcard Set</label>
              <select
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a set...</option>
                {flashcardSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.card_count} cards)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classroom</label>
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a classroom...</option>
                {classrooms.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.students?.length || 0} students)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating..." : "Create Assignment"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Assignment list */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">No assignments yet</h3>
          <p className="text-sm text-gray-500">Create an assignment to send flashcard sets to your students.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const completed = a.studentProgress?.filter((p) => p.status === "completed").length || 0;
            const inProgress = a.studentProgress?.filter((p) => p.status === "in_progress").length || 0;
            const total = a.studentProgress?.length || 0;
            const avgAccuracy = a.studentProgress
              ?.filter((p) => p.accuracy !== undefined)
              .reduce((sum, p, _, arr) => sum + (p.accuracy || 0) / arr.length, 0) || 0;

            return (
              <div key={a._id} className="bg-white rounded-xl shadow p-4 sm:p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{a.title}</h3>
                    <p className="text-xs text-gray-500">
                      {(a.classroomId as any)?.name || "—"} &middot;{" "}
                      {(a.flashcardSetId as any)?.title} ({(a.flashcardSetId as any)?.cardCount} cards)
                    </p>
                  </div>
                  {a.dueDate && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      new Date(a.dueDate) < new Date()
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      Due {new Date(a.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircleIcon className="h-3.5 w-3.5" /> {completed} completed
                  </span>
                  <span className="inline-flex items-center gap-1 text-yellow-600">
                    <ClockIcon className="h-3.5 w-3.5" /> {inProgress} in progress
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-400">
                    <XCircleIcon className="h-3.5 w-3.5" /> {total - completed - inProgress} not started
                  </span>
                  {avgAccuracy > 0 && (
                    <span className="text-gray-500">Avg: {avgAccuracy.toFixed(0)}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
