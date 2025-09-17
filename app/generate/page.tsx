/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, Fragment } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ShareModal from "@/components/ShareModal";
import { Switch } from '@headlessui/react';
import { useFlashcardActions } from '@/hooks/useFlashcardActions';
import { useCsvImport } from '@/hooks/useCsvImport';

export default function GenerateFlashcardsPage(){
  const { status } = useSession();
  const router = useRouter();
  
  // Core state and API logic is managed by this Hook
  const {
    topic, setTopic,
    title, setTitle,
    description, setDescription,
    flashcards, setFlashcards,
    isLoading, isSaving, isExporting,
    apiError,
    saveSuccessMessage,
    savedSetData,
    handleGenerate,
    handleSave,
    handleExport,
    resetState,
    setTopicAndTitle,
  } = useFlashcardActions();

  // CSV import logic is managed by this Hook
  const {
    isUploading,
    csvError,
    showTemplateButton,
    fileInputRef,
    handleTriggerUpload,
    handleFileUpload,
    downloadTemplate
  } = useCsvImport(setFlashcards, setTopicAndTitle);

  const [isPublic, setIsPublic] = useState(false);
  const [flippedCardIndices, setFlippedCardIndices] = useState<Set<number>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const toggleFlip = (index: number) => {
    setFlippedCardIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const effectiveError = apiError || csvError;
  const anyActionInProgress = isLoading || isSaving || isExporting || isUploading;

  // Render logic for post-save success screen
  if (savedSetData) {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center border border-green-300 dark:border-green-700">
                <h2 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">Success!</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  Your flashcard set &quot;{savedSetData.title}&quot; has been saved.
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <button
                        onClick={() => router.push('/dashboard/study')}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
                    >
                        Study This Set
                    </button>
                    {savedSetData.isPublic && (
                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg"
                        >
                            Share This Set
                        </button>
                    )}
                </div>
                <div className="mt-8">
                    <button onClick={resetState} className="text-sm text-gray-500 hover:underline">
                      Create another set
                    </button>
                </div>
            </div>
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                shareUrl={`${window.location.origin}/sets/${savedSetData.id}`}
                title={savedSetData.title}
            />
        </div>
    );
  }

  // Main render logic for the generation form
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Generate Flashcards</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            {/* Input fields for Topic, Title, Description */}
            <textarea
                id="topicInput"
                className="w-full p-3 border border-gray-300 rounded-md mb-4"
                placeholder="e.g., Photosynthesis, Capital cities of Europe..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={anyActionInProgress}
            />
            <input
                type="text"
                id="titleInput"
                className="w-full p-2 border border-gray-300 rounded-md mb-4"
                placeholder="Flashcard Set Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={anyActionInProgress}
            />
            <textarea
                id="descriptionInput"
                className="w-full p-2 border border-gray-300 rounded-md mb-4"
                placeholder="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={anyActionInProgress}
            />
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              style={{ display: 'none' }}
            />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center mb-4">
                <button
                    onClick={handleGenerate}
                    disabled={anyActionInProgress || status !== 'authenticated'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                    {isLoading ? 'Generating...' : 'Generate w/AI'}
                </button>
                <button
                    onClick={handleTriggerUpload}
                    disabled={anyActionInProgress || status !== 'authenticated'}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                    {isUploading ? 'Uploading...' : 'Upload CSV'}
                </button>
                <button
                    onClick={handleExport}
                    disabled={anyActionInProgress || flashcards.length === 0 || status !== 'authenticated'}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                </button>
            </div>

            {/* Error Display */}
            {effectiveError && (
                <div className="my-4 p-3 bg-red-100 border-red-300 rounded-md text-red-600">
                    <p>{effectiveError}</p>
                    {status !== 'authenticated' && <Link href="/signin" className="font-bold underline">Please sign in.</Link>}
                    {showTemplateButton && <button onClick={downloadTemplate} className="mt-2 font-bold underline">Download Template</button>}
                </div>
            )}
        </div>

        {/* Save Controls */}
        {flashcards.length > 0 && status === 'authenticated' && (
            <div className="sticky top-4 z-10 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg mb-8 flex items-center justify-end gap-4">
                <Switch.Group as="div" className="flex items-center">
                    <Switch
                        checked={isPublic}
                        onChange={setIsPublic}
                        className={`${isPublic ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full`}
                    >
                        <span className={`${isPublic ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`}/>
                    </Switch>
                    <Switch.Label className="ml-3">Share with others</Switch.Label>
                </Switch.Group>
                <button onClick={() => handleSave(isPublic)} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-md disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save to Account'}
                </button>
            </div>
        )}

        {/* Flashcard Display */}
        {flashcards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 perspective">
            {flashcards.map((card, index) => (
              <div
                key={index}
                className="flashcard cursor-pointer h-40 rounded-lg shadow-md"
                onClick={() => toggleFlip(index)}
              >
                <div className={`flashcard-inner relative w-full h-full text-center transition-transform duration-700 transform-style-preserve-3d ${flippedCardIndices.has(index) ? 'flipped' : ''}`}>
                  <div className="flashcard-front absolute w-full h-full backface-hidden flex flex-col justify-center items-center p-4 bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <div className="front font-semibold text-lg text-blue-900 dark:text-blue-100">{card.front}</div>
                  </div>
                  <div className="flashcard-back absolute w-full h-full backface-hidden flex flex-col justify-center items-center p-4 bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg transform rotate-y-180">
                    <div className="back text-sm text-green-900 dark:text-green-100">{card.back}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}