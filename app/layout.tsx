import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Course catalogue',
  description: 'A course catalogue used as a React performance lab.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <nav>
            <Link href="/" className="brand">
              Course catalogue
            </Link>
            <Link href="/courses">All courses</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
