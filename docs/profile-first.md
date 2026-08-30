# Profile first

The five fixes in this repository were chosen by looking at what the baseline actually ships and does, not by applying a checklist. This page is the walkthrough of that look, taken on `main`, so a reader can repeat it before opening any of the `fix/*` branches.

Three tools, in the order they are useful:

1. **Bundle analyzer** — what JavaScript each route downloads, and which packages account for it.
2. **Network panel** — how many round trips a route makes before it has something to show, and whether they depend on each other.
3. **React Profiler** — how much rendering work happens per interaction once the page is up.

Lighthouse comes last; it is the scoreboard, not the diagnostic. The scores for every branch are in [`results.md`](results.md).

## 1. Bundle analyzer

```sh
npm run analyze
```

This runs `next build` with `@next/bundle-analyzer` in JSON mode and then condenses `.next/analyze/client.json` into [`profile-first/client-summary.json`](profile-first/client-summary.json) (the committed copy taken on `main` is [`profile-first/baseline-client.json`](profile-first/baseline-client.json)). The condensed form is one row per client chunk:

| Chunk            |     gzip | Initial for                                               | Largest packages                                                                                                            |
| ---------------- | -------: | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `440-….js`       | 106.5 kB | `app/courses/[slug]/page`, `app/page`                     | recharts 96.8 kB, victory-vendor 15.9 kB, decimal.js-light 5.5 kB, @reduxjs/toolkit 4.4 kB, es-toolkit 3.8 kB, immer 3.7 kB |
| `framework-….js` |  59.7 kB | `main`                                                    | react-dom 56.4 kB, react 3.1 kB, scheduler 1.5 kB                                                                           |
| `4bd1b696-….js`  |  54.2 kB | `main-app`                                                | next 54.2 kB                                                                                                                |
| `255-….js`       |  46.4 kB | `main-app`                                                | next 80.6 kB                                                                                                                |
| `main-….js`      |  37.0 kB | `main`                                                    | next 58.0 kB                                                                                                                |
| `e37a0b60-….js`  |  25.0 kB | `app/courses/[slug]/page`, `app/page`                     | lodash 25.0 kB                                                                                                              |
| `13b76428-….js`  |  18.9 kB | `app/courses/[slug]/page`, `app/courses/page`, `app/page` | moment 18.9 kB                                                                                                              |
| `619-….js`       |   3.4 kB | `app/courses/page`, `app/layout`, `app/page`              | next 4.4 kB                                                                                                                 |

Total client JavaScript on `main`: **360.1 kB gzip across 22 chunks**. (Per-package figures are sums of module-level gzip sizes, so they overstate slightly against the chunk total, which is gzipped as a whole. Compare rows, not columns.)

What to read from it:

- **The chart library is the single largest thing we ship, and it is on the critical path of two routes.** `recharts` and the vendored pieces it drags in (`victory-vendor`, `decimal.js-light`, `@reduxjs/toolkit`, `immer`) are 106 kB gzip — about the same as the whole Next.js and React runtime combined. The "Initial for" column says both the landing page and the course detail page download it before they can hydrate. Neither page needs the chart to show its first content. That is the case for [fix/01, code splitting](fixes/01-code-splitting.md): defer it, don't (yet) remove it.
- **`lodash` costs 25 kB for four functions.** `lib/heavy/collections.ts` uses `sumBy`, `meanBy`, `orderBy` and `countBy`; `import _ from 'lodash'` pulls the CommonJS build, which no bundler can tree-shake. `moment` is 19 kB for two formatting calls and lands in all three routes. Both are [fix/02, dependency diet](fixes/02-dependency-diet.md).
- **`framework`, `main`, `main-app` and the `4bd1b696`/`255` chunks are the Next.js and React runtime.** About 200 kB gzip that every route pays and none of the fixes touch. That is the floor for this framework and worth knowing before setting a bundle budget: a target below it is not achievable by changing application code.

The number Next.js prints as "First Load JS" per route at the end of `next build` is the same information summed per route; `.size-limit.json` gates it (see [methodology](methodology.md)).

## 2. Network panel

Open `/courses/observability-in-practice-1` on `main` with the Network panel filtered to `Fetch/XHR`:

```
GET /api/courses/observability-in-practice-1          150 ms
    GET /api/instructors/1                             150 ms   (starts when the first finishes)
        GET /api/courses/observability-in-practice-1/reviews   150 ms   (starts when the second finishes)
```

Three requests, each waiting for the previous one, each paying the store's simulated latency (`LATENCY_MS`, default 150 ms) — and none of them can start until the page's JavaScript has downloaded, parsed and hydrated, because they are issued from a `useEffect`. The page shows "Loading…" for the whole chain. The reviews request only depends on the slug, which the page had from the first millisecond; the instructor request depends on the course, but the server could have joined that. This is the waterfall that [fix/03, SSR and ISR](fixes/03-ssr-isr.md) moves to the server and [fix/04, query caching](fixes/04-query-caching.md) removes.

The landing page (`/`) makes two requests in parallel (`/api/stats`, `/api/courses?featured=1`), which is the right shape — but still after hydration, so the largest content on the page (the featured course cards) cannot appear until the 258 kB of JavaScript has run. The catalogue (`/courses`) makes one request that returns all 2,000 rows.

## 3. React Profiler

Install the React DevTools extension, open `/courses` on `main`, switch to the Profiler tab, press record and type a few letters into the search box.

What to look for:

- **Every keystroke commits a render of the whole list.** `CataloguePage` keeps `query` in state; changing it re-renders the page, and because `CourseRow` is a plain function component with no memoisation, React re-renders all 2,000 rows to produce a DOM that is nearly identical. In the flame graph each commit is one wide bar of 2,000 `CourseRow` siblings. Enable "Record why each component rendered" and every row says _The parent component rendered_.
- **Each row does formatting work on every render.** Two `Intl.NumberFormat` constructors and a `moment()` parse per row per render; the constructors in particular are known to be expensive to create. With 2,000 rows that is 4,000 formatter constructions per keystroke.
- **The DOM is 2,000 rows deep regardless of what is visible.** The Profiler will not show this, but the Elements panel and Lighthouse's "Avoid an excessive DOM size" audit both will. Layout and style recalculation scale with it.

This is [fix/05, render work](fixes/05-render-work.md): memoised rows, deferred filtering, a virtualised list, and images that declare their size so the browser does not shift the layout as thumbnails arrive.

## 4. Lighthouse

Run it last, and run it on every branch the same way:

```sh
npm run measure
```

The audit list ("Reduce unused JavaScript", "Eliminate render-blocking resources", "Avoid an excessive DOM size", "Image elements do not have explicit width and height") repeats the diagnosis above in Lighthouse's words. What it adds is the scoreboard — LCP, TBT, CLS, the performance score — measured under the same throttling for every branch, which is what [`results.md`](results.md) reports.
