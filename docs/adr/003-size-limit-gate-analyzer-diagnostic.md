# ADR 003: size-limit as the gate, the bundle analyzer as the diagnostic

**Status:** accepted · **Date:** 2026-08-29

## Context

Two tools look at bundle size and they are often confused for each other. `@next/bundle-analyzer` renders a treemap (or, in JSON mode, a tree) of every module in every chunk: it answers _what is in here and why_. `size-limit` compares the compressed size of a set of files to a number and exits non-zero: it answers _is this still within what we agreed_. A team needs the second in CI and the first on a developer's machine when the second fails.

Next.js hashes its chunk file names and a route's first-load set is only known from `.next/app-build-manifest.json`, which makes "one size-limit entry per route" awkward to express as a static glob.

## Decision

- **`size-limit` is the gate.** `.size-limit.json` has one entry per route (first-load JS) plus one for all client JavaScript; `measure.ts` runs it and fails on any entry over budget. Sizes are gzip, to match the numbers `next build` prints and the analyzer summary.
- **`scripts/route-bundles.ts` bridges the manifest and the glob.** It copies each route's first-load files into `.next/route-bundles/<route>/` so the size-limit entries can point at stable paths. The set is the root layout's files plus the page's, JavaScript only, which is what Next.js reports as "First Load JS".
- **The analyzer is a diagnostic, not a gate.** `npm run analyze` builds with the analyzer in JSON mode and `scripts/analyze-summary.ts` reduces the output to one row per chunk (gzip size, which entrypoints load it initially, largest packages). The baseline's summary is committed as `docs/profile-first/baseline-client.json` and read in [profile-first.md](../profile-first.md).
- **"All client JS" is a separate budget** so that moving bytes from a first-load chunk to an async chunk (which is what code splitting does) cannot be mistaken for removing them.

## Consequences

- Budgets are numbers in a committed file, reviewed in pull requests like any other change. Raising one is a visible decision.
- The gate depends on the copy step; `npm run size` runs both. Running `size-limit` alone against a fresh `.next` fails with a clear message.
- Polyfills and CSS are excluded from the per-route entries, matching Next.js's own figure. They are the same on every branch.
- The analyzer's per-package figures are sums of module-level gzip sizes and overstate slightly against the whole-chunk gzip; the summary is for finding what to cut, not for the table.
