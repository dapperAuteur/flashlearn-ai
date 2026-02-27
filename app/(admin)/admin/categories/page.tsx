'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  GripVertical,
} from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  setCount: number;
}

export default function AdminCategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  const user = session?.user as { role?: string } | undefined;

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
      }
    } catch {
      setError('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'Admin') {
      fetchCategories();
    } else if (status === 'authenticated') {
      router.push('/flashcards');
    }
  }, [status, user?.role, router, fetchCategories]);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setCreateForm({ name: '', description: '', color: '#3B82F6', sortOrder: 0 });
        setShowCreate(false);
        fetchCategories();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create category');
      }
    } catch {
      setError('Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        setEditForm({});
        fetchCategories();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update category');
      }
    } catch {
      setError('Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Sets using this category will become uncategorized.`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
      }
    } catch {
      setError('Failed to delete category');
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat._id);
    setEditForm({
      name: cat.name,
      description: cat.description,
      color: cat.color,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage categories for organizing flashcard sets
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Medical Sciences"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={createForm.color}
                  onChange={(e) => setCreateForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-9 w-14 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={createForm.color}
                  onChange={(e) => setCreateForm((f) => ({ ...f, color: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={createForm.sortOrder}
                onChange={(e) => setCreateForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving || !createForm.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Category'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Categories list */}
      {categories.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FolderIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No categories yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-8" />
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Category</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Description</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Sets</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Order</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <GripVertical className="h-4 w-4 text-gray-300" />
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cat._id ? (
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-medium text-gray-900 text-sm">{cat.name}</span>
                          <span className="text-xs text-gray-400">/{cat.slug}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cat._id ? (
                        <input
                          type="text"
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">{cat.description || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-700">{cat.setCount}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === cat._id ? (
                        <input
                          type="number"
                          value={editForm.sortOrder ?? 0}
                          onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-16 text-center"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">{cat.sortOrder}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === cat._id ? (
                        <select
                          value={editForm.isActive ? 'active' : 'inactive'}
                          onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === 'active' }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            cat.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === cat._id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleUpdate(cat._id)}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditForm({}); }}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(cat)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat._id, cat.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {categories.map((cat) => (
              <div key={cat._id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium text-gray-900">{cat.name}</span>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      cat.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {cat.description && (
                  <p className="text-sm text-gray-500 mb-2">{cat.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{cat.setCount} sets</span>
                  <span>Order: {cat.sortOrder}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => startEdit(cat)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat._id, cat.name)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}
