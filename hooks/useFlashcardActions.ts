/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { useRouter } from "next/navigation";
import Papa from 'papaparse';
import { Flashcard, sanitizeString } from '@/lib/utils/flashcards/helpers';
import { Logger, LogContext } from '@/lib/logging/client-logger';

// This Hook encapsulates the core state and API interactions for the flashcard generation page.
export const useFlashcardActions = () => {
    const router = useRouter();
    const [topic, setTopic] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    const [apiError, setApiError] = useState<string | null>(null);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

    const [savedSetData, setSavedSetData] = useState<{ id: string, title: string, isPublic: boolean } | null>(null);

    const setTopicAndTitle = (newTopic: string) => {
        setTopic(newTopic);
        setTitle(newTopic);
    };

    const handleGenerate = async () => {
        Logger.log(LogContext.FLASHCARD, 'Attempting AI generation', { topic, title });
        if (!topic.trim()) {
            setApiError('Please enter a topic to generate flashcards.');
            return;
        }

        setIsLoading(true);
        setApiError(null);
        setFlashcards([]);

        try {
            const response = await fetch('/api/generate-flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, title, description }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            if (data.flashcards?.length > 0) {
                setFlashcards(data.flashcards);
                Logger.info(LogContext.FLASHCARD, 'AI generation successful', { count: data.flashcards.length });
            } else {
                setApiError(data.error || 'No flashcards were generated. Try refining your topic.');
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
            setApiError(msg);
            Logger.error(LogContext.FLASHCARD, 'Error during generation', { error: err });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (isPublic: boolean) => {
        Logger.log(LogContext.FLASHCARD, 'Attempting to save set');
        if (!title.trim()) {
            setApiError("A title is required to save.");
            return;
        }
        setIsSaving(true);
        setApiError(null);
        try {
            const response = await fetch('/api/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, isPublic, flashcards }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to save.');

            setSaveSuccessMessage(`Successfully saved "${title}"!`);
            setSavedSetData({ id: data.savedSet._id, title: data.savedSet.title, isPublic: data.savedSet.isPublic });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
            setApiError(msg);
            Logger.error(LogContext.FLASHCARD, 'Error saving set', { error: err });
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = () => {
        // Export logic remains the same as before
        setIsExporting(true);
        try {
            const sanitized = sanitizeString(topic);
            const filename = `${sanitized}_flashcards.csv`;
            const csvContent = Papa.unparse(flashcards, { header: true, columns: ["front", "back"] });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            setApiError("Failed to export CSV.");
            Logger.error(LogContext.FLASHCARD, 'CSV export error', { error });
        }
        setIsExporting(false);
    };
    
    const resetState = () => {
        setTopic('');
        setTitle('');
        setDescription('');
        setFlashcards([]);
        setApiError(null);
        setSaveSuccessMessage(null);
        setSavedSetData(null);
    };

    return {
        // State
        topic, setTopic,
        title, setTitle,
        description, setDescription,
        flashcards, setFlashcards,
        isLoading, isSaving, isExporting,
        apiError,
        saveSuccessMessage,
        savedSetData,
        // Actions
        handleGenerate,
        handleSave,
        handleExport,
        resetState,
        setTopicAndTitle,
    };
};