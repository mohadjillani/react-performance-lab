import type { Measurement, RouteMetrics, SizeEntry } from './measurement';
import { ROUTES } from './routes';
import type { LabRoute } from './routes';

export interface RenderMeta {
  /** ISO timestamp of the run. */
  generatedAt: string;
  /** Where the numbers came from, e.g. "GitHub Actions, ubuntu-latest" or "local run, Apple Silicon, 8 GB, Node 23". */
  environment: string;
  /** The command that produced them. */
  command: string;
}

export const NOT_MEASURED = 'not yet measured — run `npm run compare`';

const kb = (bytes: number) => `${(bytes / 1000).toFixed(1)} kB`;
const seconds = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
const millis = (ms: number) => `${String(Math.round(ms))} ms`;

function pctDelta(current: number, previous: number | undefined): string {
  if (previous === undefined || previous === 0) return '';
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return ' (±0%)';
  return ` (${pct > 0 ? '+' : '−'}${String(Math.abs(pct))}%)`;
}

function pointDelta(current: number, previous: number | undefined): string {
  if (previous === undefined) return '';
  const diff = Math.round(current - previous);
  if (diff === 0) return ' (±0)';
  return ` (${diff > 0 ? '+' : '−'}${String(Math.abs(diff))})`;
}

function sizeEntry(measurement: Measurement, name: string): SizeEntry | undefined {
  return measurement.size.entries.find((entry) => entry.name === name);
}

const SIZE_COLUMNS: { name: string; label: string }[] = [
  { name: 'landing first-load JS', label: 'Landing' },
  { name: 'catalogue first-load JS', label: 'Catalogue' },
  { name: 'course detail first-load JS', label: 'Course detail' },
  { name: 'all client JS', label: 'All client JS' },
];

function branchCell(measurement: Measurement): string {
  const commit = measurement.commit === 'unknown' ? '' : ` \`${measurement.commit}\``;
  return `\`${measurement.branch}\`${commit}`;
}

function failureRow(measurement: Measurement, columns: number): string {
  const cells = Array.from({ length: columns - 1 }, () => '—');
  return `| ${branchCell(measurement)} | ${cells.join(' | ')} |\n\n> \`${measurement.branch}\`: ${measurement.error ?? 'measurement failed'}\n`;
}

export function renderBundleTable(measurements: Measurement[]): string {
  const header = `| Branch | ${SIZE_COLUMNS.map((c) => c.label).join(' | ')} |\n| --- | ${SIZE_COLUMNS.map(() => '---:').join(' | ')} |`;
  const rows: string[] = [];
  let previous: Measurement | undefined;
  for (const measurement of measurements) {
    if (measurement.error) {
      rows.push(failureRow(measurement, SIZE_COLUMNS.length + 1));
      continue;
    }
    const cells = SIZE_COLUMNS.map((column) => {
      const entry = sizeEntry(measurement, column.name);
      if (!entry) return '—';
      const prior = previous ? sizeEntry(previous, column.name)?.size : undefined;
      const over = entry.passed ? '' : ' ⚠ over budget';
      return `${kb(entry.size)}${pctDelta(entry.size, prior)}${over}`;
    });
    rows.push(`| ${branchCell(measurement)} | ${cells.join(' | ')} |`);
    previous = measurement;
  }
  return `${header}\n${rows.join('\n')}`;
}

const LH_COLUMNS = 8;

function lighthouseRow(
  measurement: Measurement,
  route: LabRoute,
  previous: RouteMetrics | undefined,
): string {
  const metrics = measurement.lighthouse?.routes[route.key];
  if (!metrics) {
    return `| ${branchCell(measurement)} | ${NOT_MEASURED} | | | | | | |`;
  }
  const cells = [
    `${String(metrics.performance)}${pointDelta(metrics.performance, previous?.performance)}`,
    `${seconds(metrics.lcp)}${pctDelta(metrics.lcp, previous?.lcp)}`,
    `${millis(metrics.tbt)}${pctDelta(metrics.tbt, previous?.tbt)}`,
    metrics.cls.toFixed(3),
    kb(metrics.totalBytes),
    String(metrics.apiRequests),
    metrics.domElements.toLocaleString('en-GB'),
  ];
  const flag = measurement.lighthouse?.passed === false ? ' ⚠' : '';
  return `| ${branchCell(measurement)}${flag} | ${cells.join(' | ')} |`;
}

export function renderLighthouseTable(measurements: Measurement[], route: LabRoute): string {
  const header =
    '| Branch | Performance | LCP | TBT | CLS | Bytes | API requests | DOM elements |\n' +
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |';
  const rows: string[] = [];
  let previous: RouteMetrics | undefined;
  for (const measurement of measurements) {
    if (measurement.error) {
      rows.push(failureRow(measurement, LH_COLUMNS));
      continue;
    }
    rows.push(lighthouseRow(measurement, route, previous));
    previous = measurement.lighthouse?.routes[route.key] ?? previous;
  }
  return `${header}\n${rows.join('\n')}`;
}

/** The compact table embedded in the README. */
export function renderSummaryTable(measurements: Measurement[]): string {
  const header =
    '| Branch | First-load JS (landing / catalogue / detail) | Performance (landing / catalogue / detail) | Catalogue TBT | Detail API requests |\n' +
    '| --- | ---: | ---: | ---: | ---: |';
  const rows = measurements.map((measurement) => {
    if (measurement.error) return failureRow(measurement, 5);
    const sizes = SIZE_COLUMNS.slice(0, 3)
      .map((column) => {
        const entry = sizeEntry(measurement, column.name);
        return entry ? kb(entry.size) : '—';
      })
      .join(' / ');
    const lh = measurement.lighthouse?.routes;
    if (!lh?.landing || !lh.catalogue || !lh.detail) {
      return `| ${branchCell(measurement)} | ${sizes} | ${NOT_MEASURED} | | |`;
    }
    const scores = ROUTES.map((route) => String(lh[route.key]?.performance ?? '—')).join(' / ');
    return `| ${branchCell(measurement)} | ${sizes} | ${scores} | ${millis(lh.catalogue.tbt)} | ${String(lh.detail.apiRequests)} |`;
  });
  return `${header}\n${rows.join('\n')}`;
}

export function renderCaption(meta: RenderMeta): string {
  const date = meta.generatedAt.slice(0, 10);
  return `Generated by \`${meta.command}\` on ${date} — ${meta.environment}. Branches are cumulative, so each row is measured against the row above it, not against \`main\` ([ADR 001](adr/001-cumulative-fix-branches.md)). Bundle sizes are gzip; Lighthouse figures are the median of three runs under mobile emulation with simulated throttling ([methodology](methodology.md)).`;
}

export function renderResults(measurements: Measurement[], meta: RenderMeta): string {
  const sections = [
    '# Results',
    '',
    '<!-- GENERATED by scripts/compare.ts — do not edit by hand -->',
    '',
    renderCaption(meta),
    '',
    '## Bundle size',
    '',
    renderBundleTable(measurements),
    '',
  ];
  for (const route of ROUTES) {
    sections.push(
      `## Lighthouse — ${route.label} (\`${route.path}\`)`,
      '',
      renderLighthouseTable(measurements, route),
      '',
    );
  }
  sections.push(
    '## Reading the table',
    '',
    '- **First-load JS** is what a route downloads before it can hydrate; **All client JS** includes async chunks, so code splitting moves bytes from the first to the second and only a dependency diet removes them.',
    '- **API requests** counts calls to `/api/*` during the page load. Server rendering and query hydration drive it to zero for the initial view.',
    "- **DOM elements** is the render-work fix's metric: virtualising the catalogue changes it by two orders of magnitude while the parity suite proves the same 2,000 courses are still reachable.",
    '- A ⚠ marks a branch that failed its own budget in `.size-limit.json` or `.lighthouserc.js`.',
    '- The per-fix pages under `docs/fixes/` quote a separate, earlier run of each branch; a few points of difference against this table is run-to-run variance, not a change in the code.',
    '',
  );
  return sections.join('\n');
}

const README_START = '<!-- results:start -->';
const README_END = '<!-- results:end -->';

/** Replaces the block between the README markers; returns the input unchanged when there are no markers. */
export function embedInReadme(
  readme: string,
  measurements: Measurement[],
  meta: RenderMeta,
): string {
  const start = readme.indexOf(README_START);
  const end = readme.indexOf(README_END);
  if (start === -1 || end === -1 || end < start) return readme;
  const block = `${README_START}\n\n${renderSummaryTable(measurements)}\n\n_${renderCaption(meta).replace('(adr/', '(docs/adr/').replace('(methodology.md)', '(docs/methodology.md)')} Full per-route tables: [docs/results.md](docs/results.md)._\n\n`;
  return readme.slice(0, start) + block + readme.slice(end);
}
