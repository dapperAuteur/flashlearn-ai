'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CardImageSlot, { CardImageValue } from './CardImageSlot';
import { Logger, LogContext } from '@/lib/logging/client-logger';

interface EditableCard {
  _id: string;
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
  frontImageAlt?: string;
  backImageAlt?: string;
}

interface CardImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: string;
  setTitle: string;
}

/**
 * Per-card image editor for a set the signed-in user owns. Cards are embedded in
 * the set, so this loads the whole set once and then edits one side at a time
 * through /api/flashcards/[setId]/images.
 */
export default function CardImageModal({ isOpen, onClose, setId, setTitle }: CardImageModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<EditableCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    setLoading(true);
    setLoadError(null);
    fetch(`/api/sets/${setId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Request failed: ${res.status}`))))
      .then((data) => {
        if (cancelled) return;
        setCards(Array.isArray(data?.flashcards) ? data.flashcards : []);
      })
      .catch((error) => {
        if (cancelled) return;
        Logger.error(LogContext.FLASHCARD, 'Could not load cards for image editing', { error });
        setLoadError('Could not load this set. Close the window and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, setId]);

  // Focus trap: keep focus within the modal while open
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [onClose]);

  const applyChange = (cardId: string, side: 'front' | 'back', next: CardImageValue) => {
    setCards((current) =>
      current.map((card) =>
        card._id === cardId
          ? {
              ...card,
              [`${side}Image`]: next.url,
              [`${side}ImageAlt`]: next.alt,
            }
          : card
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-image-modal-title"
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 id="card-image-modal-title" className="text-lg font-semibold text-gray-900">
              Card images
            </h2>
            <p className="text-sm text-gray-600">{setTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close card images"
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && <p className="text-sm text-gray-600">Loading cards…</p>}

          {loadError && (
            <p role="alert" className="text-sm text-red-700">
              {loadError}
            </p>
          )}

          {!loading && !loadError && cards.length === 0 && (
            <p className="text-sm text-gray-600">This set has no cards yet.</p>
          )}

          {cards.map((card, index) => (
            <section
              key={card._id}
              aria-label={`Card ${index + 1}`}
              className="border border-gray-200 rounded-lg p-3"
            >
              <p className="text-sm font-medium text-gray-900">
                {index + 1}. {card.front}
              </p>
              <p className="text-sm text-gray-600 mb-3">{card.back}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CardImageSlot
                  setId={setId}
                  cardId={card._id}
                  side="front"
                  cardText={card.front}
                  value={{ url: card.frontImage, alt: card.frontImageAlt }}
                  onChange={(next) => applyChange(card._id, 'front', next)}
                />
                <CardImageSlot
                  setId={setId}
                  cardId={card._id}
                  side="back"
                  cardText={card.back}
                  value={{ url: card.backImage, alt: card.backImageAlt }}
                  onChange={(next) => applyChange(card._id, 'back', next)}
                />
              </div>
            </section>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
