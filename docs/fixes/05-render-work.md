# Fix 05: render work

**Branch:** [`fix/05-render-work`](https://github.com/mohadjillani/react-performance-lab/tree/fix/05-render-work) · [diff against `fix/04`](https://github.com/mohadjillani/react-performance-lab/compare/fix/04-query-caching...fix/05-render-work) · cut from `fix/04-query-caching`

## Symptom

With bytes, rendering strategy and data flow fixed, the catalogue is still a 22,000-element DOM. Every keystroke in the search box re-renders 2,000 `CourseRow`s to produce nearly the same output; layout and style recalculation scale with the row count whatever the user is looking at; and thumbnails on both the landing cards and the rows arrive without a declared size, so the layout moves as they load.

## Evidence

- Lighthouse "DOM elements" on `fix/04`: **21,994** for `/courses`, with the "Avoid an excessive DOM size" audit failing.
- React Profiler ([profile-first](../profile-first.md#3-react-profiler)): one commit per keystroke, 2,000 `CourseRow` renders per commit, every one of them "The parent component rendered".
- CLS of 0.021–0.029 on the landing and detail pages on `main`, and the "Image elements do not have explicit width and height" audit, both from the `<img>` tags.

## Change

Two commits.

1. **Virtualise, memoise, defer.** `Catalogue` uses `useWindowVirtualizer` from `@tanstack/react-virtual`: only the rows near the viewport are mounted, positioned by transform inside a list sized to the full height, with each row measured after mount so the estimate only has to be roughly right. `CourseRow` is wrapped in `memo()`, so a row re-renders only when its own props change. The filter runs against `useDeferredValue(query)` behind `useMemo`, so the input stays responsive while the list catches up. The data, the search, the count and the links are unchanged — the parity suite passes without modification, and it deliberately never asserted DOM row counts.
2. **`next/image` with explicit dimensions.** Rows use `96×60`, cards `320×200` with a `sizes` hint; the browser reserves the box before the file arrives and lazy-loads what is off-screen. The thumbnails are SVGs, so the optimiser needs `images.dangerouslyAllowSVG`, set together with the CSP and attachment disposition the Next.js documentation recommends ([SECURITY.md](../../SECURITY.md)).

## Measured delta

| Metric                  | `fix/04` |  `fix/05` |        Delta |
| ----------------------- | -------: | --------: | -----------: |
| Catalogue: DOM elements |   21,994 |       165 |        −99 % |
| Catalogue: TBT          |   121 ms |     22 ms |        −82 % |
| Catalogue: bytes        |   328 kB |    255 kB |        −22 % |
| Catalogue: LCP          |   2.60 s |    2.80 s | +8 % (noise) |
| Landing / detail: CLS   |    0.000 |     0.000 |           ±0 |
| Landing / detail: score |  99 / 99 | 100 / 100 |      +1 / +1 |
| Catalogue first-load JS | 107.6 kB |  120.6 kB |        +12 % |
| Landing first-load JS   | 107.6 kB |  112.8 kB |         +5 % |
| All client JS           | 371.7 kB |  384.7 kB |         +3 % |

Local run, Apple Silicon, 8 GB, Node 23. The virtualiser and `next/image` cost bytes — 13 kB on the catalogue, 5 kB on the landing — and the budgets for both routes were raised on this branch. CLS was already 0.000 on `fix/03` and `fix/04` in this run: the server-rendered HTML reaches the browser with the SVGs cached from the warm-up, so the `<img>` boxes were sized before layout. The measured baseline on `main` (0.021 / 0.029) is the number the image change is answering; `next/image` makes the 0.000 hold when the cache is cold.

## When not to do this

- **Virtualising short lists.** Below a few hundred rows the virtualiser costs more (13 kB, absolute positioning, measurement, a scroll container to reason about) than it saves. Paginate or render everything.
- **Virtualising when find-in-page or accessibility tools need the whole list.** Rows that are not mounted cannot be found with Ctrl-F, read by a screen reader, or printed. If those matter, the fix is server-side search and pagination, not a virtual list.
- **`memo()` everywhere.** It pays when a component is rendered many times with stable props and its parent re-renders often — a list row under a search box is the textbook case. On a component rendered once, it adds a props comparison and no benefit. Profile first.
- **`next/image` for images the optimiser cannot help.** SVG is passed through, not resized; the win here is dimensions and lazy loading, which a plain `<img width height loading="lazy">` also provides. `next/image` was chosen because the same component handles the raster images a real catalogue would have.
- **`useDeferredValue` as a substitute for a faster filter.** It keeps typing responsive by letting the list lag; it does not make filtering 2,000 rows cheaper. It is the right tool here because the filter is already cheap and memoised; for an expensive filter, move the work off the main thread or to the server.
