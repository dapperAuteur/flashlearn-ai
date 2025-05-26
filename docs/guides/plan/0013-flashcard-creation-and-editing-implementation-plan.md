# Implementation Plan: Flashcard Creation and Editing

Let's develop a comprehensive plan for implementing the Flashcard Creation and Editing features for Phase 2, focusing on creating a rich and intuitive user interface.

## Plan Overview

For this part, we'll focus on building:

1. A flexible flashcard creation form with rich text editor
2. Image upload functionality for visual flashcards
3. Editing interface for existing flashcards
4. Batch operations for efficient management

## Component Design

### Flashcard Creator Component

The main form will have:
- Front/back content with rich text editing
- Image upload dropzones for both sides
- Tag selection/creation interface
- List assignment dropdown
- Difficulty level selector
- Preview functionality

### Rich Text Editor Integration

We'll use a lightweight yet powerful rich text editor like TipTap or Slate that supports:
- Basic formatting (bold, italic, underline)
- Lists (bulleted, numbered)
- Headings and text alignment
- Image embedding
- Code blocks (for technical flashcards)

### Image Management

We'll implement:
- Drag-and-drop upload zones
- Image cropping/resizing tools
- Cloud storage integration with fallback
- Optimized loading for offline use

## Data Flow

1. User enters content in the form
2. Client-side validation ensures quality
3. API request creates/updates the flashcard
4. Database stores the content with proper relationships
5. Local storage keeps a copy for offline use

## Implementation Stages

### Stage 1: Basic Form Structure
- Set up form components and layout
- Implement basic validation
- Create API endpoints for CRUD operations

### Stage 2: Rich Text Editor Integration
- Add rich text editing capabilities
- Implement content sanitization
- Create preview functionality

### Stage 3: Image Handling
- Build image upload system
- Add cropping and optimization tools
- Implement storage and retrieval logic

### Stage 4: Batch Operations
- Create multi-select interface
- Implement batch tag/list assignment
- Add bulk delete functionality

## Next Steps

With this plan, we can proceed to implement each stage systematically. I recommend starting with building the basic form structure and API endpoints, then progressively enhancing with rich text and image capabilities.

Would you like me to begin the implementation of any specific part of this plan?

# Implementing Stage 1: Basic Form Structure

Let's set up the basic form components and layout for our flashcard creation interface following our style guide.

## 1. File Organization

First, let's create the necessary files and folders:

```
/components
  /flashcards
    FlashcardForm.tsx
    FlashcardPreview.tsx
    TagSelector.tsx
    ListSelector.tsx
/pages
  /dashboard
    /flashcards
      create.tsx
      [id]/edit.tsx
/lib
  /api
    flashcardService.ts
/types
  flashcard.ts
```

## 2. Define TypeScript Types

Let's start by defining our flashcard types:

```typescript
// types/flashcard.ts
export interface Flashcard {
  id?: string;
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
  tags: string[];
  listId: string;
  difficulty: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FlashcardFormData {
  front: string;
  back: string;
  frontImage?: File | string;
  backImage?: File | string;
  tags: string[];
  listId: string;
  difficulty: number;
}
```

## 3. Create Base Form Component

Let's build the basic form structure:

```typescript
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Edit Flashcard' : 'Create New Flashcard'}
      </h1>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Front Content */}
        <div>
          <label htmlFor="front" className="block text-sm font-medium text-gray-700 mb-1">
            Front Content
          </label>
          <textarea
            id="front"
            {...register('front')}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Enter the question or term"
          />
          {errors.front && (
            <p className="mt-1 text-sm text-red-600">{errors.front.message}</p>
          )}
        </div>

        {/* Back Content */}
        <div>
          <label htmlFor="back" className="block text-sm font-medium text-gray-700 mb-1">
            Back Content
          </label>
          <textarea
            id="back"
            {...register('back')}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Enter the answer or definition"
          />
          {errors.back && (
            <p className="mt-1 text-sm text-red-600">{errors.back.message}</p>
          )}
        </div>

        {/* Placeholder for image uploads - to be implemented later */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Front Image (Coming soon)
            </label>
            <div className="h-40 bg-gray-100 border border-dashed border-gray-300 rounded-md flex items-center justify-center">
              <p className="text-sm text-gray-500">Image upload will be available soon</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Back Image (Coming soon)
            </label>
            <div className="h-40 bg-gray-100 border border-dashed border-gray-300 rounded-md flex items-center justify-center">
              <p className="text-sm text-gray-500">Image upload will be available soon</p>
            </div>
          </div>
        </div>

        {/* List Selector Placeholder */}
        <div>
          <label htmlFor="listId" className="block text-sm font-medium text-gray-700 mb-1">
            List
          </label>
          <select
            id="listId"
            {...register('listId')}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a list</option>
            <option value="placeholder-list-1">General Knowledge</option>
            <option value="placeholder-list-2">Programming</option>
          </select>
          {errors.listId && (
            <p className="mt-1 text-sm text-red-600">{errors.listId.message}</p>
          )}
        </div>

        {/* Tags Placeholder */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <input
            type="text"
            placeholder="Add tags separated by commas"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Tags help organize your flashcards</p>
        </div>

        {/* Difficulty Level */}
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty Level
          </label>
          <select
            id="difficulty"
            {...register('difficulty', { valueAsNumber: true })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
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
        <div className="mt-8 border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
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
```

## 4. Create Flashcard Preview Component

```typescript
// components/flashcards/FlashcardPreview.tsx
'use client';

import { useState } from 'react';

interface FlashcardPreviewProps {
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
}

export default function FlashcardPreview({ 
  front, 
  back, 
  frontImage, 
  backImage 
}: FlashcardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="w-full max-w-md h-64 mx-auto cursor-pointer perspective-1000" 
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front of card */}
        <div className="absolute w-full h-full backface-hidden bg-blue-100 border border-blue-200 rounded-lg p-4 flex flex-col justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Front</h3>
            <div className="whitespace-pre-wrap">{front || 'Front content will appear here'}</div>
            {frontImage && (
              <div className="mt-2">
                <img src={frontImage} alt="Front" className="max-h-32 mx-auto" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 text-center mt-4">Click to flip</div>
        </div>

        {/* Back of card */}
        <div className="absolute w-full h-full backface-hidden bg-green-100 border border-green-200 rounded-lg p-4 flex flex-col justify-center rotate-y-180">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Back</h3>
            <div className="whitespace-pre-wrap">{back || 'Back content will appear here'}</div>
            {backImage && (
              <div className="mt-2">
                <img src={backImage} alt="Back" className="max-h-32 mx-auto" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 text-center mt-4">Click to flip</div>
        </div>
      </div>
    </div>
  );
}
```

## 5. Create Flashcard Creation Page

```typescript
// app/dashboard/flashcards/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardForm from '@/components/flashcards/FlashcardForm';
import { FlashcardFormData } from '@/types/flashcard';

export default function CreateFlashcardPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleCreateFlashcard = async (data: FlashcardFormData) => {
    try {
      console.log('Creating flashcard with data:', data);
      
      // This will be replaced with actual API call in the next stages
      // const response = await fetch('/api/flashcards', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data),
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to create flashcard');
      // }

      // Simulate success for now
      setTimeout(() => {
        console.log('Flashcard created successfully');
        router.push('/dashboard/flashcards');
      }, 1000);
      
    } catch (error) {
      console.error('Error creating flashcard:', error);
      setError('Failed to create flashcard. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <FlashcardForm onSubmit={handleCreateFlashcard} />
    </div>
  );
}
```

## 6. CSS Utilities for Flashcard Flip Effect

Add these custom utilities to your CSS file (globals.css):

```css
/* globals.css additions */
@layer utilities {
  .perspective-1000 {
    perspective: 1000px;
  }
  
  .transform-style-preserve-3d {
    transform-style: preserve-3d;
  }
  
  .backface-hidden {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
}
```

## Next Steps

This completes Stage 1 of our implementation plan. We've set up:

1. Basic form structure with all necessary fields
2. Simple validation using Zod
3. Basic preview functionality with card flipping effect
4. Layout for the create page

In the next stage, we'll:
1. Integrate a rich text editor
2. Implement the API service for creating flashcards
3. Create the tag and list selector components
4. Add proper validation and error handling

Would you like me to proceed with implementing Stage 2: Rich Text Editor Integration next?

# Integrating a Rich Text Editor

Let's integrate a rich text editor and fix the text visibility issues. For this, we'll use TipTap, a modern headless rich text editor that provides excellent customization options.

## 1. Install Required Packages

First, install the necessary dependencies:

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-color
```

## 2. Create a Rich Text Editor Component

```typescript
// components/ui/RichTextEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Color from '@tiptap/extension-color';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ 
  content, 
  onChange,
  placeholder = 'Enter content here...'
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Color
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose focus:outline-none min-h-[200px] max-w-none p-4',
        placeholder
      },
    },
  });

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="border border-gray-300 rounded-md bg-gray-50 overflow-hidden">
      <div className="bg-white border-b border-gray-300 p-2 flex flex-wrap gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Bold"
        >
          <Bold className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Italic"
        >
          <Italic className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Bullet List"
        >
          <List className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          title="Numbered List"
        >
          <ListOrdered className="w-5 h-5" />
        </button>
      </div>
      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}

// Simple icon components
function Bold({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
    </svg>
  );
}

function Italic({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="19" y1="4" x2="10" y2="4"></line>
      <line x1="14" y1="20" x2="5" y2="20"></line>
      <line x1="15" y1="4" x2="9" y2="20"></line>
    </svg>
  );
}

function List({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  );
}

function ListOrdered({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="10" y1="6" x2="21" y2="6"></line>
      <line x1="10" y1="12" x2="21" y2="12"></line>
      <line x1="10" y1="18" x2="21" y2="18"></line>
      <path d="M4 6h1v4"></path>
      <path d="M4 10h2"></path>
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
    </svg>
  );
}
```

## 3. Update the Flashcard Form to Use the Rich Text Editor

```typescript
// components/flashcards/FlashcardForm.tsx

// Add import for the rich text editor
import RichTextEditor from '@/components/ui/RichTextEditor';

// ...existing imports...

export default function FlashcardForm({ 
  initialData = {}, 
  onSubmit,
  isEditing = false
}: FlashcardFormProps) {
  // ...existing code...

  // Update to handle rich text content
  const handleFrontContentChange = (content: string) => {
    setValue('front', content);
  };

  const handleBackContentChange = (content: string) => {
    setValue('back', content);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        {isEditing ? 'Edit Flashcard' : 'Create New Flashcard'}
      </h1>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Front Content with Rich Text Editor */}
        <div>
          <label htmlFor="front" className="block text-sm font-medium text-gray-700 mb-1">
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
          <label htmlFor="back" className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* Rest of the form remains the same */}
        {/* ... */}
      </form>

      {/* Update the preview component to handle HTML content */}
      {showPreview && (
        <div className="mt-8 border-t pt-6">
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
```

## 4. Update the Flashcard Preview Component to Handle HTML Content

```typescript
// components/flashcards/FlashcardPreview.tsx
'use client';

import { useState } from 'react';

interface FlashcardPreviewProps {
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
}

export default function FlashcardPreview({ 
  front, 
  back, 
  frontImage, 
  backImage 
}: FlashcardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="w-full max-w-md h-64 mx-auto cursor-pointer perspective-1000" 
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front of card */}
        <div className="absolute w-full h-full backface-hidden bg-blue-100 border border-blue-200 rounded-lg p-4 flex flex-col justify-center overflow-auto">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2 text-blue-900">Front</h3>
            {front ? (
              <div 
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: front }} 
              />
            ) : (
              <p className="text-gray-500">Front content will appear here</p>
            )}
            {frontImage && (
              <div className="mt-2">
                <img src={frontImage} alt="Front" className="max-h-32 mx-auto" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-600 text-center mt-4">Click to flip</div>
        </div>

        {/* Back of card */}
        <div className="absolute w-full h-full backface-hidden bg-green-100 border border-green-200 rounded-lg p-4 flex flex-col justify-center overflow-auto rotate-y-180">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2 text-green-900">Back</h3>
            {back ? (
              <div 
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: back }} 
              />
            ) : (
              <p className="text-gray-500">Back content will appear here</p>
            )}
            {backImage && (
              <div className="mt-2">
                <img src={backImage} alt="Back" className="max-h-32 mx-auto" />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-600 text-center mt-4">Click to flip</div>
        </div>
      </div>
    </div>
  );
}
```

## 5. Add TailwindCSS Typography Plugin for Rich Text Rendering

To properly style the rich text content, we need to add the Typography plugin to Tailwind:

```bash
npm install @tailwindcss/typography
```

Update your tailwind.config.js file:

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Your extensions
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

## 6. Add Additional CSS for Text Visibility

Add these additional styles to your globals.css to ensure text visibility:

```css
/* Add to globals.css */
@layer base {
  body {
    @apply text-gray-800 bg-gray-50;
  }
  
  h1, h2, h3, h4, h5, h6 {
    @apply text-gray-800;
  }
  
  .ProseMirror {
    @apply min-h-[200px] text-gray-800;
  }
  
  .ProseMirror p.is-editor-empty:first-child::before {
    @apply text-gray-400 float-left h-0 pointer-events-none;
    content: attr(data-placeholder);
  }
}
```

This implementation gives you:

1. A rich text editor with basic formatting options (bold, italic, bullet lists, numbered lists)
2. Improved text visibility with proper contrast on all backgrounds
3. Preview functionality that correctly renders HTML content
4. Responsive design for all screen sizes

The rich text editor is now integrated and all text should be clearly visible with proper contrast against their backgrounds.

Let's refactor the components to ensure better text contrast throughout the application.

```typescript
// components/ui/RichTextEditor.tsx
// Update the toolbar to have better contrast
export default function RichTextEditor({ 
  content, 
  onChange,
  placeholder = 'Enter content here...'
}: RichTextEditorProps) {
  // ...existing code...

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="bg-gray-100 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded ${editor.isActive('bold') ? 'bg-blue-200 text-blue-800' : 'text-gray-700 hover:bg-gray-200'}`}
          title="Bold"
        >
          <Bold className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded ${editor.isActive('italic') ? 'bg-blue-200 text-blue-800' : 'text-gray-700 hover:bg-gray-200'}`}
          title="Italic"
        >
          <Italic className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-blue-200 text-blue-800' : 'text-gray-700 hover:bg-gray-200'}`}
          title="Bullet List"
        >
          <List className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-blue-200 text-blue-800' : 'text-gray-700 hover:bg-gray-200'}`}
          title="Numbered List"
        >
          <ListOrdered className="w-5 h-5" />
        </button>
      </div>
      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}
```

```typescript
// components/flashcards/FlashcardForm.tsx
// Update form components for better contrast

export default function FlashcardForm({ 
  initialData = {}, 
  onSubmit,
  isEditing = false
}: FlashcardFormProps) {
  // ...existing code...

  return (
    <div className="bg-gray-50 rounded-lg shadow-md p-6 border border-gray-200">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        {isEditing ? 'Edit Flashcard' : 'Create New Flashcard'}
      </h1>

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

        {/* Placeholder for image uploads - to be implemented later */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Front Image (Coming soon)
            </label>
            <div className="h-40 bg-white border border-dashed border-gray-300 rounded-md flex items-center justify-center">
              <p className="text-sm text-gray-600">Image upload will be available soon</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Back Image (Coming soon)
            </label>
            <div className="h-40 bg-white border border-dashed border-gray-300 rounded-md flex items-center justify-center">
              <p className="text-sm text-gray-600">Image upload will be available soon</p>
            </div>
          </div>
        </div>

        {/* List Selector Placeholder - Updated for better contrast */}
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

        {/* Tags Placeholder - Updated for better contrast */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Tags
          </label>
          <input
            type="text"
            placeholder="Add tags separated by commas"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
          />
          <p className="mt-1 text-xs text-gray-600">Tags help organize your flashcards</p>
        </div>

        {/* Difficulty Level - Updated for better contrast */}
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

        {/* Action Buttons - Updated for better contrast */}
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 border border-gray-300"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 border border-blue-700"
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
```

```typescript
// app/dashboard/flashcards/create/page.tsx
// Update the page container for consistent styling

export default function CreateFlashcardPage() {
  // ...existing code...

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-100 min-h-screen">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <FlashcardForm onSubmit={handleCreateFlashcard} />
    </div>
  );
}
```

```css
/* Add to globals.css */
@layer base {
  body {
    @apply text-gray-800 bg-gray-100;
  }
  
  h1, h2, h3, h4, h5, h6 {
    @apply text-gray-800;
  }
  
  /* Improved styles for the TipTap editor */
  .ProseMirror {
    @apply min-h-[200px] text-gray-800 bg-white p-4;
  }
  
  .ProseMirror p.is-editor-empty:first-child::before {
    @apply text-gray-500 float-left h-0 pointer-events-none;
    content: attr(data-placeholder);
  }
  
  /* Improved select boxes and inputs */
  select, input[type="text"], input[type="email"], input[type="password"], textarea {
    @apply text-gray-800 bg-white border-gray-300;
  }
  
  /* Improved option text */
  option {
    @apply text-gray-800 bg-white;
  }
}
```

These updates improve contrast throughout the application by:

1. Using a light gray background (bg-gray-50) for the form container
2. Ensuring all form elements have white backgrounds with dark text
3. Improving button contrast with proper borders and hover states
4. Making editor toolbar buttons more visible with better contrast
5. Using consistent text colors for all text elements
6. Adding global styles for consistent form element appearance

After reviewing the repository's layout components, I'll create a unified layout for the flashcard creation form that integrates with the existing components.

Let's modify the flashcard creation page to use the DashboardLayout:

```typescript
// app/dashboard/flashcards/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FlashcardForm from '@/components/flashcards/FlashcardForm';
import { FlashcardFormData } from '@/types/flashcard';

export default function CreateFlashcardPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleCreateFlashcard = async (data: FlashcardFormData) => {
    try {
      console.log('Creating flashcard with data:', data);
      
      // Simulating success for now
      setTimeout(() => {
        console.log('Flashcard created successfully');
        router.push('/dashboard/flashcards');
      }, 1000);
      
    } catch (error) {
      console.error('Error creating flashcard:', error);
      setError('Failed to create flashcard. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Create New Flashcard</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <FlashcardForm onSubmit={handleCreateFlashcard} />
      </div>
    </DashboardLayout>
  );
}
```

Now, let's refine the FlashcardForm component to better integrate with your existing UI:

```typescript
// components/flashcards/FlashcardForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FlashcardFormData } from '@/types/flashcard';
import RichTextEditor from '@/components/ui/RichTextEditor';
import FlashcardPreview from './FlashcardPreview';

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
    } catch (error) {
      console.error('Failed to save flashcard:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle rich text content changes
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
```

This implementation:

1. Uses the DashboardLayout for consistent navigation
2. Maintains the visual style of your existing UI components
3. Ensures all form elements have proper contrast
4. Keeps the rich text editor functionality

The DashboardLayout component will handle the header, sidebar, and overall page structure, ensuring consistent navigation across all pages.

Based on your screenshot, I can see several UI issues that need to be fixed. Let's address each problem:

1. Fix the empty space between sidebar and content
2. Fix the hidden settings button
3. Fix the user menu opening off-screen

Here are the necessary changes:

```typescript
// components/layout/DashboardLayout.tsx
// Update to fix the spacing issue and ensure settings button is visible

'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - adjust padding-bottom to show settings */}
      <div className="fixed inset-y-0 left-0 z-50 md:relative">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          className="pb-24 md:pb-24" // Added padding to ensure settings is visible
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:pl-0">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Page Content - remove left padding to eliminate gap */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

```typescript
// components/layout/Header.tsx
// Fix user menu opening off-screen

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, User } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
      <div className="flex items-center">
        <button
          className="md:hidden mr-4 text-gray-600 hover:text-gray-900"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">FlashLearn AI</h1>
      </div>
      
      <div className="relative" ref={menuRef}>
        <button
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
        >
          <span className="hidden sm:inline-block">
            {session?.user?.name || 'User'}
          </span>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
            <User size={16} />
          </div>
        </button>
        
        {/* User menu - position right-0 to keep on screen */}
        {userMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
            <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
              Profile
            </Link>
            <button
              onClick={() => signOut()}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
```

```typescript
// components/layout/Sidebar.tsx
// Ensure settings button is visible by adding height constraint

export default function Sidebar({ isOpen, onClose, className = '' }: SidebarProps) {
  return (
    <div
      className={`${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } transform fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out z-30 
      flex flex-col overflow-y-auto max-h-screen ${className}`} // Added max-h-screen
    >
      {/* Close button for mobile */}
      <div className="md:hidden p-4 flex justify-end">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>
      
      {/* Logo */}
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold text-blue-600">FlashLearn AI</h1>
      </div>
      
      {/* Navigation - wrap in scrollable container */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <NavItem href="/dashboard" icon={<Home size={20} />} active={pathname === '/dashboard'}>
          Dashboard
        </NavItem>
        <NavItem href="/flashcards" icon={<File size={20} />} active={pathname.includes('/flashcards')}>
          Flashcards
        </NavItem>
        <NavItem href="/lists" icon={<List size={20} />} active={pathname.includes('/lists')}>
          Lists
        </NavItem>
        <NavItem href="/statistics" icon={<BarChart size={20} />} active={pathname.includes('/statistics')}>
          Statistics
        </NavItem>
        <NavItem href="/team" icon={<Users size={20} />} active={pathname.includes('/team')}>
          Team
        </NavItem>
        <NavItem href="/settings" icon={<Settings size={20} />} active={pathname.includes('/settings')}>
          Settings
        </NavItem>
      </nav>
    </div>
  );
}
```

```typescript
// app/dashboard/flashcards/create/page.tsx
// Update page layout

export default function CreateFlashcardPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // ...existing code...

  return (
    <>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Create New Flashcard</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <FlashcardForm onSubmit={handleCreateFlashcard} />
      </div>
    </>
  );
}
```

These changes will:

1. Remove the gap between sidebar and content by adjusting padding
2. Ensure the settings button is visible by adding padding-bottom to the sidebar
3. Fix the user menu positioning to stay on-screen using `right-0`
4. Improve overall layout responsiveness

You'll need to ensure these components compile properly with any dependencies from your actual codebase.

Let's implement the server-side functionality to save flashcards. We'll need to:

1. Create the API endpoint
2. Set up the database model
3. Connect the form to the API

First, let's create the API endpoint:

```typescript
// app/api/flashcards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { sanitizeHtml } from '@/lib/utils/sanitize';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.front || !data.back || !data.listId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Sanitize HTML content
    const sanitizedData = {
      ...data,
      front: sanitizeHtml(data.front),
      back: sanitizeHtml(data.back)
    };
    
    // Add timestamps and user ID
    const flashcardData = {
      ...sanitizedData,
      userId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Insert flashcard
    const result = await db.collection('flashcards').insertOne(flashcardData);
    
    // Update card count in list
    await db.collection('lists').updateOne(
      { _id: new ObjectId(data.listId), userId: session.user.id },
      { $inc: { cardCount: 1 } }
    );
    
    // Return success with ID
    return NextResponse.json({
      id: result.insertedId.toString(),
      message: 'Flashcard created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating flashcard:', error);
    return NextResponse.json({ 
      error: 'Failed to create flashcard' 
    }, { status: 500 });
  }
}
```

Now let's create a utility for HTML sanitization:

```typescript
// lib/utils/sanitize.ts
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create window object for DOMPurify
const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'u', 'p', 'br', 'ul', 'ol', 'li', 
      'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'span', 'div', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'class', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick']
  });
}
```

Install the required packages:

```bash
npm install dompurify jsdom
npm install --save-dev @types/dompurify @types/jsdom
```

Now, update the client-side service to connect to the API:

```typescript
// lib/api/flashcardService.ts
import { Flashcard, FlashcardFormData } from '@/types/flashcard';

/**
 * Create a new flashcard
 */
export async function createFlashcard(data: FlashcardFormData): Promise<Flashcard> {
  console.log('Creating flashcard with data:', data);
  
  const response = await fetch('/api/flashcards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create flashcard');
  }
  
  const result = await response.json();
  return {
    id: result.id,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
```

Finally, connect the form to the API service:

```typescript
// app/dashboard/flashcards/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FlashcardForm from '@/components/flashcards/FlashcardForm';
import { FlashcardFormData } from '@/types/flashcard';
import { createFlashcard } from '@/lib/api/flashcardService';

export default function CreateFlashcardPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateFlashcard = async (data: FlashcardFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await createFlashcard(data);
      
      // Success - redirect to flashcards page
      router.push('/dashboard/flashcards');
      
    } catch (error) {
      console.error('Error creating flashcard:', error);
      setError(error instanceof Error ? error.message : 'Failed to create flashcard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Create New Flashcard</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <FlashcardForm 
          onSubmit={handleCreateFlashcard} 
          isSubmitting={isSubmitting}
        />
      </div>
    </>
  );
}
```

Update the `FlashcardForm` component to accept the `isSubmitting` prop:

```typescript
// components/flashcards/FlashcardForm.tsx
interface FlashcardFormProps {
  initialData?: Partial<FlashcardFormData>;
  onSubmit: (data: FlashcardFormData) => Promise<void>;
  isEditing?: boolean;
  isSubmitting?: boolean; // Add this prop
}

export default function FlashcardForm({ 
  initialData = {}, 
  onSubmit,
  isEditing = false,
  isSubmitting = false // Set default value
}: FlashcardFormProps) {
  // Replace the internal isSubmitting state with the prop
  // const [isSubmitting, setIsSubmitting] = useState(false);
  
  // In handleFormSubmit, remove the setIsSubmitting calls
  const handleFormSubmit = async (data: FlashcardFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Failed to save flashcard:', error);
    }
  };
  
  // Update the submit button to use the prop
  <button
    type="submit"
    disabled={isSubmitting}
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
  >
    {isSubmitting ? 'Saving...' : isEditing ? 'Update Flashcard' : 'Create Flashcard'}
  </button>
```

This implementation provides:

1. A secure API endpoint for creating flashcards
2. HTML sanitization to prevent XSS attacks
3. List count updates when flashcards are added
4. Proper error handling on both client and server

Let's refactor the code to include the logging functionality:

```typescript
// app/api/flashcards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import { Logger, LogContext } from "@/lib/logging/logger";
import { AnalyticsLogger } from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  // Generate request ID for tracking this operation
  const requestId = await Logger.info(
    LogContext.FLASHCARD,
    "Flashcard creation request received",
    { request }
  );

  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      await Logger.warning(
        LogContext.FLASHCARD,
        "Unauthorized flashcard creation attempt",
        { requestId }
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    await Logger.debug(
      LogContext.FLASHCARD, 
      "Processing flashcard creation", 
      { userId, requestId }
    );

    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.front || !data.back || !data.listId) {
      await Logger.warning(
        LogContext.FLASHCARD,
        "Invalid flashcard data - missing required fields",
        { requestId, userId, metadata: { data } }
      );
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Sanitize HTML content
    const sanitizedData = {
      ...data,
      front: sanitizeHtml(data.front),
      back: sanitizeHtml(data.back)
    };
    
    // Add timestamps and user ID
    const flashcardData = {
      ...sanitizedData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Insert flashcard
    const result = await db.collection('flashcards').insertOne(flashcardData);
    const flashcardId = result.insertedId.toString();
    
    await Logger.info(
      LogContext.FLASHCARD,
      "Flashcard created successfully",
      { 
        requestId, 
        userId, 
        metadata: { 
          flashcardId,
          listId: data.listId,
          hasTags: Array.isArray(data.tags) && data.tags.length > 0
        }
      }
    );
    
    // Update card count in list
    await db.collection('lists').updateOne(
      { _id: new ObjectId(data.listId), userId },
      { $inc: { cardCount: 1 } }
    );
    
    // Track analytics event
    await AnalyticsLogger.trackEvent({
      userId,
      eventType: AnalyticsLogger.EventType.FLASHCARD_CREATED,
      properties: {
        flashcardId,
        listId: data.listId,
        hasFrontImage: !!data.frontImage,
        hasBackImage: !!data.backImage,
        difficulty: data.difficulty,
        tagCount: Array.isArray(data.tags) ? data.tags.length : 0,
        creationMethod: data.creationMethod || "manual"
      }
    });
    
    // Return success with ID
    return NextResponse.json({
      id: flashcardId,
      message: 'Flashcard created successfully'
    }, { status: 201 });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(
      LogContext.FLASHCARD,
      `Error creating flashcard: ${errorMessage}`,
      {
        requestId,
        metadata: {
          error,
          stack: error instanceof Error ? error.stack : undefined
        }
      }
    );
    
    return NextResponse.json({ 
      error: 'Failed to create flashcard' 
    }, { status: 500 });
  }
}
```

```typescript
// lib/api/flashcardService.ts
import { Flashcard, FlashcardFormData } from '@/types/flashcard';
import { Logger, LogContext } from "@/lib/logging/logger";

/**
 * Create a new flashcard
 */
export async function createFlashcard(data: FlashcardFormData): Promise<Flashcard> {
  const startTime = performance.now();
  
  try {
    await Logger.info(
      LogContext.FLASHCARD,
      "Client initiating flashcard creation",
      { metadata: { listId: data.listId } }
    );
    
    const response = await fetch('/api/flashcards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      await Logger.warning(
        LogContext.FLASHCARD,
        "Flashcard creation failed",
        { metadata: { error: responseData.error, status: response.status } }
      );
      throw new Error(responseData.error || 'Failed to create flashcard');
    }
    
    const duration = performance.now() - startTime;
    
    await Logger.info(
      LogContext.FLASHCARD,
      "Flashcard creation successful",
      { metadata: { id: responseData.id, durationMs: duration } }
    );
    
    return {
      id: responseData.id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(
      LogContext.FLASHCARD,
      `Flashcard creation error: ${errorMessage}`,
      { metadata: { error } }
    );
    
    throw error;
  }
}
```

```typescript
// app/dashboard/flashcards/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FlashcardForm from '@/components/flashcards/FlashcardForm';
import { FlashcardFormData } from '@/types/flashcard';
import { createFlashcard } from '@/lib/api/flashcardService';
import { Logger, LogContext } from "@/lib/logging/logger";

export default function CreateFlashcardPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateFlashcard = async (data: FlashcardFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await Logger.info(
        LogContext.FLASHCARD,
        "User submitted create flashcard form",
        { metadata: { listId: data.listId } }
      );
      
      await createFlashcard(data);
      
      await Logger.info(
        LogContext.FLASHCARD,
        "Redirecting user after successful flashcard creation",
        { metadata: { destination: '/dashboard/flashcards' } }
      );
      
      // Success - redirect to flashcards page
      router.push('/dashboard/flashcards');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await Logger.error(
        LogContext.FLASHCARD,
        `Flashcard creation form error: ${errorMessage}`,
        { metadata: { error } }
      );
      
      setError(error instanceof Error ? error.message : 'Failed to create flashcard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Create New Flashcard</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <FlashcardForm 
          onSubmit={handleCreateFlashcard} 
          isSubmitting={isSubmitting}
        />
      </div>
    </>
  );
}
```

These changes integrate the logging system throughout the flashcard creation flow:

1. API endpoint logs:
   - Request received
   - Authentication status
   - Validation results
   - Success or failure outcomes

2. Client service logs:
   - API request initiation
   - Response handling
   - Performance metrics

3. Form submission logs:
   - User form submission
   - Redirection after success
   - Error handling

4. Analytics tracking:
   - Flashcard creation events with detailed properties

This comprehensive logging will help with monitoring, debugging, and gathering analytics on flashcard creation.

The issue is that we're importing MongoDB-related code in client components, which is causing problems because MongoDB uses Node.js built-in modules that aren't available in the browser.

Let's restructure the code properly with a clear client-server separation:

1. First, set up a server-side API route:

```typescript
// app/api/flashcards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import { Logger, LogContext } from "@/lib/logging/logger";
import { AnalyticsLogger } from "@/lib/logging/logger";

export async function POST(request: NextRequest) {
  // Generate request ID for tracking this operation
  const requestId = await Logger.info(
    LogContext.FLASHCARD,
    "Flashcard creation request received",
    { request }
  );

  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      await Logger.warning(
        LogContext.FLASHCARD,
        "Unauthorized flashcard creation attempt",
        { requestId }
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    await Logger.debug(
      LogContext.FLASHCARD, 
      "Processing flashcard creation", 
      { userId, requestId }
    );

    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.front || !data.back || !data.listId) {
      await Logger.warning(
        LogContext.FLASHCARD,
        "Invalid flashcard data - missing required fields",
        { requestId, userId, metadata: { data } }
      );
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Sanitize HTML content
    const sanitizedData = {
      ...data,
      front: sanitizeHtml(data.front),
      back: sanitizeHtml(data.back)
    };
    
    // Add timestamps and user ID
    const flashcardData = {
      ...sanitizedData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Insert flashcard
    const result = await db.collection('flashcards').insertOne(flashcardData);
    const flashcardId = result.insertedId.toString();
    
    await Logger.info(
      LogContext.FLASHCARD,
      "Flashcard created successfully",
      { 
        requestId, 
        userId, 
        metadata: { 
          flashcardId,
          listId: data.listId,
          hasTags: Array.isArray(data.tags) && data.tags.length > 0
        }
      }
    );
    
    // Update card count in list
    await db.collection('lists').updateOne(
      { _id: new ObjectId(data.listId), userId },
      { $inc: { cardCount: 1 } }
    );
    
    // Track analytics event
    await AnalyticsLogger.trackEvent({
      userId,
      eventType: AnalyticsLogger.EventType.FLASHCARD_CREATED,
      properties: {
        flashcardId,
        listId: data.listId,
        hasFrontImage: !!data.frontImage,
        hasBackImage: !!data.backImage,
        difficulty: data.difficulty,
        tagCount: Array.isArray(data.tags) ? data.tags.length : 0,
        creationMethod: data.creationMethod || "manual"
      }
    });
    
    // Return success with ID
    return NextResponse.json({
      id: flashcardId,
      message: 'Flashcard created successfully'
    }, { status: 201 });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await Logger.error(
      LogContext.FLASHCARD,
      `Error creating flashcard: ${errorMessage}`,
      {
        requestId,
        metadata: {
          error,
          stack: error instanceof Error ? error.stack : undefined
        }
      }
    );
    
    return NextResponse.json({ 
      error: 'Failed to create flashcard' 
    }, { status: 500 });
  }
}
```

2. Create a separate client-side API service file:

```typescript
// lib/api/client/flashcardService.ts
import { FlashcardFormData } from '@/types/flashcard';

/**
 * Create a new flashcard - Client version
 */
export async function createFlashcard(data: FlashcardFormData): Promise<{id: string}> {
  const startTime = performance.now();
  
  try {
    console.log("Initiating flashcard creation API call", {listId: data.listId});
    
    const response = await fetch('/api/flashcards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Flashcard creation failed", {error: errorData.error, status: response.status});
      throw new Error(errorData.error || 'Failed to create flashcard');
    }
    
    const responseData = await response.json();
    const duration = performance.now() - startTime;
    
    console.log("Flashcard creation successful", {id: responseData.id, durationMs: duration});
    
    return {
      id: responseData.id
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Flashcard creation error: ${errorMessage}`);
    throw error;
  }
}
```

3. Update the client component to use the client-side service only:

```typescript
// app/dashboard/flashcards/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardForm from '@/components/flashcards/FlashcardForm';
import { FlashcardFormData } from '@/types/flashcard';
import { createFlashcard } from '@/lib/api/client/flashcardService';

export default function CreateFlashcardPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateFlashcard = async (data: FlashcardFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      console.log("User submitted create flashcard form");
      
      await createFlashcard(data);
      
      console.log("Redirecting user after successful flashcard creation");
      
      // Success - redirect to flashcards page
      router.push('/dashboard/flashcards');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Flashcard creation form error: ${errorMessage}`);
      setError(error instanceof Error ? error.message : 'Failed to create flashcard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Create New Flashcard</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <FlashcardForm 
        onSubmit={handleCreateFlashcard} 
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
```

4. Update the next.config.mjs file to exclude MongoDB from the client bundle:

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'mongodb'],
  },
  webpack: (config) => {
    // DNS lookup issue fix for MongoDB connections
    config.resolve.fallback = { dns: false, net: false, tls: false, 'child_process': false };
    return config;
  },
};

export default nextConfig;
```

This approach properly separates:
- Server-side code with MongoDB and logging in the API route
- Client-side code with simple fetch calls and console logging
- Configuration changes to prevent Node.js modules from being included in client bundles

Looking at your repository, I see we need a different approach. The issue is that MongoDB modules are being loaded client-side.

Let's fix this by:

1. Update next.config.js to properly handle MongoDB dependencies:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongodb', 'mongoose'],
  },
  webpack: (config) => {
    // Add these fallbacks to prevent client-side loading of server-only modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'dns': false,
      'net': false,
      'tls': false,
      'fs': false,
      'child_process': false,
      'mongodb-client-encryption': false
    };
    return config;
  },
};

module.exports = nextConfig;
```

2. Create a dedicated server action for flashcard creation:

```typescript
// app/actions/flashcardActions.ts
'use server'

import { sanitizeHtml } from '@/lib/utils/sanitize';
import clientPromise from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { Logger, LogContext } from "@/lib/logging/logger";
import { AnalyticsLogger } from "@/lib/logging/logger";
import { getServerSession } from "next-auth/next";
import { FlashcardFormData } from '@/types/flashcard';

export async function createFlashcard(formData: FlashcardFormData) {
  const requestId = await Logger.info(
    LogContext.FLASHCARD,
    "Flashcard creation server action called"
  );
  
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      throw new Error('Unauthorized');
    }
    const userId = session.user.id;
    
    // Sanitize HTML content
    const sanitizedData = {
      ...formData,
      front: sanitizeHtml(formData.front),
      back: sanitizeHtml(formData.back)
    };
    
    // Add timestamps and user ID
    const flashcardData = {
      ...sanitizedData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Insert flashcard
    const result = await db.collection('flashcards').insertOne(flashcardData);
    const flashcardId = result.insertedId.toString();
    
    // Update card count in list
    await db.collection('lists').updateOne(
      { _id: new ObjectId(formData.listId), userId },
      { $inc: { cardCount: 1 } }
    );
    
    // Track analytics
    await AnalyticsLogger.trackEvent({
      userId,
      eventType: "flashcard_created",
      properties: {
        flashcardId,
        listId: formData.listId
      }
    });
    
    return { success: true, id: flashcardId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(
      LogContext.FLASHCARD,
      `Flashcard creation error: ${errorMessage}`,
      { requestId }
    );
    return { success: false, error: errorMessage };
  }
}
```

3. Update the client-side component to use server action:

```typescript
// app/dashboard/flashcards/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardForm from '@/components/flashcards/FlashcardForm';
import { FlashcardFormData } from '@/types/flashcard';
import { createFlashcard } from '@/app/actions/flashcardActions';

export default function CreateFlashcardPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateFlashcard = async (data: FlashcardFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      console.log("Submitting flashcard form");
      const result = await createFlashcard(data);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      router.push('/dashboard/flashcards');
    } catch (error) {
      console.error('Error creating flashcard:', error);
      setError(error instanceof Error ? error.message : 'Failed to create flashcard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Create New Flashcard</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <FlashcardForm 
        onSubmit={handleCreateFlashcard} 
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
```

This approach uses Next.js Server Actions to properly separate client and server code while still providing a smooth experience.

Looking at your repository's structure, let's create a simplified flashcard service with proper logging. I'll avoid using any MongoDB code directly in client components.

First, let's create a simple API endpoint:

```typescript
// app/api/flashcards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Logger, LogContext } from "@/lib/logging/logger";
import { AnalyticsLogger } from "@/lib/logging/logger";
import clientPromise from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  const requestId = await Logger.info(LogContext.FLASHCARD, "Create flashcard request received");

  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      await Logger.warning(LogContext.FLASHCARD, "Unauthorized request", { requestId });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await request.json();

    // Validate required fields
    if (!data.front || !data.back || !data.listId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Connect to database and save flashcard
    const client = await clientPromise;
    const db = client.db();
    
    const flashcardData = {
      ...data,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection("flashcards").insertOne(flashcardData);
    const flashcardId = result.insertedId.toString();
    
    // Log success
    await Logger.info(LogContext.FLASHCARD, "Flashcard created successfully", {
      requestId,
      userId,
      metadata: { flashcardId }
    });
    
    // Track analytics
    await AnalyticsLogger.trackEvent({
      userId,
      eventType: "flashcard_created",
      properties: { flashcardId, listId: data.listId }
    });
    
    return NextResponse.json({ id: flashcardId }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await Logger.error(LogContext.FLASHCARD, `Error creating flashcard: ${errorMessage}`, { requestId });
    return NextResponse.json({ error: "Failed to create flashcard" }, { status: 500 });
  }
}
```

Now, let's create a client-side service that doesn't import any server modules:

```typescript
// lib/api/flashcard-client.ts
import { FlashcardFormData } from '@/types/flashcard';

/**
 * Client-side service for flashcard operations
 */
export const flashcardService = {
  /**
   * Creates a new flashcard
   */
  async createFlashcard(data: FlashcardFormData): Promise<{id: string}> {
    console.log("Creating flashcard", { listId: data.listId });
    
    const response = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Flashcard creation failed", { status: response.status });
      throw new Error(errorData.error || "Failed to create flashcard");
    }
    
    const result = await response.json();
    console.log("Flashcard created successfully", { id: result.id });
    
    return { id: result.id };
  }
};
```

Finally, let's update the create page to use our client service:

```typescript
// app/dashboard/flashcards/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FlashcardForm from '@/components/flashcards/FlashcardForm';
import { FlashcardFormData } from '@/types/flashcard';
import { flashcardService } from '@/lib/api/flashcard-client';

export default function CreateFlashcardPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateFlashcard = async (data: FlashcardFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await flashcardService.createFlashcard(data);
      router.push('/dashboard/flashcards');
      
    } catch (error) {
      console.error('Error creating flashcard:', error);
      setError(error instanceof Error ? error.message : 'Failed to create flashcard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Create New Flashcard</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <FlashcardForm 
        onSubmit={handleCreateFlashcard} 
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
```

This approach:
1. Keeps all MongoDB and server-side logging in the API route
2. Creates a clean client-side service with no server dependencies
3. Keeps the page component simple with no server imports

created a bug that tried to use server code on the client component.