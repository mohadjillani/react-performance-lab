import { describe, expect, it } from 'vitest';
import { median } from '../scripts/lib/lighthouse';
import type { Measurement } from '../scripts/lib/measurement';
import {
  NOT_MEASURED,
  embedInReadme,
  renderBundleTable,
  renderLighthouseTable,
  renderResults,
  renderSummaryTable,
} from '../scripts/lib/table';
import { ROUTES } from '../scripts/lib/routes';

function measurement(
  branch: string,
  sizes: [number, number, number, number],
  lighthouse: Measurement['lighthouse'] = null,
): Measurement {
  const names = [
    'landing first-load JS',
    'catalogue first-load JS',
    'course detail first-load JS',
    'all client JS',
  ];
  return {
    schemaVersion: 1,
    branch,
    commit: 'abc1234',
    measuredAt: '2026-08-30T10:00:00.000Z',
    node: 'v22.0.0',
    platform: 'linux-x64',
    size: {
      entries: names.map((name, index) => ({
        name,
        size: sizes[index] ?? 0,
        limit: 500_000,
        passed: true,
      })),
      passed: true,
    },
    lighthouse,
  };
}

const metrics = (performance: number, lcp: number, tbt: number, apiRequests: number) => ({
  performance,
  lcp,
  tbt,
  cls: 0.012,
  totalBytes: 274_000,
  apiRequests,
  domElements: 226,
});

const main = measurement('main', [258_300, 126_300, 258_400, 399_700], {
  runs: 3,
  passed: true,
  routes: {
    landing: metrics(94, 3060, 44, 2),
    catalogue: metrics(55, 5860, 1145, 1),
    detail: metrics(94, 2950, 74, 3),
  },
});
const fix01 = measurement('fix/01-code-splitting', [150_000, 126_300, 150_000, 399_700], {
  runs: 3,
  passed: true,
  routes: {
    landing: metrics(97, 2400, 30, 2),
    catalogue: metrics(55, 5860, 1145, 1),
    detail: metrics(96, 2500, 60, 3),
  },
});
const broken: Measurement = {
  ...measurement('fix/02-dependency-diet', [0, 0, 0, 0]),
  error: 'measure exited with 1',
};
const meta = {
  generatedAt: '2026-08-30T10:00:00.000Z',
  environment: 'unit test',
  command: 'npm run compare',
};

describe('median', () => {
  it('takes the middle value of three and the mean of the middle two of four', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([7])).toBe(7);
    expect(Number.isNaN(median([]))).toBe(true);
  });
});

describe('renderBundleTable', () => {
  it('shows sizes in kB with the delta against the previous row', () => {
    const table = renderBundleTable([main, fix01]);
    expect(table).toMatchInlineSnapshot(`
      "| Branch | Landing | Catalogue | Course detail | All client JS |
      | --- | ---: | ---: | ---: | ---: |
      | \`main\` \`abc1234\` | 258.3 kB | 126.3 kB | 258.4 kB | 399.7 kB |
      | \`fix/01-code-splitting\` \`abc1234\` | 150.0 kB (−42%) | 126.3 kB (±0%) | 150.0 kB (−42%) | 399.7 kB (±0%) |"
    `);
  });

  it('marks a branch that could not be measured', () => {
    const table = renderBundleTable([main, broken]);
    expect(table).toContain('| `fix/02-dependency-diet` `abc1234` | — | — | — | — |');
    expect(table).toContain('measure exited with 1');
  });

  it('flags an entry over budget', () => {
    const over = measurement('fix/x', [1, 2, 3, 4]);
    const first = over.size.entries[0];
    if (!first) throw new Error('no entries');
    over.size.entries[0] = { ...first, passed: false };
    expect(renderBundleTable([over])).toContain('over budget');
  });
});

describe('renderLighthouseTable', () => {
  it('renders one row per branch for a route with deltas', () => {
    const landing = ROUTES[0];
    if (!landing) throw new Error('no routes');
    const table = renderLighthouseTable([main, fix01], landing);
    expect(table).toMatchInlineSnapshot(`
      "| Branch | Performance | LCP | TBT | CLS | Bytes | API requests | DOM elements |
      | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
      | \`main\` \`abc1234\` | 94 | 3.06 s | 44 ms | 0.012 | 274.0 kB | 2 | 226 |
      | \`fix/01-code-splitting\` \`abc1234\` | 97 (+3) | 2.40 s (−22%) | 30 ms (−32%) | 0.012 | 274.0 kB | 2 | 226 |"
    `);
  });

  it('says when Lighthouse has not run rather than inventing numbers', () => {
    const sizeOnly = measurement('main', [1, 2, 3, 4]);
    const catalogue = ROUTES[1];
    if (!catalogue) throw new Error('no routes');
    expect(renderLighthouseTable([sizeOnly], catalogue)).toContain(NOT_MEASURED);
    expect(renderSummaryTable([sizeOnly])).toContain(NOT_MEASURED);
  });
});

describe('renderResults', () => {
  it('produces a document with a bundle table and one Lighthouse table per route', () => {
    const doc = renderResults([main, fix01, broken], meta);
    expect(doc.startsWith('# Results')).toBe(true);
    expect(doc).toContain('## Bundle size');
    for (const route of ROUTES) expect(doc).toContain(`## Lighthouse — ${route.label}`);
    expect(doc).toContain('unit test');
    expect(doc).toContain('measure exited with 1');
  });
});

describe('embedInReadme', () => {
  it('replaces only the block between the markers', () => {
    const readme = '# Title\n\n<!-- results:start -->\nold\n<!-- results:end -->\n\n## After\n';
    const updated = embedInReadme(readme, [main, fix01], meta);
    expect(updated).not.toContain('old');
    expect(updated).toContain(
      '| `main` `abc1234` | 258.3 kB / 126.3 kB / 258.4 kB | 94 / 55 / 94 | 1145 ms | 3 |',
    );
    expect(updated.startsWith('# Title\n\n<!-- results:start -->')).toBe(true);
    expect(updated.endsWith('<!-- results:end -->\n\n## After\n')).toBe(true);
    expect(updated).toContain('docs/results.md');
  });

  it('leaves a README without markers alone', () => {
    expect(embedInReadme('# Nothing here\n', [main], meta)).toBe('# Nothing here\n');
  });
});
