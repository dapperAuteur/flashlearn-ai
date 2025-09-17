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