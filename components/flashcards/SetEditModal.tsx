'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { savePendingChange } from '@/lib/db/indexeddb';
import { Logger, LogContext } from '@/lib/logging/client-logger';

interface CategoryOption {
  id: string;
  name: string;
  color: string;
}

interface FlashcardSet {
  _id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  cardCount: number;
  categories?: string[];
  tags?: string[];
}

interface SetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  set: FlashcardSet;
  onSave: () => void;
  isAdmin?: boolean;
}

export default function SetEditModal({ isOpen, onClose, set, onSave, isAdmin }: SetEditModalProps) {
  const [title, setTitle] = useState(set.title);
  const [description, setDescription] = useState(set.description || '');
  const [isPublic, setIsPublic] = useState(set.isPublic);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(set.categories || []);
  const [tags, setTags] = useState<string>(set.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(set.title);
      setDescription(set.description || '');
      setIsPublic(set.isPublic);
      setSelectedCategories(set.categories || []);
      setTags(set.tags?.join(', ') || '');
    }
  }, [isOpen, set]);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingCategories(true);
    fetch('/api/sets/categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories) {
          setCategoryOptions(data.categories);
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoadingCategories(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedSet: Record<string, unknown> = {
        ...set,
        title: title.trim(),
        description: description.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        categories: selectedCategories,
      };
      if (isAdmin) {
        updatedSet.isPublic = isPublic;
      }

      // Save as pending change for offline sync
      await savePendingChange({
        id: `update-set-${set._id}-${Date.now()}`,
        type: 'update',
        entity: 'set',
        data: updatedSet,
        timestamp: new Date(),
        retryCount: 0
      });

      // If online, try to sync immediately
      if (navigator.onLine) {
        try {
          const response = await fetch(`/api/sets/${set._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSet)
          });

          if (response.ok) {
            Logger.log(LogContext.FLASHCARD, 'Set updated successfully', { setId: set._id });
          }
        } catch (error) {
          Logger.warning(LogContext.FLASHCARD, 'Failed to sync set update immediately', { error });
        }
      }

      onSave();
      onClose();
    } catch (error) {
      Logger.error(LogContext.FLASHCARD, 'Failed to save set changes', { error });
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />

      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Edit Flashcard Set</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                {loadingCategories ? (
                  <p className="text-sm text-gray-500">Loading categories...</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() =>
                            isSelected
                              ? setSelectedCategories(prev => prev.filter(id => id !== cat.id))
                              : selectedCategories.length < 5 && setSelectedCategories(prev => [...prev, cat.id])
                          }
                          className="px-3 py-1 rounded-full text-xs font-medium transition-colors border"
                          style={{
                            backgroundColor: isSelected ? cat.color : `${cat.color}10`,
                            color: isSelected ? 'white' : cat.color,
                            borderColor: cat.color,
                          }}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Select up to 5 categories</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="math, science, vocabulary"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {isAdmin && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                    Make this set public
                  </label>
                </div>
              )}
            </div>
          </div>

        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}