# Fix 01: code splitting

**Branch:** [`fix/01-code-splitting`](https://github.com/mohadjillani/react-performance-lab/tree/fix/01-code-splitting) · [diff against `main`](https://github.com/mohadjillani/react-performance-lab/compare/main...fix/01-code-splitting) · cut from `main`

## Symptom

The landing page and the course detail page each ship 258 kB of gzipped JavaScript before they can hydrate. Both render their first content — a heading, a paragraph, a list of cards — from data that arrives in a fetch, and neither needs a chart to do it. The chart is below the fold on a phone.

## Evidence

The bundle analyzer summary on `main` ([profile-first](../profile-first.md#1-bundle-analyzer)) puts `recharts` and the packages it vendors (`victory-vendor`, `decimal.js-light`, `@reduxjs/toolkit`, `immer`) in one 106 kB chunk whose "Initial for" column lists both routes. That single chunk is larger than the React and Next.js runtime together.

## Change

Both chart components are imported through `next/dynamic` with `ssr: false` and a `loading` component:

```tsx
const CategoryChart = dynamic(
  () => import('@/components/CategoryChart').then((m) => m.CategoryChart),
  { ssr: false, loading: () => <ChartPlaceholder /> },
);
```

`ChartPlaceholder` renders the same `.chart` box as the real component, so the chunk arriving later does not move anything: the split must not trade bundle size for layout shift. `ssr: false` is deliberate — `recharts` measures its container in the browser and renders nothing useful on the server, so there is no SSR output to lose.

Nothing else changes. The two routes are still client components fetching on mount; that is the next fixes' problem.

## Measured delta

| Metric                      |   `main` | `fix/01` | Delta |
| --------------------------- | -------: | -------: | ----: |
| Landing first-load JS       | 258.3 kB | 152.7 kB | −41 % |
| Course detail first-load JS | 258.4 kB | 127.6 kB | −51 % |
| Catalogue first-load JS     | 126.3 kB | 126.4 kB |    ±0 |
| All client JS               | 399.7 kB | 402.2 kB |  +1 % |
| Detail: LCP                 |   2.95 s |   2.12 s | −28 % |
| Detail: performance score   |       94 |       98 |    +4 |
| Landing: performance score  |       94 |       93 | noise |

Local run, Apple Silicon, 8 GB, Node 23; `npm run measure` on each branch. The catalogue is untouched by this branch and moves within noise.

Bundle sizes are exact; Lighthouse figures are the median of three runs on the machine named in [`results.md`](../results.md).

The number to notice is **All client JS**: it barely moves. The chart chunk is still downloaded, just not on the critical path. Code splitting _defers_ bytes; only removing a dependency _removes_ them, and the "All client JS" budget exists so the two are never confused.

## When not to do this

- **When the split thing is the first content.** Lazy-loading the hero of a page moves LCP later, not earlier: the browser now waits for the main bundle, then the chunk, then the render. Split what is below the fold or behind an interaction.
- **When the chunk is tiny.** Every `dynamic()` adds a request, a placeholder, and a moment of layout that has to be designed. Under about 10 kB gzip the request usually costs more than the bytes.
- **Without a sized placeholder.** A split that shifts layout when the chunk lands trades a bundle metric for a CLS metric. The parity suite would not catch that; the `cumulative-layout-shift` budget would.
- **Instead of asking whether the dependency should exist.** This branch keeps `recharts` for a twelve-bar chart. Fix 02 asks that question for `moment` and `lodash`; the same question applies here and the honest answer is that a bar chart of twelve numbers does not need a charting library. That change is out of scope for a branch whose one job is splitting.
