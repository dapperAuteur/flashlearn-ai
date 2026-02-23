import { useState, useRef, useCallback } from 'react';
import { Flashcard } from '@/lib/utils/flashcards/helpers';
import { Logger, LogContext } from '@/lib/logging/client-logger';

export type ContentSource = 'pdf' | 'image' | 'youtube' | 'audio' | null;

export const useContentImport = (
  setFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>,
  setTopicAndTitle: (topic: string) => void,
) => {
  const [activeSource, setActiveSource] = useState<ContentSource>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const resetImport = useCallback(() => {
    setActiveSource(null);
    setImportError(null);
    setYoutubeUrl('');
  }, []);

  const handlePdfUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      setImportError(null);
      setFlashcards([]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/generate-flashcards/pdf', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to process PDF');

        setFlashcards(data.flashcards);
        const name = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
        setTopicAndTitle(name);
        setActiveSource(null);
        Logger.info(LogContext.FLASHCARD, 'PDF import successful', { count: data.flashcards.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to process PDF';
        setImportError(msg);
        Logger.error(LogContext.FLASHCARD, 'PDF import error', { error: err });
      } finally {
        setIsProcessing(false);
        if (pdfInputRef.current) pdfInputRef.current.value = '';
      }
    },
    [setFlashcards, setTopicAndTitle],
  );

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      setIsProcessing(true);
      setImportError(null);
      setFlashcards([]);

      try {
        const formData = new FormData();
        Array.from(files).forEach((file) => formData.append('files', file));

        const res = await fetch('/api/generate-flashcards/image', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to process images');

        setFlashcards(data.flashcards);
        setTopicAndTitle('Image Import');
        setActiveSource(null);
        Logger.info(LogContext.FLASHCARD, 'Image import successful', { count: data.flashcards.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to process images';
        setImportError(msg);
        Logger.error(LogContext.FLASHCARD, 'Image import error', { error: err });
      } finally {
        setIsProcessing(false);
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    },
    [setFlashcards, setTopicAndTitle],
  );

  const handleYoutubeSubmit = useCallback(async () => {
    if (!youtubeUrl.trim()) {
      setImportError('Please enter a YouTube URL');
      return;
    }

    setIsProcessing(true);
    setImportError(null);
    setFlashcards([]);

    try {
      const res = await fetch('/api/generate-flashcards/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process YouTube video');

      setFlashcards(data.flashcards);
      setTopicAndTitle('YouTube Import');
      setActiveSource(null);
      setYoutubeUrl('');
      Logger.info(LogContext.FLASHCARD, 'YouTube import successful', { count: data.flashcards.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process YouTube video';
      setImportError(msg);
      Logger.error(LogContext.FLASHCARD, 'YouTube import error', { error: err });
    } finally {
      setIsProcessing(false);
    }
  }, [youtubeUrl, setFlashcards, setTopicAndTitle]);

  const handleAudioUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      setImportError(null);
      setFlashcards([]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/generate-flashcards/audio', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to process audio');

        setFlashcards(data.flashcards);
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        setTopicAndTitle(name);
        setActiveSource(null);
        Logger.info(LogContext.FLASHCARD, 'Audio import successful', { count: data.flashcards.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to process audio';
        setImportError(msg);
        Logger.error(LogContext.FLASHCARD, 'Audio import error', { error: err });
      } finally {
        setIsProcessing(false);
        if (audioInputRef.current) audioInputRef.current.value = '';
      }
    },
    [setFlashcards, setTopicAndTitle],
  );

  const triggerPdfUpload = useCallback(() => {
    setImportError(null);
    pdfInputRef.current?.click();
  }, []);

  const triggerImageUpload = useCallback(() => {
    setImportError(null);
    imageInputRef.current?.click();
  }, []);

  const triggerAudioUpload = useCallback(() => {
    setImportError(null);
    audioInputRef.current?.click();
  }, []);

  return {
    activeSource,
    setActiveSource,
    isProcessing,
    importError,
    setImportError,
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
  };
};
