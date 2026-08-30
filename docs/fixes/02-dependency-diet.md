# Fix 02: dependency diet

**Branch:** [`fix/02-dependency-diet`](https://github.com/mohadjillani/react-performance-lab/tree/fix/02-dependency-diet) · [diff against `fix/01`](https://github.com/mohadjillani/react-performance-lab/compare/fix/01-code-splitting...fix/02-dependency-diet) · cut from `fix/01-code-splitting`

## Symptom

After code splitting, every route still carries 44 kB gzip of libraries whose entire use in this application is two date strings and four list helpers. "All client JS" did not move in fix/01, which is the tell: the bytes were deferred, not removed.

## Evidence

From the analyzer summary on `main` ([profile-first](../profile-first.md#1-bundle-analyzer)):

- `moment` — 18.9 kB gzip, initial for all three routes. Used for `formatDate` and `humanizeHours`. Its locale data is the reason it is famous; Next.js already strips that, and the core is still 19 kB.
- `lodash` — 25.0 kB gzip, initial for the landing and detail routes. `import _ from 'lodash'` loads the CommonJS build, which no bundler can tree-shake, for `sumBy`, `meanBy`, `orderBy` and `countBy`.

## Change

Two commits, one per dependency, so each can be judged on its own diff:

1. **`moment` → `lib/format.ts`.** `formatDate` is a twelve-entry month table; `humanizeHours` reproduces the thresholds `moment.duration().humanize()` applied for the 2–40 hour range the data uses, so the rendered text is byte-for-byte the same and the parity suite stays green. The `Intl.NumberFormat` instances that were constructed per row per render become module-level constants in the same file — a render-work fix, but it belongs with the formatting code and costs nothing to do here.
2. **`lodash` → `lib/collections.ts`.** `sumBy`, `meanBy` and `countBy` are a `reduce` each. `orderBy` — stable, multi-key, direction per key — is kept and imported from `lodash-es/orderBy`, which is ESM and tree-shakes to the one function and its helpers.

`package.json` still lists `moment` and `lodash`. That is the [branch policy](../../CONTRIBUTING.md#branch-policy): every branch shares `main`'s dependency set so `compare.ts` can share one `node_modules`. The bundle, not the lockfile, is the evidence that they are gone — a dependency that is not imported contributes nothing.

## Measured delta

| Metric                      | `fix/01` | `fix/02` | Delta |
| --------------------------- | -------: | -------: | ----: |
| Landing first-load JS       | 152.7 kB | 114.3 kB | −25 % |
| Catalogue first-load JS     | 126.4 kB | 107.6 kB | −15 % |
| Course detail first-load JS | 127.6 kB | 108.8 kB | −15 % |
| All client JS               | 402.2 kB | 364.2 kB |  −9 % |
| Catalogue: TBT              |  1087 ms |   823 ms | −24 % |
| Catalogue: performance      |       57 |       62 |    +5 |
| Detail: LCP                 |   2.12 s |   2.04 s |  −4 % |

The catalogue's TBT improvement is the formatter change: 4,000 `Intl.NumberFormat` constructions per render became two, module-level. The landing and detail scores are already in the mid-90s and move within noise.

Local run, Apple Silicon, 8 GB, Node 23; `npm run measure` on each branch. This is the branch where **All client JS** finally drops.

## When not to do this

- **When the library is doing real work.** Replacing `moment` was cheap because the app used two formats with fixed, English output. Time zones, locales, parsing user input, or relative times ("3 days ago") are where hand-rolled date code goes wrong; reach for `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` or a small library such as `date-fns` before writing it yourself.
- **When the cherry-pick is the whole library anyway.** `lodash-es/orderBy` is small; `lodash-es/template` or `cloneDeep` drag in a large share of lodash's internals. Check the analyzer after the change, not before.
- **When it changes output.** `humanizeHours` was written to match the previous thresholds because the parity suite (and users) see the text. A diet that quietly changes "a day" to "24 hours" is a product change dressed as a performance fix.
- **Before code splitting, if the dependency is going to stay.** Order matters for the numbers ([ADR 001](../adr/001-cumulative-fix-branches.md)): this branch's delta is measured after fix/01 already moved the chart library off the critical path, so it does not get credit for that.
