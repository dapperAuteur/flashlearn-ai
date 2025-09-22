// components/generation/AudioUploader.tsx
export default function AudioUploader({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-8 text-center">
      <button onClick={onBack} className="mb-4 text-blue-600">← Back</button>
      <h2 className="text-xl font-bold mb-4">Audio Uploader</h2>
      <p className="text-gray-600">Coming soon - Phase 3</p>
    </div>
  );
}