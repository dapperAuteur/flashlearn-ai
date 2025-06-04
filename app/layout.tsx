// app/layout.tsx
// import { Inter } from "next/font/google"; // was causing errors in server
import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";

// const inter = Inter({ subsets: ["latin"] }); // was causing errors in server

export const metadata: Metadata = {
  title: "FlashLearn AI",
  description: "AI-powered flashcard learning system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}