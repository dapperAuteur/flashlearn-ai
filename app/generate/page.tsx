/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useRef, useEffect, Fragment } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from 'papaparse'; // Import PapaParse
import RatingStars from "@/components/RatingStars";
import { Logger, LogContext } from "@/lib/logging/client-logger";
import ShareModal from "@/components/ShareModal";
import { Switch } from '@headlessui/react';


// A simple Flashcard interface to use locally
interface Flashcard {
  front: string;
  back: string;
}

// Helper function to sanitize a string for use in filenames/keys
const sanitizeString = (input: string): string => {
  if (!input) return 'untitled';
  // Replace spaces with underscores, remove most non-alphanumeric chars except hyphen/underscore
  const sanitized = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-z0-9_-]/g, ''); // Remove invalid characters
  // Prevent empty strings or just underscores/hyphens
  return sanitized.replace(/^[_-]+|[_-]+$/g, '') || 'untitled';
};

// Helper function to extract topic name from localStorage key
const extractTopicFromKey = (key: string): string => {
  const prefix = 'flashlearn_';
  const suffix = '_flashcards_csv';
  if (key.startsWith(prefix) && key.endsWith(suffix)) {
    const topicPart = key.slice(prefix.length, key.length - suffix.length);
    return topicPart.replace(/_/g, ' '); // Replace underscores back to spaces
  }
  return 'Unknown Topic'; // Fallback
};

export default function GenerateFlashcardsPage(){
  const { data: session, status } = useSession();
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flippedCardIndices, setFlippedCardIndices] = useState<Set<number>>(new Set());
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [availableSets, setAvailableSets] = useState<{ key: string; topicName: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showTemplateDownloadButton, setShowTemplateDownloadButton] = useState(false);
  const [flashcardSetId, setFlashcardSetId] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [showPostSaveOptions, setShowPostSaveOptions] = useState(false);
  const [savedSetData, setSavedSetData] = useState<{ id: string, title: string, isPublic: boolean } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  useEffect(() => {
    if (title === '' || title === topic.replace(/_/g, ' ')) {
      setTitle(topic);
    }
  }, [topic, title]);

  const handleStartOver = () => {
    setShowPostSaveOptions(false);
    setSavedSetData(null);
    setFlashcards([]);
    setTopic('');
    setTitle('');
    setDescription('');
    setError(null);
    setSaveError(null);
  };

  const handleSaveSet = async () => {
    Logger.log(LogContext.FLASHCARD, 'Attempting to save flashcard set to account');
    if (!title.trim()) {
        setSaveError("A title is required to save the flashcard set.");
        return;
    }
    if (flashcards.length === 0) {
        setSaveError("There are no flashcards to save.");
        return;
    }
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccessMessage(null);
    try {
        const response = await fetch('/api/flashcards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                description,
                isPublic,
                flashcards,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Failed to save: ${response.statusText}`);
        }
        
        const numSets = data.createdSets?.length || 1;
        const message = `Successfully saved "${title}" and ${numSets - 1} study set(s)! Navigating to study dashboard...`;
        setSaveSuccessMessage(message);
        Logger.info(LogContext.FLASHCARD, message, { count: numSets });
        Logger.info(LogContext.FLASHCARD, 'Successfully saved flashcard set', { setId: data.savedSet._id });
        setSavedSetData({ id: data.savedSet._id, title: data.savedSet.title, isPublic: data.savedSet.isPublic });
        setShowPostSaveOptions(true);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred while saving.";
        setSaveError(errorMessage);
        Logger.error(LogContext.FLASHCARD, 'Error saving flashcard set', { error: err });
    } finally {
        setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    Logger.log(LogContext.FLASHCARD, 'Attempting to export flashcard set to CSV', { topic });
    if (flashcards.length === 0) {
      const errorMessage = 'No flashcards to export.';
      setError(errorMessage);
      Logger.warning(LogContext.FLASHCARD, errorMessage);
      return;
    }
    if (!topic.trim()) {
      const errorMessage = "Cannot export without a topic.";
      setError(errorMessage);
      Logger.warning(LogContext.FLASHCARD, errorMessage);
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
        const sanitizedTopic = sanitizeString(topic);
        const filename = `${sanitizedTopic}_flashcards.csv`;
        
        // Use PapaParse to generate CSV string which handles special characters
        const csvContent = Papa.unparse(flashcards, {
            header: true,
            columns: ["front", "back"]
        });

        // Save to localStorage
        const localStorageKey = `flashlearn_${sanitizedTopic}_flashcards_csv`;
        localStorage.setItem(localStorageKey, csvContent);
        Logger.info(LogContext.FLASHCARD, `CSV content saved to localStorage under key: ${localStorageKey}`);
        
        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Logger.info(LogContext.FLASHCARD, 'CSV file download initiated', { filename });
    } catch (error) {
        const errorMessage = "An error occurred while exporting the CSV file.";
        setError(errorMessage);
        Logger.error(LogContext.FLASHCARD, 'Error during CSV export', { error });
    }
    setIsExporting(false);
  }

  const handleGenerate = async () => {
    Logger.log(LogContext.FLASHCARD, 'Attempting to generate flashcards from AI', { topic, title, description });
    if(!topic.trim()) {
      const errorMessage = 'Please enter a topic or some terms and definitions to create the front and back of your flashcards.';
      setError(errorMessage);
      setFlashcards([]);
      Logger.warning(LogContext.FLASHCARD, errorMessage);
      return;
    }
    if (status !== 'authenticated') {
      const errorMessage = 'Please sign up or log in to generate flashcards. You get 1 free AI-generated set every 30 days!';
      setError(errorMessage);
      setFlashcards([]);
      Logger.warning(LogContext.AUTH, errorMessage);
      return;
    }

    setIsLoading(true);
    setError(null);
    setFlashcards([]);
    setFlippedCardIndices(new Set());

    try {
      const response = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, title, description }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMessage = data.error || `HTTP error! status: ${response.status}`;
        Logger.error(LogContext.FLASHCARD, 'Failed to generate flashcards', { errorMessage });
        throw new Error(errorMessage);
      }
      if (data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setFlashcardSetId(data.setId || null);
        setAverageRating(data.rating?.average || 0);
        setRatingCount(data.rating?.count || 0);
        Logger.info(LogContext.FLASHCARD, 'Flashcards successfully generated and saved', { cardCount: data.flashcards.length, setId: data.setId });
      } else {
        setError(data.error || 'No flashcards were generated. Try refining your topic.');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      console.error("Generation failed:", error);
      setFlashcards([]);
      setError(errorMessage);
      Logger.error(LogContext.FLASHCARD, 'Error during flashcard generation', { error });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanStorage = () => {
    Logger.log(LogContext.FLASHCARD, 'Attempting to scan local storage');
    if (status !== 'authenticated') {
      const errorMessage = 'Please sign in to load your saved flashcard sets. Sign up or log in to generate flashcards. You get 1 free AI-generated set every 30 days!';
      setError(errorMessage);
      Logger.warning(LogContext.AUTH, errorMessage);
      return;
    }
    const foundSets: { key: string; topicName: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('flashlearn_') || key?.endsWith('_flashcards_csv'))) {
        foundSets.push({ key, topicName: extractTopicFromKey(key) });
      }
    }
    if (foundSets.length > 0) {
      setAvailableSets(foundSets);
      setShowLoadModal(true);
      Logger.info(LogContext.FLASHCARD, 'Found flashcard sets in local storage', { count: foundSets.length });
    } else {
      const errorMessage = "No saved flashcard sets found in local storage.";
      setError(errorMessage);
      Logger.info(LogContext.FLASHCARD, errorMessage);
    }
  };

  const loadSelectedSet = (key: string) => {
    const csvContent = localStorage.getItem(key);
    if (csvContent) {
        processCsvContent(csvContent, extractTopicFromKey(key));
    } else {
        setError("Selected set not found in storage.");
    }
    setShowLoadModal(false);
  };

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

  const handleTriggerUpload = () => {
    if (status !== 'authenticated') {
      const errorMessage = 'Please sign in to upload flashcards from a CSV file. Sign up or log in to generate flashcards. You get 1 free AI-generated set every 30 days!';
      setError(errorMessage);
      Logger.warning(LogContext.AUTH, errorMessage);
      return;
    }
    fileInputRef.current?.click();
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      const errorMessage = "Invalid file type. Please upload a .csv file.";
      setError(errorMessage);
      Logger.error(LogContext.FLASHCARD, errorMessage, { filename: file.name });
      // Clear the file input value so the user can select the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);
    setFlashcards([]);
    setTopic('');

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            processCsvContent(results.data, file.name);
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        },
        error: (err) => {
            setError(`Error parsing CSV file: ${err.message}`);
            Logger.error(LogContext.FLASHCARD, 'PapaParse CSV error', { error: err });
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    });
  };

  const processCsvContent = (data: any, originalFilename: string) => {
    const requiredHeaders = ['front', 'back'];
    // PapaParse returns an array of objects when header:true. We check keys of first object.
    const headers = data.length > 0 ? Object.keys(data[0]).map(h => h.toLowerCase()) : [];

    if (!requiredHeaders.every(h => headers.includes(h))) {
        setError(`Invalid CSV header. Expected columns: "front,back" (case-insensitive).`);
        setShowTemplateDownloadButton(true);
        Logger.error(LogContext.FLASHCARD, 'Invalid CSV header', { filename: originalFilename, foundHeaders: headers });
        return;
    }

    const loadedFlashcards: Flashcard[] = data.map((row: any) => ({
      front: row.front || row.Front,
      back: row.back || row.Back,
    })).filter((card: Flashcard) => card.front && card.back);


    if (loadedFlashcards.length === 0) {
        setError("CSV file contained a valid header but no valid flashcard data rows.");
        Logger.error(LogContext.FLASHCARD, "No valid data rows in CSV", { filename: originalFilename });
        return;
    }

    setFlashcards(loadedFlashcards);
    const newTopic = sanitizeString(originalFilename.replace(/\.csv$/i, '')).replace(/_/g, ' ');
    setTopic(newTopic);
    setTitle(newTopic);
    setError(null);
    setShowTemplateDownloadButton(false);
    setFlippedCardIndices(new Set());
    Logger.info(LogContext.FLASHCARD, 'Successfully processed CSV content with PapaParse', { filename: originalFilename, cardCount: loadedFlashcards.length });
  };
  
  const handleDownloadTemplate = () => {
    Logger.log(LogContext.FLASHCARD, 'Initiating CSV template download');
    const templateContent = `"front","back"\n"Example Front 1","Example Back 1"\n"Front with, comma","Back with ""quotes"""`;
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "flashcard_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Generate Flashcards</h1>
        {showPostSaveOptions && savedSetData ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center border border-green-300 dark:border-green-700">
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
                    <button onClick={handleStartOver} className="text-sm text-gray-500 hover:underline">
                      Import another set
                    </button>
                </div>
            </div>
        ):(
        <Fragment>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            Enter a topic, or upload a CSV file to generate flashcards.
          </p>
          <textarea
            id="topicInput"
            className="w-full p-3 border border-gray-300 rounded-md mb-4 min-h-[120px] focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Photosynthesis, Capital cities of Europe..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isLoading || isSaving}
          />
          <div className="mb-4">
            <label htmlFor="titleInput" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Flashcard Set Title
            </label>
            <input
              type="text"
              id="titleInput"
              className="w-full p-2 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., My Photosynthesis Flashcards"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading || isSaving}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="descriptionInput" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Description (Optional)
            </label>
            <textarea
              id="descriptionInput"
              className="w-full p-2 border border-gray-300 rounded-md mt-1 min-h-[80px] focus:ring-2 focus:ring-blue-500"
              placeholder="A brief description of this flashcard set."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading || isSaving}
            />
          </div>
          <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              style={{ display: 'none' }}
            />
          <div className="flex flex-wrap gap-3 justify-center mb-4">
             <button
               id="generateButton"
               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                onClick={handleGenerate}
               disabled={isLoading || isExporting || isUploading || isSaving}
             >
               {isLoading ? 'Generating...' : 'Generate w/AI'}
             </button>
             <button
              id="uploadButton"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              onClick={handleTriggerUpload}
              disabled={isLoading || isExporting || isUploading || isSaving}
            >
              {isUploading ? 'Uploading...' : 'Upload CSV'}
            </button>
            <button
               id="loadButton"
               className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
                onClick={handleScanStorage}
               disabled={isLoading || isExporting || isUploading || isSaving}
             >
               Load from Local Storage
             </button>
             <button
               id="exportCSVButton"
               className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                onClick={handleExportCSV}
               disabled={isLoading || isExporting || flashcards.length === 0 || !topic.trim()}
             >
               {isExporting ? 'Exporting...' : 'Export CSV'}
             </button>
          </div>
          {error && (
            <div className="my-4 p-3 bg-red-100 border border-red-300 rounded-md">
              <p className="text-red-600">{error}</p>
              {error.includes('sign in') && (
                <Link href="/signin" className="mt-2 inline-block bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700">
                  Sign In
                </Link>
              )}
              {showTemplateDownloadButton && (
              <button
                onClick={handleDownloadTemplate}
                className="mt-2 bg-gray-500 hover:bg-gray-600 text-white text-sm py-1 px-3 rounded"
              >
                Download Template CSV
              </button>
            )}
          </div>
          )}
        </div>
        {flashcards.length > 0 && status === 'authenticated' && (
          <div className="sticky top-4 z-10 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg mb-8 flex flex-col sm:flex-row items-center justify-end gap-4 border dark:border-gray-700">
            <div className="flex items-center">
              <Switch
                checked={isPublic}
                onChange={setIsPublic}
                className={`${isPublic ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
              >
                <span className="sr-only">Make Public</span>
                <span
                  aria-hidden="true"
                  className={`${isPublic ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                />
              </Switch>
              <label className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                Share with others
              </label>
            </div>
            <button
              id="saveButton"
              onClick={handleSaveSet}
              disabled={isSaving}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-md disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save to Account'}
            </button>
          </div>
        )}
        {saveError && <div className="my-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800">{saveError}</div>}
        {flashcards.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Flashcards ({flashcards.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 perspective">
              {flashcards.map((card, index) => (
                <div
                  key={index}
                  className={`flashcard cursor-pointer h-40 rounded-lg shadow-md ${flippedCardIndices.has(index) ? 'flipped' : ''}`}
                  onClick={() => toggleFlip(index)}
                >
                  <div className="flashcard-inner relative w-full h-full text-center transition-transform duration-700 transform-style-preserve-3d">
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

            {flashcardSetId && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <h3 className="text-lg font-medium mb-2">Rate These Flashcards</h3>
                {status === 'authenticated' ? (
                <RatingStars
                  setId={flashcardSetId}
                  initialRating={averageRating}
                  totalRatings={ratingCount}
                  onRatingSubmitted={(newRating) => {
                    Logger.info(LogContext.FLASHCARD, `User submitted rating: ${newRating}`, { setId: flashcardSetId, rating: newRating });
                  }}
                />
                ) : (
                  <div className="text-center">
                    <p className="mb-2 text-sm text-gray-600">Sign in to rate these flashcards</p>
                    <Link href="/signin" className="bg-blue-600 text-white px-4 py-2 rounded-md">
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </Fragment>
        )}
      </div>
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Load Saved Flashcards</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select a previously saved set to load:</p>
            <div className="max-h-60 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 rounded">
              {availableSets.map((set) => (
                <button
                  key={set.key}
                  onClick={() => loadSelectedSet(set.key)}
                  className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  {set.topicName}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLoadModal(false)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
    {savedSetData && (
        <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            shareUrl={`${window.location.origin}/sets/${savedSetData.id}`}
            title={savedSetData.title}
        />
    )}
    </>
  );
}