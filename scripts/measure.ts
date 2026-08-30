import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { resolveChromePath } from './lib/chrome';
import { summariseLighthouseRuns } from './lib/lighthouse';
import type { Measurement, SizeEntry } from './lib/measurement';
import { ROUTES } from './lib/routes';
import { startNext } from './lib/server';
import { materialiseRouteBundles } from './route-bundles';

/**
 * Measures the current checkout and writes one JSON file:
 *
 *   next build  ->  size-limit --json  ->  next start  ->  lhci collect + assert
 *
 * Usage: tsx scripts/measure.ts [--skip-build] [--runs 3] [--label <name>]
 *                               [--out .measurements/<name>.json] [--no-gate]
 *
 * Exit code is non-zero when a size-limit or Lighthouse budget fails, unless
 * --no-gate is given (compare.ts uses that: it wants the numbers, not the gate).
 */

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}
const flag = (name: string) => process.argv.includes(name);

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : 'unknown';
}

function run(
  cwd: string,
  command: string,
  args: string[],
  env: Record<string, string | undefined> = {},
) {
  return spawnSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
}

interface SizeLimitJson {
  name: string;
  size: number;
  sizeLimit?: number;
  passed?: boolean;
}

function runSizeLimit(cwd: string): { entries: SizeEntry[]; passed: boolean } {
  const result = spawnSync('npx', ['size-limit', '--json'], { cwd, encoding: 'utf8' });
  const jsonStart = result.stdout.indexOf('[');
  if (jsonStart === -1) {
    process.stderr.write(result.stdout + result.stderr);
    throw new Error('size-limit produced no JSON');
  }
  const parsed = JSON.parse(result.stdout.slice(jsonStart)) as SizeLimitJson[];
  const entries = parsed.map((entry) => ({
    name: entry.name,
    size: entry.size,
    limit: entry.sizeLimit ?? null,
    passed: entry.passed ?? true,
  }));
  return { entries, passed: entries.every((entry) => entry.passed) };
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const label = arg('--label') ?? git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD');
  const slug = label.replace(/[^a-z0-9.-]+/gi, '-');
  const out = resolve(cwd, arg('--out') ?? join('.measurements', `${slug}.json`));
  const runs = Number(arg('--runs') ?? '3');

  if (!flag('--skip-build')) {
    console.log(`\n[measure] next build (${label})`);
    const build = run(cwd, 'npx', ['next', 'build']);
    if (build.status !== 0) throw new Error('next build failed');
  }
  if (!existsSync(join(cwd, '.next/app-build-manifest.json'))) {
    throw new Error('No production build found; drop --skip-build');
  }

  console.log('\n[measure] size-limit');
  materialiseRouteBundles(cwd);
  const size = runSizeLimit(cwd);
  for (const entry of size.entries) {
    const limit = entry.limit === null ? '' : ` / ${(entry.limit / 1000).toFixed(1)} kB`;
    console.log(
      `  ${entry.passed ? 'ok  ' : 'FAIL'} ${entry.name.padEnd(28)} ${(entry.size / 1000).toFixed(1)} kB${limit}`,
    );
  }

  const measurement: Measurement = {
    schemaVersion: 1,
    branch: label,
    commit: git(cwd, 'rev-parse', '--short', 'HEAD'),
    measuredAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    size,
    lighthouse: null,
  };

  let lighthousePassed = true;
  if (!flag('--skip-lighthouse')) {
    console.log('\n[measure] next start');
    const server = await startNext(cwd);
    try {
      // One warm-up request per route so every branch is measured warm:
      // ISR branches would otherwise pay their first render inside run 1.
      for (const route of ROUTES) {
        await fetch(`${server.baseUrl}${route.path}`);
      }

      const lhciDir = join(cwd, '.lighthouseci');
      rmSync(lhciDir, { recursive: true, force: true });
      const chromePath = resolveChromePath();
      const env: Record<string, string | undefined> = { LAB_PORT: String(server.port) };
      if (chromePath) env.CHROME_PATH = chromePath;
      console.log(
        `\n[measure] lhci collect (${String(runs)} runs per route, chrome: ${chromePath ?? 'system'})`,
      );
      const collect = run(cwd, 'npx', ['lhci', 'collect', `--numberOfRuns=${String(runs)}`], env);
      if (collect.status !== 0) throw new Error('lhci collect failed');

      console.log('\n[measure] lhci assert');
      const assert = run(cwd, 'npx', ['lhci', 'assert'], env);
      lighthousePassed = assert.status === 0;

      const summary = summariseLighthouseRuns(lhciDir);
      measurement.lighthouse = { ...summary, passed: lighthousePassed };
    } finally {
      await server.stop();
    }
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(measurement, null, 2)}\n`);
  console.log(`\n[measure] wrote ${out}`);

  if (measurement.lighthouse) {
    for (const route of ROUTES) {
      const m = measurement.lighthouse.routes[route.key];
      if (!m) continue;
      console.log(
        `  ${route.label.padEnd(14)} perf ${String(m.performance).padStart(3)}  LCP ${(m.lcp / 1000).toFixed(2)} s  TBT ${String(Math.round(m.tbt)).padStart(5)} ms  CLS ${m.cls.toFixed(3)}  ${(m.totalBytes / 1000).toFixed(0)} kB  api ${String(m.apiRequests)}  dom ${String(m.domElements)}`,
      );
    }
  }

  const gateFailed = !size.passed || !lighthousePassed;
  if (gateFailed && !flag('--no-gate')) {
    console.error('\n[measure] budget failed');
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
