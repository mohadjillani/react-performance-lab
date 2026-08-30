import type { ReactNode } from 'react';
import { QueryProvider } from '@/components/QueryProvider';

// Scoped to /courses: the landing page has no client queries and should not
// pay for the query client in its first-load bundle.
export default function CoursesLayout({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
