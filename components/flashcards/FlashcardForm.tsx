// components/flashcards/FlashcardForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FlashcardFormData } from '@/types/flashcard';
import TagSelector from './TagSelector';
import ListSelector from './ListSelector';
import FlashcardPreview from './FlashcardPreview';
import RichTextEditor from '../ui/RichTextEditor';

// Validation schema
const flashcardSchema = z.object({
  front: z.string().min(1, 'Front content is required'),
  back: z.string().min(1, 'Back content is required'),
  frontImage: z.any().optional(),
  backImage: z.any().optional(),
  tags: z.array(z.string()).default([]),
  listId: z.string().min(1, 'List selection is required'),
  difficulty: z.number().min(1).max(5).default(3),
});

interface FlashcardFormProps {
  initialData?: Partial<FlashcardFormData>;
  onSubmit: (data: FlashcardFormData) => Promise<void>;
  isEditing?: boolean;
}

export default function FlashcardForm({ 
  initialData = {}, 
  onSubmit,
  isEditing = false
}: FlashcardFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize form with react-hook-form
  const { 
    register, 
    handleSubmit, 
    watch, 
    setValue, 
    formState: { errors } 
  } = useForm<FlashcardFormData>({
    resolver: zodResolver(flashcardSchema),
    defaultValues: {
      front: initialData.front || '',
      back: initialData.back || '',
      frontImage: initialData.frontImage || undefined,
      backImage: initialData.backImage || undefined,
      tags: initialData.tags || [],
      listId: initialData.listId || '',
      difficulty: initialData.difficulty || 3,
    }
  });

  // Watch values for preview
  const watchedValues = watch();

  // Handle form submission
  const handleFormSubmit = async (data: FlashcardFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      // Success handling can go here
    } catch (error) {
      console.error('Failed to save flashcard:', error);
      // Error handling can go here
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle tag selection
  const handleTagsChange = (selectedTags: string[]) => {
    setValue('tags', selectedTags);
  };

  // Handle list selection
  const handleListChange = (selectedListId: string) => {
    setValue('listId', selectedListId);
  };

  // Update to handle rich text content
  const handleFrontContentChange = (content: string) => {
    setValue('front', content);
  };

  const handleBackContentChange = (content: string) => {
    setValue('back', content);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Front Content with Rich Text Editor */}
        <div>
          <label htmlFor="front" className="block text-sm font-medium text-gray-800 mb-1">
            Front Content
          </label>
          <RichTextEditor
            content={watchedValues.front}
            onChange={handleFrontContentChange}
            placeholder="Enter the question or term"
          />
          {errors.front && (
            <p className="mt-1 text-sm text-red-600">{errors.front.message}</p>
          )}
        </div>

        {/* Back Content with Rich Text Editor */}
        <div>
          <label htmlFor="back" className="block text-sm font-medium text-gray-800 mb-1">
            Back Content
          </label>
          <RichTextEditor
            content={watchedValues.back}
            onChange={handleBackContentChange}
            placeholder="Enter the answer or definition"
          />
          {errors.back && (
            <p className="mt-1 text-sm text-red-600">{errors.back.message}</p>
          )}
        </div>

        {/* Image uploads placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Front Image
            </label>
            <div className="h-40 bg-gray-50 border border-dashed border-gray-300 rounded-md flex items-center justify-center">
              <p className="text-sm text-gray-600">Image upload coming soon</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Back Image
            </label>
            <div className="h-40 bg-gray-50 border border-dashed border-gray-300 rounded-md flex items-center justify-center">
              <p className="text-sm text-gray-600">Image upload coming soon</p>
            </div>
          </div>
        </div>

        {/* List Selector */}
        <div>
          <label htmlFor="listId" className="block text-sm font-medium text-gray-800 mb-1">
            List
          </label>
          <select
            id="listId"
            {...register('listId')}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800"
          >
            <option value="">Select a list</option>
            <option value="placeholder-list-1">General Knowledge</option>
            <option value="placeholder-list-2">Programming</option>
          </select>
          {errors.listId && (
            <p className="mt-1 text-sm text-red-600">{errors.listId.message}</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Tags
          </label>
          <input
            type="text"
            placeholder="Add tags separated by commas"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800"
          />
          <p className="mt-1 text-xs text-gray-600">Tags help organize your flashcards</p>
        </div>

        {/* Difficulty Level */}
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-800 mb-1">
            Difficulty Level
          </label>
          <select
            id="difficulty"
            {...register('difficulty', { valueAsNumber: true })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800"
          >
            <option value="1">Very Easy</option>
            <option value="2">Easy</option>
            <option value="3">Medium</option>
            <option value="4">Difficult</option>
            <option value="5">Very Difficult</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 border border-gray-300"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <div className="space-x-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Flashcard' : 'Create Flashcard'}
            </button>
          </div>
        </div>
      </form>

      {/* Preview Section */}
      {showPreview && (
        <div className="mt-8 border-t border-gray-300 pt-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Preview</h2>
          <FlashcardPreview 
            front={watchedValues.front} 
            back={watchedValues.back}
            frontImage={watchedValues.frontImage as string} 
            backImage={watchedValues.backImage as string}
          />
        </div>
      )}
    </div>
  );
}