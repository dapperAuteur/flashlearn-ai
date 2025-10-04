import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useFlashcards } from '@/contexts/FlashcardContext';
import Papa from 'papaparse';
import { Flashcard, sanitizeString } from '@/lib/utils/flashcards/helpers';

import { Logger, LogContext } from '@/lib/logging/client-logger';

// This Hook encapsulates the core state and API interactions for the flashcard generation page.
export const useFlashcardActions = () => {
  const { data: session } = useSession();
  const { createFlashcardSet, createFlashcard } = useFlashcards();
  
    const [topic, setTopic] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    const [apiError, setApiError] = useState<string | null>(null);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const [savedSetData, setSavedSetData] = useState<{ id: string; title: string; isPublic: boolean } | null>(null);

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
        if (!session?.user?.id) {
            setApiError('You must be signed in to save flashcards.');
            return;
            }
            if (flashcards.length === 0) {
            setApiError('No flashcards to save.');
            return;
            }
        Logger.log(LogContext.FLASHCARD, 'Attempting to save set');
        if (!title.trim()) {
            setApiError("A title is required to save.");
            return;
        }
        setIsSaving(true);
        setApiError(null);
        try {
            const setId = await createFlashcardSet({
                user_id: session.user.id,
                title: title || 'Untitled Set',
                description: description || null,
                is_public: isPublic ? 1 : 0,
                card_count: flashcards.length,
                source: 'CSV',
                is_deleted: 0,
            });
        // Create individual flashcard records
        await Promise.all(
            flashcards.map((card, index) => 
                createFlashcard({
                set_id: setId,
                user_id: session.user.id,
                front: card.front,
                back: card.back,
                front_image: null,
                back_image: null,
                order: index,
                })
            )
        );
        Logger.log(LogContext.FLASHCARD, 'Flashcard set saved', { setId, cardCount: flashcards.length });
        setSavedSetData({
            id: setId,
            title: title || 'Untitled Set',
            isPublic,
        });
        setSaveSuccessMessage('Flashcard set saved successfully!');
        } catch (err) {
            const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
            setApiError(msg);
            Logger.error(LogContext.FLASHCARD, 'Error saving set', { error: err });
                  setApiError('Failed to save flashcard set. Please try again.');

        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
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