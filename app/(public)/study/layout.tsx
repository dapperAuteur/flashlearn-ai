import PublicHeader from '@/components/layout/PublicHeader';

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </div>
    </>
  );
}