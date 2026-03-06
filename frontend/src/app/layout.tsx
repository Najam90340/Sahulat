import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/contexts/LanguageContext';
import NavBar from '@/components/NavBar';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Sahulat',
  description: 'Sahulat — Group buying platform for Pakistan',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <LanguageProvider>
          <NavBar />
          {children}
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
