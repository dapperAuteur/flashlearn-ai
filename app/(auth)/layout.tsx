import React from 'react';

    export default function AuthLayout({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return (
        <main className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
          {children}
        </main>
      );
    }