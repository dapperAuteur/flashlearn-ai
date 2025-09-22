import { StudySessionProvider } from '@/contexts/StudySessionContext';

export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return <StudySessionProvider>{children}</StudySessionProvider>;
}