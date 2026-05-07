import PublicHeader from '@/components/layout/PublicHeader';

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <div className="h-[100svh] flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex-1 min-h-0 overflow-y-auto container mx-auto px-4 py-2 flex flex-col">
          {children}
        </div>
      </div>
    </>
  );
}