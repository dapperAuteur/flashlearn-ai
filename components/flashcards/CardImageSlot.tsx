'use client';

import { useId, useRef, useState } from 'react';
import Image from 'next/image';
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/media/limits';

export interface CardImageValue {
  url?: string;
  alt?: string;
}

interface CardImageSlotProps {
  setId: string;
  cardId: string;
  side: 'front' | 'back';
  /** Card text for this side, used to name the controls for screen readers. */
  cardText: string;
  value: CardImageValue;
  onChange: (next: CardImageValue) => void;
}

const ACCEPT = ALLOWED_IMAGE_TYPES.join(',');
const ALT_MAX_LENGTH = 300;

/**
 * Attach or remove one image on one side of one card. Alt text is required, so
 * the upload button stays disabled until a description is typed and the server
 * refuses the request without one.
 */
export default function CardImageSlot({ setId, cardId, side, cardText, value, onChange }: CardImageSlotProps) {
  const fieldId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sideLabel = side === 'front' ? 'front' : 'back';
  const shortText = cardText.length > 40 ? `${cardText.slice(0, 40)}…` : cardText;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] || null;
    setError(null);
    if (chosen && !ALLOWED_IMAGE_TYPES.includes(chosen.type)) {
      setFile(null);
      setError('Choose a JPG, PNG, GIF, or WebP image.');
      return;
    }
    if (chosen && chosen.size > MAX_IMAGE_SIZE) {
      setFile(null);
      setError(`That image is too large. The limit is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`);
      return;
    }
    setFile(chosen);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Choose an image first.');
      return;
    }
    if (!alt.trim()) {
      setError('Add a description before uploading. Screen readers read it in place of the image.');
      return;
    }

    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('cardId', cardId);
      form.set('side', side);
      form.set('alt', alt.trim());

      const res = await fetch(`/api/flashcards/${setId}/images`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || 'Upload failed. Please try again.');
        return;
      }

      onChange({ url: data.url, alt: data.alt });
      setFile(null);
      setAlt('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      setError('Upload failed. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  const handleRemove = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/flashcards/${setId}/images?cardId=${encodeURIComponent(cardId)}&side=${side}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || 'Could not remove the image. Please try again.');
        return;
      }

      onChange({ url: undefined, alt: undefined });
    } catch {
      setError('Could not remove the image. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{sideLabel} image</p>

      {value.url ? (
        <div className="mt-2 space-y-2">
          <Image
            src={value.url}
            alt={value.alt || ''}
            width={320}
            height={320}
            unoptimized
            className="max-h-32 w-auto object-contain rounded-md border border-gray-100"
          />
          <p className="text-sm text-gray-700">
            <span className="font-medium">Description: </span>
            {value.alt || 'None saved'}
          </p>
          <button
            type="button"
            onClick={handleRemove}
            disabled={pending}
            aria-busy={pending}
            className="inline-flex items-center px-2.5 py-1.5 text-sm text-red-700 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-60"
          >
            <TrashIcon className="h-4 w-4 mr-1.5" aria-hidden="true" />
            {pending ? 'Removing…' : `Remove ${sideLabel} image`}
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <label htmlFor={`${fieldId}-file`} className="block text-sm font-medium text-gray-700">
            {`Image for the ${sideLabel} of "${shortText}"`}
          </label>
          <input
            id={`${fieldId}-file`}
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            disabled={pending}
            className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />

          <label htmlFor={`${fieldId}-alt`} className="block text-sm font-medium text-gray-700">
            Description (required)
          </label>
          <input
            id={`${fieldId}-alt`}
            type="text"
            required
            aria-required="true"
            maxLength={ALT_MAX_LENGTH}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            disabled={pending}
            aria-describedby={`${fieldId}-alt-hint`}
            placeholder="Deltoid muscle highlighted on a shoulder diagram"
            className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
          />
          <p id={`${fieldId}-alt-hint`} className="text-xs text-gray-600">
            Say what the image shows. This is what a screen reader reads during study, so the card
            cannot be saved without it.
          </p>

          <button
            type="button"
            onClick={handleUpload}
            disabled={pending || !file || !alt.trim()}
            aria-busy={pending}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600"
          >
            <PhotoIcon className="h-4 w-4 mr-1.5" aria-hidden="true" />
            {pending ? 'Uploading…' : 'Upload image'}
          </button>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {pending ? `Working on the ${sideLabel} image` : ''}
      </p>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
