/**
 * The three routes every branch must serve. `entry` is the key Next.js uses in
 * .next/app-build-manifest.json; `path` is what Lighthouse and Playwright load.
 * .lighthouserc.js repeats the paths because it cannot import TypeScript.
 */
export interface LabRoute {
  key: 'landing' | 'catalogue' | 'detail';
  label: string;
  path: string;
  entry: string;
}

export const DETAIL_SLUG = 'observability-in-practice-1';

export const ROUTES: readonly LabRoute[] = [
  { key: 'landing', label: 'Landing', path: '/', entry: '/page' },
  { key: 'catalogue', label: 'Catalogue', path: '/courses', entry: '/courses/page' },
  {
    key: 'detail',
    label: 'Course detail',
    path: `/courses/${DETAIL_SLUG}`,
    entry: '/courses/[slug]/page',
  },
];

export const LAYOUT_ENTRY = '/layout';
