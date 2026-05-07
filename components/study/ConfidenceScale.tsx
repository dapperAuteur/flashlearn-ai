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
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
      <h3 className="text-xs font-semibold text-blue-900 mb-1" id="confidence-scale-label">
        Rate your confidence:
      </h3>

      <div className="flex gap-1 sm:gap-2" role="radiogroup" aria-label="Confidence rating" aria-labelledby="confidence-scale-label">
        {CONFIDENCE_SCALE.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => handleSelect(value)}
            disabled={disabled}
            role="radio"
            aria-checked={selectedRating === value}
            aria-label={`${value} out of 5: ${label}`}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border-2 text-xs font-medium transition-all ${
              selectedRating === value
                ? 'ring-2 ring-blue-500 transform scale-[1.02]'
                : disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:transform hover:scale-[1.05]'
            } ${color}`}
          >
            <span className="text-base font-bold leading-none">{value}</span>
            <span className="hidden sm:inline text-[10px] mt-0.5 leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}