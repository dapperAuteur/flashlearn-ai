// components/generation/ImageUploader.tsx  
export default function ImageUploader({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-8 text-center">
      <button onClick={onBack} className="mb-4 text-blue-600">← Back</button>
      <h2 className="text-xl font-bold mb-4">Image Uploader</h2>
      <p className="text-gray-600">Coming soon - Phase 2</p>
    </div>
  );
}