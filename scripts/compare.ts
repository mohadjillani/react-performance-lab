import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Measurement } from './lib/measurement';
import { embedInReadme, renderResults } from './lib/table';
import type { RenderMeta } from './lib/table';

/**
 * Measures every branch in scripts/branches.json and renders docs/results.md.
 *
 *   tsx scripts/compare.ts                 # measure what is missing, then render
 *   tsx scripts/compare.ts --force         # re-measure every branch
 *   tsx scripts/compare.ts --render-only   # only render from .measurements/*.json
 *   tsx scripts/compare.ts --branches main,fix/01-code-splitting
 *   tsx scripts/compare.ts --environment "GitHub Actions, ubuntu-latest"
 *
 * Each branch is checked out into a git worktree under the system temp
 * directory, given the root checkout's node_modules through a symlink (every
 * branch declares the same dependency set), measured with that branch's own
 * scripts/measure.ts, and removed again. A branch that fails to build or
 * measure is recorded as a failure and shown as such in the table; the run
 * continues with the next branch. Measurements already present in
 * .measurements/ are reused unless --force is given, so an interrupted run
 * picks up where it stopped.
 */

const root = join(import.meta.dirname, '..');
const measurementsDir = join(root, '.measurements');

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}
const flag = (name: string) => process.argv.includes(name);

const slugOf = (branch: string) => branch.replace(/[^a-z0-9.-]+/gi, '-');
const fileFor = (branch: string) => join(measurementsDir, `${slugOf(branch)}.json`);

function git(args: string[], cwd = root): { ok: boolean; out: string } {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return { ok: result.status === 0, out: (result.stdout + result.stderr).trim() };
}

function failure(branch: string, error: string): Measurement {
  return {
    schemaVersion: 1,
    branch,
    commit: 'unknown',
    measuredAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    size: { entries: [], passed: false },
    lighthouse: null,
    error,
  };
}

function measureBranch(branch: string, runs: string | undefined): Measurement {
  const out = fileFor(branch);
  const verify = git(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
  if (!verify.ok) return failure(branch, `branch does not exist locally`);

  const worktree = join(tmpdir(), 'react-performance-lab-worktrees', slugOf(branch));
  if (existsSync(worktree)) {
    git(['worktree', 'remove', '--force', worktree]);
    rmSync(worktree, { recursive: true, force: true });
  }
  git(['worktree', 'prune']);
  const add = git(['worktree', 'add', '--detach', worktree, branch]);
  if (!add.ok) return failure(branch, `git worktree add failed: ${add.out}`);

  try {
    symlinkSync(join(root, 'node_modules'), join(worktree, 'node_modules'), 'dir');
    const args = ['tsx', 'scripts/measure.ts', '--label', branch, '--out', out, '--no-gate'];
    if (runs) args.push('--runs', runs);
    console.log(`\n=== ${branch} ===`);
    const result = spawnSync('npx', args, { cwd: worktree, stdio: 'inherit' });
    if (result.status !== 0 || !existsSync(out)) {
      const record = failure(branch, `measure exited with ${String(result.status ?? 'signal')}`);
      writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
      return record;
    }
    return JSON.parse(readFileSync(out, 'utf8')) as Measurement;
  } finally {
    git(['worktree', 'remove', '--force', worktree]);
    rmSync(worktree, { recursive: true, force: true });
  }
}

function main(): void {
  const branchList =
    arg('--branches')?.split(',') ??
    (JSON.parse(readFileSync(join(root, 'scripts/branches.json'), 'utf8')) as string[]);
  mkdirSync(measurementsDir, { recursive: true });

  const measurements: Measurement[] = [];
  for (const branch of branchList) {
    const file = fileFor(branch);
    if (flag('--render-only')) {
      measurements.push(
        existsSync(file)
          ? (JSON.parse(readFileSync(file, 'utf8')) as Measurement)
          : failure(branch, 'no measurement file'),
      );
      continue;
    }
    if (existsSync(file) && !flag('--force')) {
      const existing = JSON.parse(readFileSync(file, 'utf8')) as Measurement;
      if (!existing.error) {
        console.log(`${branch}: reusing ${file} (pass --force to re-measure)`);
        measurements.push(existing);
        continue;
      }
    }
    measurements.push(measureBranch(branch, arg('--runs')));
  }

  const meta: RenderMeta = {
    generatedAt: new Date().toISOString(),
    environment:
      arg('--environment') ??
      `local run, ${process.platform}-${process.arch}, Node ${process.versions.node}`,
    command: 'npm run compare',
  };
  const resultsPath = join(root, 'docs/results.md');
  writeFileSync(resultsPath, renderResults(measurements, meta));
  console.log(`\nwrote docs/results.md`);

  const readmePath = join(root, 'README.md');
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, 'utf8');
    const updated = embedInReadme(readme, measurements, meta);
    if (updated !== readme) {
      writeFileSync(readmePath, updated);
      console.log('updated README.md results block');
    }
  }

  const failed = measurements.filter((m) => m.error);
  if (failed.length > 0) {
    console.error(
      `\n${String(failed.length)} branch(es) could not be measured: ${failed.map((m) => m.branch).join(', ')}`,
    );
    process.exit(1);
  }
}

main();
