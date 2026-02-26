import PublicHeader from '@/components/layout/PublicHeader';

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      {children}
    </>
  );
}
