import PublicHeader from '@/components/layout/PublicHeader';

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        {children}
      </div>
    </>
  );
}
