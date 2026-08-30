# Fix 03: server rendering and ISR

**Branch:** [`fix/03-ssr-isr`](https://github.com/mohadjillani/react-performance-lab/tree/fix/03-ssr-isr) · [diff against `fix/02`](https://github.com/mohadjillani/react-performance-lab/compare/fix/02-dependency-diet...fix/03-ssr-isr) · cut from `fix/02-dependency-diet`

## Symptom

With the bundles trimmed, every route still paints "Loading…" first. All three pages are client components that fetch on mount: the server sends a shell, the browser downloads and runs the JavaScript, hydrates, _then_ asks for data and waits `LATENCY_MS` per round trip — three of them in sequence on the detail page. LCP is bounded below by download + hydrate + fetch no matter how small the bundle gets.

## Evidence

In the Network panel on `fix/02`, every `/api/*` request starts after the page's JavaScript has finished loading. Lighthouse's "API requests during load" column in [`results.md`](../results.md) reads 2 / 1 / 3 for the three routes, and the LCP element on each page is content that only exists after those requests resolve.

## Change

The three pages become **server components** with `export const revalidate = 60`:

- **Landing** reads category stats and featured courses in parallel on the server. The chart is still a client island (`LazyCategoryChart`), still `next/dynamic` with `ssr: false`, but it receives its data as props instead of fetching it.
- **Catalogue** reads all 2,000 rows on the server and passes them to a client `Catalogue` component that owns the search box. The rows are in the HTML; the search state is the only thing that needed to be on the client.
- **Course detail** reads the course and its instructor on the server (`notFound()` for an unknown slug — previously the page rendered an error string with a 200). `generateStaticParams` pre-renders the six most popular courses; the rest render on first request and are then cached.

Reviews stay a client fetch, in a `Reviews` island: they change more often than the course they belong to, and a 60-second ISR window is the wrong cache for them. One request, started at mount, instead of the third link in a chain. This is the request fix/04 removes from the load path.

ISR (`revalidate = 60`) rather than per-request SSR because the store's simulated 150 ms is meant to be a database: paying it once a minute per page is the point, and it is what the catalogue's read-mostly data allows. `next build` still runs the store at build time for the pre-rendered pages.

## Measured delta

| Metric                   |  `fix/02` |     `fix/03` | Delta |
| ------------------------ | --------: | -----------: | ----: |
| Catalogue: performance   |        62 |           96 |   +34 |
| Catalogue: LCP           |    5.18 s |       2.60 s | −50 % |
| Catalogue: TBT           |    823 ms |       114 ms | −86 % |
| Landing: performance     |        94 |           97 |    +3 |
| Landing: LCP             |    2.93 s |       2.57 s | −12 % |
| Detail: LCP              |    2.04 s |       2.48 s | +22 % |
| API requests during load | 2 / 1 / 3 |    0 / 0 / 1 |     — |
| Landing / detail bytes   |    244 kB | 311 / 309 kB | +27 % |
| All client JS            |  364.2 kB |     356.4 kB |  −2 % |

Local run, Apple Silicon, 8 GB, Node 23. Two honest caveats. The detail page's LCP got _worse_: its largest element is now the instructor card, which arrives in the HTML, whereas before it was the course title painted from a much smaller shell — the page is done sooner, but Lighthouse's largest element changed identity. And bytes on the landing and detail pages went up by a quarter, because the HTML now carries content and the RSC payload; the byte budgets for those two routes were _raised_ on this branch, not tightened, and the commit says so.

Local run, Apple Silicon, 8 GB, Node 23. Watch **Bytes** on the catalogue: the HTML now carries 2,000 rendered rows _and_ the same rows serialised as props for the client `Catalogue` component. Server rendering moved the wait off the critical path; it did not make 2,000 rows cheap. That is fix/05.

## When not to do this

- **When the data is per-user or changes every request.** ISR caches one rendering for everyone for `revalidate` seconds. Personalised or fast-moving content either needs `dynamic = 'force-dynamic'` (SSR on every request, paying the latency each time) or should stay a client fetch, as the reviews do here.
- **When the "database" is actually slow and unbounded.** A server component `await`s the store; a 2 s query becomes a 2 s time-to-first-byte on cache misses. Streaming with `<Suspense>` boundaries is the answer there, and this branch does not use it because nothing here is slow enough to justify the extra layout states.
- **When the client needs the same data anyway.** Passing 2,000 rows as props to a client component sends them twice (rendered HTML plus the RSC payload). Either the interactivity should be server-driven (search as a URL parameter, ISR per query), or the list should be paginated or virtualised so the client only ever needs a slice. The lab keeps the client search deliberately so that fix/05 has something to measure.
- **`generateStaticParams` for everything.** Pre-rendering 2,000 detail pages at build time would take 2,000 × 2 × 150 ms and pin the build to the dataset. On-demand ISR for the long tail is the right default; pre-render what is hot.
