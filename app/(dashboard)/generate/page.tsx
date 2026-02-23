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
import { useContentImport } from '@/hooks/useContentImport';
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
  ExclamationTriangleIcon,
  DocumentIcon,
  PhotoIcon,
  MicrophoneIcon,
  LinkIcon,
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

  // Content import (PDF, Image, YouTube, Audio)
  const {
    activeSource,
    setActiveSource,
    isProcessing,
    importError,
    youtubeUrl,
    setYoutubeUrl,
    pdfInputRef,
    imageInputRef,
    audioInputRef,
    handlePdfUpload,
    handleImageUpload,
    handleYoutubeSubmit,
    handleAudioUpload,
    triggerPdfUpload,
    triggerImageUpload,
    triggerAudioUpload,
    resetImport,
  } = useContentImport(setFlashcards, setTopicAndTitle);

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

  const effectiveError = apiError || csvError || importError;
  const anyActionInProgress = isLoading || isSaving || isExporting || isUploading || isProcessing;

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
                  onClick={() => router.push('/flashcards')}
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
              Transform your content into effective study materials using AI, upload files, or import from any source.
            </p>
          </div>

          {/* Main Form Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-8">
            <div className="p-6 sm:p-8">
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
                <div className="flex flex-wrap gap-3 justify-center">
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

              {/* Content Sources */}
              {status === 'authenticated' && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-4 text-center">Import from Content</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* PDF */}
                    <button
                      onClick={triggerPdfUpload}
                      disabled={anyActionInProgress}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-300 hover:bg-red-50/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
                        <DocumentIcon className="h-6 w-6 text-red-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">PDF</span>
                    </button>

                    {/* Image */}
                    <button
                      onClick={triggerImageUpload}
                      disabled={anyActionInProgress}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                        <PhotoIcon className="h-6 w-6 text-emerald-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">Image</span>
                    </button>

                    {/* YouTube */}
                    <button
                      onClick={() => setActiveSource(activeSource === 'youtube' ? null : 'youtube')}
                      disabled={anyActionInProgress}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed transition-all group ${
                        activeSource === 'youtube'
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-50/50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className={`p-2 rounded-lg transition-colors ${
                        activeSource === 'youtube' ? 'bg-red-200' : 'bg-red-100 group-hover:bg-red-200'
                      }`}>
                        <LinkIcon className="h-6 w-6 text-red-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">YouTube</span>
                    </button>

                    {/* Audio */}
                    <button
                      onClick={triggerAudioUpload}
                      disabled={anyActionInProgress}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-violet-300 hover:bg-violet-50/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-violet-100 group-hover:bg-violet-200 transition-colors">
                        <MicrophoneIcon className="h-6 w-6 text-violet-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">Audio</span>
                    </button>
                  </div>

                  {/* YouTube URL Input */}
                  <AnimatePresence>
                    {activeSource === 'youtube' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 flex gap-3">
                          <input
                            type="url"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleYoutubeSubmit()}
                            placeholder="https://youtube.com/watch?v=..."
                            disabled={isProcessing}
                            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-600 text-sm"
                          />
                          <button
                            onClick={handleYoutubeSubmit}
                            disabled={!youtubeUrl.trim() || isProcessing}
                            className="px-5 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                          >
                            {isProcessing ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            ) : (
                              'Import'
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Processing indicator */}
                  {isProcessing && activeSource !== 'youtube' && (
                    <div className="mt-4 flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                      <span className="text-sm font-medium text-blue-700">
                        Processing your content with AI...
                      </span>
                    </div>
                  )}
                </div>
              )}

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

          {/* Hidden file inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={pdfInputRef}
            onChange={handlePdfUpload}
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageUpload}
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={audioInputRef}
            onChange={handleAudioUpload}
            accept="audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/mp4,.m4a,.aac"
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
