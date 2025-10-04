import PublicHeader from '@/components/layout/PublicHeader';
import { StudySessionProvider } from '@/contexts/StudySessionContext';

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudySessionProvider>
      <PublicHeader />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </div>
    </StudySessionProvider>
  );
}