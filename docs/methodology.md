# Methodology

Every number in this repository comes from `scripts/measure.ts`, run the same way on every branch. This page is the contract: what is measured, how, what the budgets mean, and why the numbers on a laptop are not the numbers in CI. It was written before the first fix branch existed so that the rules could not bend to fit the results.

## What is measured

| Metric                  | Source                                               | Unit     | Why it is here                                                                       |
| ----------------------- | ---------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| First-load JS per route | `size-limit` over `.next/route-bundles/<route>/*.js` | kB, gzip | What a route downloads before it can hydrate; the same set Next.js prints at build   |
| All client JS           | `size-limit` over `.next/static/chunks/**/*.js`      | kB, gzip | Catches a "fix" that only moves bytes into async chunks                              |
| Performance score       | Lighthouse `categories.performance`                  | 0–100    | The scoreboard; a weighted blend of the metrics below                                |
| LCP                     | Lighthouse `largest-contentful-paint`                | ms       | When the main content is visible                                                     |
| TBT                     | Lighthouse `total-blocking-time`                     | ms       | How long the main thread is busy after first paint; tracks hydration and render work |
| CLS                     | Lighthouse `cumulative-layout-shift`                 | score    | Layout stability; dimensionless images and late-arriving content move it             |
| Total byte weight       | Lighthouse `total-byte-weight`                       | kB       | Everything the page transferred: HTML, JS, CSS, images, API responses                |
| API requests            | Lighthouse `network-requests`, URLs under `/api/`    | count    | How many round trips the page makes during load; the query-caching fix's metric      |
| DOM elements            | Lighthouse `dom-size`                                | count    | The render-work fix's metric                                                         |

Lighthouse runs with its defaults: mobile emulation, simulated slow 4G and a 4× CPU slowdown, performance category only. Simulated throttling is chosen deliberately — it replays the recorded trace through a network model rather than throttling the real connection, which makes it far less sensitive to what else the machine is doing.

## How a measurement runs

```sh
npm run measure            # writes .measurements/<branch>.json
```

1. `next build` (skip with `--skip-build` when the build already exists, as the CI workflow does).
2. `scripts/route-bundles.ts` reads `.next/app-build-manifest.json` and copies each route's first-load files (the root layout's plus the page's, JavaScript only, polyfills excluded) into `.next/route-bundles/<route>/`, so `.size-limit.json` can name a stable path.
3. `size-limit --json` against `.size-limit.json`.
4. `next start` on a free port, then **one warm-up request per route**. Branches that use ISR render on first request and serve from cache afterwards; without the warm-up, run 1 of 3 would measure a cold render on those branches and a static page on the others. Every branch is warmed the same way.
5. `lhci collect` with `numberOfRuns: 3` per URL, then `lhci assert` against `.lighthouserc.js`.
6. The three runs per route are reduced to the **median of each metric**, independently. The JSON records the branch, commit, Node version, platform, every size-limit entry with its budget, the per-route medians and whether each gate passed.

The server is stopped whatever happens. `--no-gate` writes the file but never fails the process; `compare.ts` uses it because a budget failure on a branch is information for the table, not a reason to stop measuring the others.

### Chrome

Lighthouse needs a Chrome binary. `scripts/lib/chrome.ts` uses `CHROME_PATH` when set, otherwise the Chromium that Playwright installs:

```sh
npx playwright install chromium     # once; ~100 MB into Playwright's cache
```

GitHub's Ubuntu runners have Chrome preinstalled and the workflow installs Playwright's Chromium as well, so both environments use the same resolution order.

Chrome is launched with `--no-sandbox` (`settings.chromeFlags` in `.lighthouserc.js`). Ubuntu 24.04 restricts the unprivileged user namespaces Chrome's sandbox depends on, so without the flag Chrome aborts on the runner before Lighthouse can connect. The only page it ever loads is this repository's own build, so nothing is given up.

## Budgets and tolerance

Budgets live in `.size-limit.json` (bytes) and `.lighthouserc.js` (per-URL assertions). They are **per branch**: each fix branch tightens the budgets it improves and leaves the rest alone, so a branch is gated against its own claim, and `main` is gated against regressing further.

The rule for setting a budget from a measurement:

| Metric            | Budget                                         |
| ----------------- | ---------------------------------------------- |
| Bundle sizes      | measured × 1.05, rounded up to the next kB     |
| Performance score | measured − 5 points                            |
| LCP, TBT          | measured × 1.2, or measured + 200 ms if larger |
| CLS               | measured + 0.02                                |
| Total byte weight | measured × 1.1                                 |

Bundle sizes are deterministic for a given lockfile and get a small tolerance; Lighthouse metrics are not and get a larger one. The tolerance is there to absorb runner variance, not to leave room for regressions: a change that eats the whole margin should be treated as one.

The gate runs on GitHub-hosted Ubuntu runners, and on the catalogue's 22,000-element render their CPU is roughly half as fast as a development laptop: TBT there is about twice the local number and the score correspondingly lower. The catalogue's TBT and performance budgets on `main`, `fix/02` and `fix/03` are therefore set from a runner measurement — the `measure` workflow's own `.measurements/<branch>.json` artifact — with the same rule. Every other budget passes on both machines with margin and keeps its laptop-derived value.

## Noise

Lighthouse numbers vary between runs, between machines, and between runners of the same machine type. Three things keep this honest:

- **Median of three.** One slow run does not move the table. Three is the minimum that has a median; five would be better and slower.
- **Same harness, same session.** `compare.ts` measures every branch in one process on one machine. Numbers are comparable _down a column of the same table_; comparing a laptop table against a CI table is not meaningful, which is why `docs/results.md` says where it was produced.
- **Bundle sizes are exact.** When a Lighthouse delta looks small, the bundle columns say whether anything actually changed.

CI runners are slower and noisier than a development laptop, so scores in `docs/results.md` regenerated by the `compare` workflow will be lower than a local run and vary a few points between runs. That is expected; the deltas between branches are what the table is for.

## Reproducing the table

```sh
npm ci
npx playwright install chromium
npm run compare              # every branch in scripts/branches.json -> docs/results.md
```

`compare.ts` creates a `git worktree` per branch under the system temp directory, shares the root checkout's `node_modules` with it (every branch declares the same dependency set, see [CONTRIBUTING.md](../CONTRIBUTING.md)), runs `measure.ts` inside, and renders the merged table. Expect roughly 2–3 minutes per branch: one `next build` and nine Lighthouse runs. A branch whose measurement already exists in `.measurements/` is skipped unless `--force` is passed, so an interrupted run can be resumed.

## What is not measured

- **Navigation.** Lighthouse measures a cold page load. The gains from client-side caching (fix/04) on catalogue → detail → back navigations show up as fewer API requests during load and in the Network panel, not in LCP.
- **Real users.** No field data, no RUM. This is lab data under one throttling profile.
- **Server cost.** ISR trades render time for cache storage and staleness; the table shows the client side only.
- **Everything the parity suite checks.** `tests/smoke.spec.ts` is a gate on behaviour, not a metric. It exists so that no branch can improve a number by rendering less.
