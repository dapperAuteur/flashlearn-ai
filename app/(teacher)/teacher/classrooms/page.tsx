"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusIcon,
  UserGroupIcon,
  ClipboardDocumentIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface ClassroomEntry {
  _id: string;
  name: string;
  joinCode: string;
  students: string[];
  createdAt: string;
}

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<ClassroomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchClassrooms = async () => {
    try {
      const res = await fetch("/api/classrooms");
      if (res.ok) {
        const data = await res.json();
        setClassrooms(data.classrooms || []);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClassrooms(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setShowCreate(false);
        fetchClassrooms();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create classroom");
      }
    } catch {
      alert("Failed to create classroom");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this classroom? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/classrooms/${id}`, { method: "DELETE" });
      if (res.ok) {
        setClassrooms((prev) => prev.filter((c) => c._id !== id));
      }
    } catch {
      alert("Failed to delete classroom");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Classrooms</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-1.5" />
          New Classroom
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-4 flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Classroom name (e.g., Biology 101)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      {/* Classroom list */}
      {classrooms.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">No classrooms yet</h3>
          <p className="text-sm text-gray-500">Create a classroom and share the join code with your students.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classrooms.map((c) => (
            <div key={c._id} className="bg-white rounded-xl shadow p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3">
                <Link href={`/teacher/classrooms/${c._id}`} className="hover:text-blue-600 transition-colors">
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                </Link>
                <button
                  onClick={() => handleDelete(c._id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Delete classroom"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <span className="inline-flex items-center gap-1">
                  <UserGroupIcon className="h-4 w-4" />
                  {c.students?.length || 0} students
                </span>
              </div>

              {/* Join code */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5">
                <span className="text-xs text-gray-500">Join Code:</span>
                <code className="text-sm font-bold text-gray-900 tracking-wider">{c.joinCode}</code>
                <button
                  onClick={() => copyCode(c.joinCode)}
                  className="ml-auto text-gray-400 hover:text-blue-600 transition-colors"
                  title="Copy code"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
                {copiedCode === c.joinCode && (
                  <span className="text-xs text-green-600">Copied!</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
