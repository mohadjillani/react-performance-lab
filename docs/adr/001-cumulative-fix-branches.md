# ADR 001: Cumulative fix branches rather than isolated ones

**Status:** accepted · **Date:** 2026-08-29

## Context

The lab applies five classes of performance fix to one deliberately slow application and reports the effect of each. There are two ways to lay the branches out: five independent branches, each cut from `main` and containing exactly one fix, or a chain where each branch is cut from the previous one and the last branch is the fully fixed application.

Independent branches make each delta "pure", but the fixes interact. Code-splitting the chart library (fix/01) and then removing `moment` and `lodash` (fix/02) are not additive: a dependency that has already been split into an async chunk no longer counts against first-load JS, so its removal shows a different number depending on what came before. Server rendering (fix/03) changes what "first content" means for the caching fix (fix/04). Five isolated deltas would not sum to anything, and a reader would be left to guess the end state.

## Decision

Branches are **cumulative**: `fix/02-dependency-diet` is cut from `fix/01-code-splitting`, and so on to `fix/05-render-work`. The order is the order a rebuild would follow — measure and remove the largest bytes first, change the rendering strategy, then the data layer, then the render work that only shows once the earlier problems are gone.

`docs/results.md` presents one row per branch and the caption states that each row is measured against the previous row, not against `main`. The final row is the real end state of the application.

`main` stays the slow baseline. The first thing a visitor can clone and profile is the problem; the branches carry the code; the generated table and every document live on `main`.

## Consequences

- The per-fix delta depends on the order. Reordering the branches changes the numbers, which is stated in the table caption and in each fix page.
- Adding a sixth fix means cutting it from `fix/05` and appending it to `scripts/branches.json`; nothing is rebased ([CONTRIBUTING.md](../../CONTRIBUTING.md)).
- Every branch must serve the same routes with the same content, or the comparison is meaningless. `tests/smoke.spec.ts` runs unchanged on every branch to enforce this.
- All branches share one `package.json` and lockfile (the superset of what any branch imports), so one `node_modules` serves every worktree during `compare` and bundle deltas measure what is _imported_, not what is _installed_.
