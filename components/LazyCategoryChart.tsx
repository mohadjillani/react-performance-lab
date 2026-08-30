'use client';

import dynamic from 'next/dynamic';
import type { CategoryStat } from '@/lib/data/store';
import { ChartPlaceholder } from './ChartPlaceholder';

// next/dynamic with ssr: false has to live in a client component; the server
// page renders this wrapper and passes the data it already has.
const CategoryChart = dynamic(
  () => import('@/components/CategoryChart').then((m) => m.CategoryChart),
  { ssr: false, loading: () => <ChartPlaceholder /> },
);

export function LazyCategoryChart({ stats }: { stats: CategoryStat[] }) {
  return <CategoryChart stats={stats} />;
}
