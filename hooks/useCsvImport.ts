import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { useFlashcards } from '@/contexts/FlashcardContext';
import { Flashcard, processCsvContent, sanitizeString } from '@/lib/utils/flashcards/helpers';
import { useSession } from 'next-auth/react';

import { Logger, LogContext } from '@/lib/logging/client-logger';

// This Hook encapsulates all logic related to CSV file import.
export const useCsvImport = () => {
  const { createFlashcardSet } = useFlashcards();
  const { data: session } = useSession();

    const [isUploading, setIsUploading] = useState(false);
    const [csvError, setCsvError] = useState<string | null>(null);
    const [showTemplateButton, setShowTemplateButton] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTriggerUpload = () => {
        setCsvError(null);
        setShowTemplateButton(false);
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError("Invalid file type. Please upload a .csv file.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (!session?.user?.id) {
      setCsvError("You must be signed in to import flashcards.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

        setIsUploading(true);
        // setFlashcards([]);
        // setTopicAndTitle('');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const processed = processCsvContent(results.data as Flashcard[], file.name);

                if (processed.flashcards && processed.flashcards.length > 0) {
          try {
            const title = sanitizeString(file.name.replace(/\.csv$/i, '')).replace(/_/g, ' ');
            
            await createFlashcardSet({
              user_id: session.user.id,
              title,
              description: `Imported from ${file.name}`,
              is_public: 0,
              card_count: processed.flashcards.length,
              source: 'CSV',
              is_deleted: 0,
            });
            // TODO: Create individual flashcard records in next step
            
            Logger.log(LogContext.FLASHCARD, 'CSV imported successfully', { 
              title, 
              cardCount: processed.flashcards.length 
            });
                    setCsvError(null);
                    setShowTemplateButton(false);
                    } catch (error) {
            Logger.error(LogContext.FLASHCARD, 'Failed to save imported set', { error });
            setCsvError('Failed to save flashcard set. Please try again.');
          }
                } else {
                    setCsvError(processed.error ?? 'An unknown error occurred during CSV processing.');
                    if (processed.error?.includes('header')) {
                        setShowTemplateButton(true);
                    }
                }
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
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

    return {
        isUploading,
        csvError,
        showTemplateButton,
        fileInputRef,
        handleTriggerUpload,
        handleFileUpload,
        downloadTemplate
    };
};