# Contributing

## Setup

```sh
git clone https://github.com/mohadjillani/react-performance-lab
cd react-performance-lab
npm ci
npx playwright install chromium     # Lighthouse and the parity suite both use it
npm test
```

Node 20 or newer; `.nvmrc` pins the version CI uses.

## Scripts

| Script                                      | What it does                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`                               | Next.js dev server for whichever branch is checked out                                  |
| `npm run build`                             | Production build; every measurement and the parity suite run against it                 |
| `npm test`                                  | Vitest: fixture determinism and drift, Lighthouse summarising, the results renderer     |
| `npm run test:e2e`                          | Playwright parity suite against the current build (`npm run build` first)               |
| `npm run measure`                           | Build, size-limit, Lighthouse CI; writes `.measurements/<branch>.json`, fails on budget |
| `npm run compare`                           | Measures every branch in `scripts/branches.json` and regenerates `docs/results.md`      |
| `npm run size`                              | size-limit only, against an existing build                                              |
| `npm run analyze`                           | Build with the bundle analyzer and print the per-chunk summary                          |
| `npm run seed`                              | Regenerate `lib/data/fixtures.json` and the thumbnails (a test fails if it drifts)      |
| `npm run lint`, `typecheck`, `format:check` | The usual gates; all run in `ci.yml`                                                    |

## Branch policy

`main` is the baseline and is never "fixed". The fix branches are cumulative — each is cut from the previous one — and every branch must:

1. serve the same three routes with the same content (`npm run build && npm run test:e2e` must pass unchanged);
2. pass its own budgets in `.size-limit.json` and `.lighthouserc.js`;
3. keep `package.json` and `package-lock.json` identical to `main`.

The third rule is what lets `compare.ts` share one `node_modules` across worktrees, and it keeps the comparison about what a branch _imports_. Every dependency any branch uses is declared on `main`; a dependency that is not imported costs nothing in the bundle, which is the point the dependency-diet branch makes with numbers. If a new fix needs a package, add it on `main` first (a `build:` commit), then cut the branch.

## Adding `fix/06`

1. Cut it from the last branch: `git switch -c fix/06-<name> fix/05-render-work`.
2. Make one class of change. If it does not fit one sentence, it is two branches.
3. Tighten the budgets the change improves: run `npm run measure`, then `npx tsx scripts/suggest-budgets.ts .measurements/fix-06-<name>.json` and paste the suggested limits into `.size-limit.json` and `.lighthouserc.js`. Leave budgets you did not improve alone.
4. Write `docs/fixes/06-<name>.md` with the same sections as the others: symptom, evidence, change, measured delta, when not to do this.
5. Append the branch name to `scripts/branches.json` **on `main`** (the branch list is read from `main` by `compare.yml`) and add a paragraph to the README's "The five fixes" section.
6. Push the branch; `measure.yml` gates it. Trigger `compare.yml` from the Actions tab to regenerate `docs/results.md` with the new row.

## Making other changes

- Changes to the harness (`scripts/`, `.lighthouserc.js`, `tests/`) go to `main` and then to every fix branch by merge (`git switch fix/01-code-splitting && git merge main`, and so on down the chain). The branches are long-lived by design.
- `docs/results.md` and the README's results block are generated. Do not edit them; run `npm run compare` or wait for the workflow.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `perf:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`, `build:`. Fix branches use `perf(fix/0N): …` for the change and `chore(fix/0N): …` for the budgets.
