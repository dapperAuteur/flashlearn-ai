import Link from 'next/link';

export default async function SessionCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ correct?: string; total?: string }>;
}) {
  const params = await searchParams;
  const correct = parseInt(params.correct || '0');
  const total = parseInt(params.total || '0');
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="text-center py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Complete!</h1>

      <div className="max-w-sm mx-auto my-8 p-8 bg-white border rounded-2xl shadow">
        <p className="text-5xl font-bold mb-2" style={{ color: accuracy >= 70 ? '#22c55e' : accuracy >= 50 ? '#eab308' : '#ef4444' }}>
          {accuracy}%
        </p>
        <p className="text-gray-500">Accuracy</p>
        <p className="text-sm text-gray-400 mt-2">{correct} correct out of {total} cards</p>
      </div>

      <div className="flex gap-4 justify-center">
        <Link href="/study" className="px-6 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: 'var(--color-primary)' }}>
          Study More
        </Link>
        <Link href="/sets" className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
          My Sets
        </Link>
      </div>
    </div>
  );
}
