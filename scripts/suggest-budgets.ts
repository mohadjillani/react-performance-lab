import { readFileSync } from 'node:fs';
import type { Measurement } from './lib/measurement';
import { ROUTES } from './lib/routes';

/**
 * Applies the tolerance rule from docs/methodology.md to a measurement and
 * prints the budgets to paste into .size-limit.json and .lighthouserc.js.
 *
 * Usage: tsx scripts/suggest-budgets.ts .measurements/<branch>.json
 */

const file = process.argv[2];
if (!file) {
  console.error('usage: tsx scripts/suggest-budgets.ts .measurements/<branch>.json');
  process.exit(1);
}
const measurement = JSON.parse(readFileSync(file, 'utf8')) as Measurement;

const ceilTo = (value: number, step: number) => Math.ceil(value / step) * step;

console.log(`# ${measurement.branch} @ ${measurement.commit}\n`);
console.log('.size-limit.json  (measured x 1.05, rounded up to the next kB)');
for (const entry of measurement.size.entries) {
  const limitKb = ceilTo((entry.size * 1.05) / 1000, 1);
  console.log(
    `  ${entry.name.padEnd(28)} measured ${(entry.size / 1000).toFixed(1)} kB  ->  "limit": "${String(limitKb)} kB"`,
  );
}

if (measurement.lighthouse) {
  console.log('\n.lighthouserc.js  budget(performance, lcp, tbt, cls, bytes)');
  console.log('  score -5 points; LCP/TBT x1.2 or +200 ms; CLS +0.02; bytes x1.1');
  for (const route of ROUTES) {
    const m = measurement.lighthouse.routes[route.key];
    if (!m) continue;
    const score = Math.max(0, (m.performance - 5) / 100).toFixed(2);
    const lcp = ceilTo(Math.max(m.lcp * 1.2, m.lcp + 200), 50);
    const tbt = ceilTo(Math.max(m.tbt * 1.2, m.tbt + 200), 25);
    const cls = (m.cls + 0.02).toFixed(3);
    const bytes = ceilTo(m.totalBytes * 1.1, 10_000);
    console.log(
      `  ${route.path.padEnd(42)} budget(${score}, ${String(lcp)}, ${String(tbt)}, ${cls}, ${bytes.toLocaleString('en-US').replace(/,/g, '_')})`,
    );
  }
}
