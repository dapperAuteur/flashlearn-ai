import { useState } from 'react';
import { useSession } from 'next-auth/react';
// DELETED: We no longer need the PowerSync context for this action.
// import { useFlashcards } from '@/contexts/FlashcardContext';
import Papa from 'papaparse';
import { Flashcard, sanitizeString } from '@/lib/utils/flashcards/helpers';
import { Logger, LogContext } from '@/lib/logging/client-logger';

// This Hook encapsulates the core state and API interactions for the flashcard generation page.
export const useFlashcardActions = () => {
  const { data: session } = useSession();
  // DELETED: No longer using PowerSync context here.
  // const { createFlashcardSet, createFlashcard } = useFlashcards();
  console.log("useFlashcardActions started");
  
  
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

    // --- THIS IS THE UPDATED FUNCTION ---
    const handleSave = async (isPublic: boolean) => {
        if (!session?.user?.id) {
            setApiError('You must be signed in to save flashcards.');
            return;
            }
            if (flashcards.length === 0) {
            setApiError('No flashcards to save.');
            return;
            }
        Logger.log(LogContext.FLASHCARD, 'Attempting to save set via API');
        if (!title.trim()) {
            setApiError("A title is required to save.");
            return;
        }
        setIsSaving(true);
        setApiError(null);

        try {
            // We now call the /api/flashcards endpoint directly
            const response = await fetch('/api/flashcards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title || 'Untitled Set',
                    description: description || '',
                    isPublic: isPublic,
                    flashcards: flashcards,
                    // The 'source: CSV' logic is handled by the API endpoint
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save flashcard set');
            }

            const data = await response.json();
            const savedSet = data.savedSet;

            Logger.log(LogContext.FLASHCARD, 'Flashcard set saved via API', { setId: savedSet._id, cardCount: savedSet.cardCount });
            
            setSavedSetData({
                id: savedSet._id,
                title: savedSet.title,
                isPublic: savedSet.isPublic,
            });
            setSaveSuccessMessage('Flashcard set saved successfully!');
        
        } catch (err) {
            const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
            setApiError(msg);
            Logger.error(LogContext.FLASHCARD, 'Error saving set to API', { error: err });
            setApiError('Failed to save flashcard set. Please try again.');

        } finally {
            setIsSaving(false);
        }
    };
    // --- END OF UPDATED FUNCTION ---

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