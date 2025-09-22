'use client';

import { useState } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Category, saveCategory, getCategories } from '@/lib/db/indexeddb';
import { Logger, LogContext } from '@/lib/logging/client-logger';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
}

export default function CategoryManager({ 
  isOpen, 
  onClose, 
  categories, 
  onCategoriesChange 
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setSaving(true);
    try {
      const newCategory: Category = {
        id: `category-${Date.now()}`,
        name: newCategoryName.trim(),
        color: newCategoryColor,
        createdAt: new Date()
      };
      
      await saveCategory(newCategory);
      const updatedCategories = await getCategories();
      onCategoriesChange(updatedCategories);
      
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
      
      Logger.log(LogContext.FLASHCARD, 'Category created', { categoryName: newCategory.name });
    } catch (error) {
      Logger.error(LogContext.FLASHCARD, 'Failed to create category', { error });
      alert('Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const colorOptions = [
    '#3B82F6', // Blue
    '#10B981', // Green  
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Manage Categories</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Add New Category */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex space-x-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newCategoryColor === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim() || saving}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {saving ? 'Adding...' : 'Add Category'}
              </button>
            </div>
            
            {/* Existing Categories */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Existing Categories</h4>
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No categories yet</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categories.map(category => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {category.name}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          // TODO: Implement delete category
                          Logger.log(LogContext.FLASHCARD, 'Delete category clicked', { categoryId: category.id });
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}