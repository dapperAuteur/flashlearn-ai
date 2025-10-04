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
import { motion, AnimatePresence } from 'framer-motion';
import FlashcardPreviewGrid from '@/components/flashcards/FlashcardPreviewGrid';
import SaveControls from '@/components/flashcards/SaveControls';
import {
  SparklesIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  PlayIcon,
  ShareIcon,
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function GenerateFlashcardsPage(){
  const { status } = useSession();
  const router = useRouter();
  
  // Core state and API logic is managed by this Hook
  const {
    topic,
    setTopic,
    title,
    setTitle,
    description,
    setDescription,
    flashcards,
    setFlashcards,
    isLoading,
    isSaving,
    isExporting,
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-8 text-center border border-green-200"
            >
              <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-6">
                <CheckCircleIcon className="h-12 w-12 text-green-600" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Success!</h2>
              <p className="text-lg text-gray-600 mb-8">
                Your flashcard set <span className="font-semibold text-gray-900">&quot;{savedSetData.title}&quot;</span> has been saved.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                  onClick={() => router.push('/study')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Study This Set
                </button>
                
                {savedSetData.isPublic && (
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <ShareIcon className="h-5 w-5 mr-2" />
                    Share This Set
                  </button>
                )}
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button 
                  onClick={resetState} 
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Create another set
                </button>
              </div>
            </motion.div>
            
            <ShareModal
              isOpen={isShareModalOpen}
              onClose={() => setIsShareModalOpen(false)}
              shareUrl={`${window.location.origin}/sets/${savedSetData.id}`}
              title={savedSetData.title}
            />
          </div>
        </div>
      </div>
    );
  }

  // Main render logic for the generation form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <SparklesIcon className="h-4 w-4" />
              <span>AI-Powered Creation</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Generate Flashcards</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Transform your content into effective study materials using AI or import from CSV.
            </p>
          </div>

          {/* Main Form Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-8">
            <div className="p-8">
              {/* Content Input */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="topicInput" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                    <DocumentTextIcon className="h-4 w-4" />
                    <span>Content to Generate From</span>
                  </label>
                  <textarea
                    id="topicInput"
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-gray-600"
                    placeholder="Paste your content here... (text, notes, or concepts you want to turn into flashcards)"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={anyActionInProgress}
                    rows={6}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="titleInput" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                      <AcademicCapIcon className="h-4 w-4" />
                      <span>Set Title</span>
                    </label>
                    <input
                      type="text"
                      id="titleInput"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-600"
                      placeholder="e.g., Biology Chapter 7"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={anyActionInProgress}
                    />
                  </div>

                  <div>
                    <label htmlFor="descriptionInput" className="block text-sm font-medium text-gray-700 mb-3">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      id="descriptionInput"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-600"
                      placeholder="Brief description of the content"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={anyActionInProgress}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap gap-4 justify-center">
                  <button
                    onClick={handleGenerate}
                    disabled={anyActionInProgress || status !== 'authenticated'}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-5 w-5 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleTriggerUpload}
                    disabled={anyActionInProgress || status !== 'authenticated'}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                        Upload CSV
                      </>
                    )}
                  </button>

                  {flashcards.length > 0 && (
                    <button
                      onClick={handleExport}
                      disabled={anyActionInProgress || status !== 'authenticated'}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      {isExporting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <CloudArrowDownIcon className="h-5 w-5 mr-2" />
                          Export CSV
                        </>
                      )}
                    </button>
                  )}
                </div>

                {status !== 'authenticated' && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700 font-medium">
                        Sign in
                      </Link> to use AI generation and save your flashcards
                    </p>
                  </div>
                )}
              </div>

              {/* Error Display */}
              <AnimatePresence>
                {effectiveError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl"
                  >
                    <div className="flex items-start space-x-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-red-800">{effectiveError}</p>
                        {showTemplateButton && (
                          <button 
                            onClick={downloadTemplate} 
                            className="mt-2 text-red-700 hover:text-red-800 font-medium underline"
                          >
                            Download Template
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            style={{ display: 'none' }}
          />

          {/* SIMPLIFIED: Save controls */}
          {status === 'authenticated' && (
            <SaveControls
              flashcardCount={flashcards.length}
              isPublic={isPublic}
              isSaving={isSaving}
              onPublicToggle={setIsPublic}
              onSave={() => handleSave(isPublic)}
            />
          )}
                

          {/* SIMPLIFIED: Flashcard preview */}
          <FlashcardPreviewGrid flashcards={flashcards} />
        </div>
      </div>
    </div>
  );
}