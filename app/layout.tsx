// app/layout.tsx
import NextAuthProvider from '@/components/providers/session-provider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);


  // Show public header for these routes
  // const pathname = usePathname();
  // const publicRoutes = ['/study', '/generate', '/'];
  // const showPublicHeader = publicRoutes.includes(pathname);
  
  return (
    <html lang="en">
      <body>
        <NextAuthProvider session={session}>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}