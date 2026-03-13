import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Flashcard, processCsvContent, sanitizeString } from '@/lib/utils/flashcards/helpers';

import { Logger, LogContext } from '@/lib/logging/client-logger';

// This Hook encapsulates all logic related to CSV file import.
export const useCsvImport = (
  setFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>,
  setTopicAndTitle: (topic: string) => void
    ) => {

    const [isUploading, setIsUploading] = useState(false);
    const [csvError, setCsvError] = useState<string | null>(null);
    const [showTemplateButton, setShowTemplateButton] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTriggerUpload = () => {
        setCsvError(null);
        setShowTemplateButton(false);
        fileInputRef.current?.click();
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError("Invalid file type. Please upload a .csv file.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

        setIsUploading(true);
        setFlashcards([]);
        setTopicAndTitle('');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const processed = processCsvContent(results.data as Flashcard[], file.name);

                if (processed.flashcards) {
                    setFlashcards(processed.flashcards);
                    const newTopic = sanitizeString(file.name.replace(/\.csv$/i, '')).replace(/_/g, ' ');
                    setTopicAndTitle(newTopic);
            
            setCsvError(null);
            setShowTemplateButton(false);
            
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
        // Each row is an array of [front, back]; values are RFC 4180-compliant CSV.
        // Rules: wrap every field in double-quotes; escape a literal " as "".
        // Newlines inside a field are fine as long as the field stays quoted.
        const rows: [string, string][] = [
          ['front', 'back'],
          // Basic card
          ['[EXAMPLE: basic] What is photosynthesis?', 'The process by which plants convert sunlight, water, and CO2 into glucose and oxygen.'],
          // Commas inside a field
          ['[EXAMPLE: commas in answer] Name three primary colors.', 'Red, blue, and yellow'],
          // Double-quotes inside a field → escape each " as ""
          ['[EXAMPLE: double quotes] What does the author mean by "the road not taken"?', 'He reflects on choices; the phrase "the road not taken" implies regret about alternatives.'],
          // Single quotes — no escaping needed
          ["[EXAMPLE: single quotes / apostrophes] What's Newton's first law?", "An object won't change its motion unless acted on by an external force (law of inertia)."],
          // Multi-line answer (newline embedded inside the quoted field)
          ['[EXAMPLE: multi-line answer] List the steps of the scientific method.', '1. Observe\n2. Question\n3. Hypothesize\n4. Experiment\n5. Analyze\n6. Conclude'],
          // Numbers and symbols
          ['[EXAMPLE: numbers & symbols] What is the formula for the area of a circle?', 'A = π × r²  (where r is the radius)'],
          // Long answer with mixed punctuation
          ['[EXAMPLE: mixed punctuation] Explain the difference between "affect" and "effect".', '"Affect" is usually a verb (to influence); "effect" is usually a noun (the result). Example: "Stress affects health; fatigue is an effect of stress."'],
        ];

        const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
        const csvContent = rows.map(row => row.map(escape).join(',')).join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "flashcard_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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