// components/study/ConfidenceScale.tsx
import { useState } from 'react';

interface ConfidenceScaleProps {
  onRatingSelect: (rating: number) => void;
  disabled?: boolean;
}

const CONFIDENCE_SCALE = [
  { value: 1, label: 'Guessing', color: 'bg-red-100 border-red-300 text-red-800' },
  { value: 2, label: 'Not sure', color: 'bg-orange-100 border-orange-300 text-orange-800' },
  { value: 3, label: 'Somewhat confident', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
  { value: 4, label: 'Confident', color: 'bg-green-100 border-green-300 text-green-800' },
  { value: 5, label: 'Very confident', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' }
];

export default function ConfidenceScale({ onRatingSelect, disabled = false }: ConfidenceScaleProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const handleSelect = (value: number) => {
    if (disabled) return;
    setSelectedRating(value);
    onRatingSelect(value);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-blue-900 mb-3">
        Rate your confidence before seeing the answer:
      </h3>
      
      <div className="space-y-2">
        {CONFIDENCE_SCALE.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => handleSelect(value)}
            disabled={disabled}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
              selectedRating === value
                ? 'ring-2 ring-blue-500 transform scale-[1.02]'
                : disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:transform hover:scale-[1.01]'
            } ${color}`}
          >
            <span className="font-medium">{value}. {label}</span>
            {selectedRating === value && (
              <span className="text-blue-600 font-bold">✓</span>
            )}
          </button>
        ))}
      </div>

      {selectedRating && (
        <p className="text-xs text-blue-700 mt-3 font-medium">
          ✓ Confidence recorded. Card interactions now unlocked.
        </p>
      )}
    </div>
  );
}