import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lahari Exam Prep — IIS & SSC CGL',
  description: 'Personal exam preparation platform for IIS and SSC CGL — practice tests, instant feedback, and intelligent study cards.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
