// components/generation/VideoUploader.tsx
export default function VideoUploader({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-8 text-center">
      <button onClick={onBack} className="mb-4 text-blue-600">← Back</button>
      <h2 className="text-xl font-bold mb-4">Video Uploader</h2>
      <p className="text-gray-600">Coming soon - Phase 4</p>
    </div>
  );
}