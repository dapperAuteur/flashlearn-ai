/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  DocumentArrowUpIcon, 
  CloudArrowDownIcon,
  ArrowLeftIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Papa from 'papaparse';
import { FlashcardResult } from '@/components/flashcards/FlashcardResult';
import { IFlashcardClient as IFlashcard } from '@/types/flashcard';
import { processCsvContent, sanitizeString } from '@/lib/utils/flashcards/helpers';
import { Logger, LogContext } from '@/lib/logging/client-logger';

interface CSVUploaderProps {
  onBack: () => void;
}

export default function CSVUploader({ onBack }: CSVUploaderProps) {
  const { data: session, status } = useSession();
  
  // Core state
  const [flashcards, setFlashcards] = useState<IFlashcard[]>([]);
  const [fileName, setFileName] = useState('');
  
  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [showTemplateButton, setShowTemplateButton] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerUpload = () => {
    setCsvError(null);
    setShowTemplateButton(false);
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError("Invalid file type. Please upload a .csv file.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setFlashcards([]);
    setCsvError(null);
    setFileName(file.name);

    // Use Papa.parse to process the CSV client-side
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const processed = processCsvContent(results.data as any[], file.name);

          if (processed.flashcards) {
            // Convert to IFlashcard format
            const convertedCards: IFlashcard[] = processed.flashcards.map((card, index) => ({
              _id: `temp-${index}`,
              front: card.front,
              back: card.back
            }));
            
            setFlashcards(convertedCards);
            setCsvError(null);
            setShowTemplateButton(false);
            Logger.info(LogContext.FLASHCARD, 'CSV processed successfully', { 
              fileName: file.name, 
              cardCount: convertedCards.length 
            });
          } else {
            setCsvError(processed.error ?? 'An unknown error occurred during CSV processing.');
            if (processed.error?.includes('header')) {
              setShowTemplateButton(true);
            }
          }
        } catch (error) {
          setCsvError('Failed to process CSV file. Please check the format.');
          Logger.error(LogContext.FLASHCARD, 'CSV processing error', { error });
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (err) => {
        const errorMessage = `Error parsing CSV file: ${err.message}`;
        setCsvError(errorMessage);
        Logger.error(LogContext.FLASHCARD, 'PapaParse CSV error', { error: err });
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const downloadTemplate = () => {
    Logger.log(LogContext.FLASHCARD, 'Downloading CSV template');
    const templateContent = `"front","back"\n"What is the capital of France?","Paris"\n"What is 2 + 2?","4"`;
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "flashcard_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleCardFlip = (index: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getInitialTitle = () => {
    if (!fileName) return 'Flashcards from CSV';
    const nameWithoutExtension = fileName.replace(/\.csv$/i, '');
    return sanitizeString(nameWithoutExtension).replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Import CSV File</h2>
          <p className="text-gray-600">Upload a CSV file with &quot;front&quot; and &quot;back&quot; columns</p>
        </div>
      </div>

      {/* Authentication Check */}
      {status !== 'authenticated' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please <a href="/auth/signin" className="underline font-medium">sign in</a> to import and save CSV files.
          </p>
        </div>
      )}

      {/* Upload Area */}
      <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <div className="p-8 text-center">
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload CSV File
          </h3>
          <p className="text-gray-600 mb-4">
            Select a CSV file with &quot;front&quot; and &quot;back&quot; columns to create flashcards
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={handleTriggerUpload}
              disabled={isUploading || status !== 'authenticated'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
              {isUploading ? 'Processing...' : 'Choose File'}
            </button>
            
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CloudArrowDownIcon className="h-5 w-5 mr-2" />
              Download Template
            </button>
          </div>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
        </div>
      </div>

      {/* Error Display */}
      {csvError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
                <span className="text-red-600 text-sm">!</span>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
              <p className="text-sm text-red-700 mt-1">{csvError}</p>
              {showTemplateButton && (
                <button
                  onClick={downloadTemplate}
                  className="mt-2 text-sm font-medium text-red-800 underline hover:text-red-900"
                >
                  Download correct template format
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {flashcards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Preview ({flashcards.length} cards)
              </h3>
              <p className="text-sm text-gray-600">
                Click any card to flip and preview content
              </p>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <EyeIcon className="h-4 w-4 mr-1" />
              Click to flip
            </div>
          </div>

          {/* Flashcard Preview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flashcards.map((card, index) => {
              const isFlipped = flippedCards.has(index);
              return (
                <motion.div
                  key={`${card._id}-${index}`}
                  className="relative h-40 cursor-pointer"
                  onClick={() => toggleCardFlip(index)}
                  style={{ perspective: '1000px' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className={`relative w-full h-full transition-transform duration-500 transform-gpu preserve-3d ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 flex items-center justify-center shadow-sm">
                      <p className="text-sm text-blue-900 text-center font-medium line-clamp-4">
                        {card.front}
                      </p>
                    </div>
                    {/* Back */}
                    <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 flex items-center justify-center shadow-sm">
                      <p className="text-sm text-green-900 text-center line-clamp-4">
                        {card.back}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Save Section */}
          <FlashcardResult 
            flashcards={flashcards}
            initialTitle={getInitialTitle()}
            source="CSV"
            onSaveSuccess={() => {
              setFlashcards([]);
              setFileName('');
              setFlippedCards(new Set());
            }}
          />
        </motion.div>
      )}

      {/* Help Text */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">CSV Format Requirements:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Must have &quot;front&quot; and &quot;back&quot; columns (case-insensitive)</li>
          <li>• Each row represents one flashcard</li>
          <li>• Both front and back content are required</li>
          <li>• Empty rows will be skipped automatically</li>
        </ul>
      </div>
    </div>
  );
}

// Add the CSS for card flipping
const style = document.createElement('style');
style.textContent = `
  .preserve-3d {
    transform-style: preserve-3d;
  }
  .backface-hidden {
    backface-visibility: hidden;
  }
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
`;
document.head.appendChild(style);