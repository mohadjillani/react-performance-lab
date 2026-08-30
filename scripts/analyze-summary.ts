import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Condenses the webpack-bundle-analyzer JSON that `npm run analyze` writes to
 * .next/analyze/client.json into something small enough to commit and read:
 * for every client chunk, its gzip size, which entrypoints load it on first
 * load, and the packages that account for most of it.
 *
 * Usage: tsx scripts/analyze-summary.ts [--out docs/profile-first/<name>.json]
 */

interface AnalyzerGroup {
  label: string;
  path?: string;
  statSize: number;
  parsedSize?: number;
  gzipSize?: number;
  groups?: AnalyzerGroup[];
}

interface AnalyzerAsset extends AnalyzerGroup {
  isAsset: true;
  isInitialByEntrypoint?: Record<string, boolean>;
}

export interface PackageSize {
  package: string;
  gzip: number;
}

export interface ChunkSummary {
  chunk: string;
  gzip: number;
  initialFor: string[];
  packages: PackageSize[];
}

export interface AnalysisSummary {
  generatedFrom: string;
  totalClientGzip: number;
  chunks: ChunkSummary[];
}

/** `./node_modules/@scope/name/dist/x.js` -> `@scope/name`; anything else -> the top folder. */
function packageOf(path: string | undefined, label: string): string {
  const source = path ?? label;
  const match = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(source);
  if (match?.[1]) return match[1];
  const top = source.replace(/^\.\//, '').split('/')[0] ?? source;
  return top === '' ? label : top;
}

function collectLeaves(group: AnalyzerGroup, into: Map<string, number>): void {
  if (!group.groups || group.groups.length === 0) {
    const key = packageOf(group.path, group.label);
    into.set(key, (into.get(key) ?? 0) + (group.gzipSize ?? 0));
    return;
  }
  for (const child of group.groups) collectLeaves(child, into);
}

export function summariseAnalysis(assets: AnalyzerAsset[], topN = 6): AnalysisSummary {
  const chunks: ChunkSummary[] = assets
    .filter((asset) => asset.isAsset && asset.label.endsWith('.js'))
    .map((asset) => {
      const byPackage = new Map<string, number>();
      collectLeaves(asset, byPackage);
      const packages = [...byPackage.entries()]
        .map(([pkg, gzip]) => ({ package: pkg, gzip }))
        .sort((a, b) => b.gzip - a.gzip)
        .slice(0, topN);
      const initialFor = Object.entries(asset.isInitialByEntrypoint ?? {})
        .filter(([, initial]) => initial)
        .map(([entry]) => entry)
        .sort();
      return { chunk: asset.label, gzip: asset.gzipSize ?? 0, initialFor, packages };
    })
    .sort((a, b) => b.gzip - a.gzip);

  return {
    generatedFrom: '.next/analyze/client.json',
    totalClientGzip: chunks.reduce((sum, chunk) => sum + chunk.gzip, 0),
    chunks,
  };
}

export function renderAnalysis(summary: AnalysisSummary): string {
  const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`;
  const lines = [
    `Client JS (gzip): ${kb(summary.totalClientGzip)} across ${String(summary.chunks.length)} chunks`,
    '',
    '| Chunk | gzip | Initial for | Largest packages |',
    '| --- | ---: | --- | --- |',
  ];
  for (const chunk of summary.chunks) {
    if (chunk.gzip < 2048) continue;
    const packages = chunk.packages
      .filter((p) => p.gzip >= 1024)
      .map((p) => `${p.package} ${kb(p.gzip)}`)
      .join(', ');
    const initial = chunk.initialFor.length > 0 ? chunk.initialFor.join(', ') : 'async';
    lines.push(
      `| \`${chunk.chunk.replace('static/chunks/', '')}\` | ${kb(chunk.gzip)} | ${initial} | ${packages} |`,
    );
  }
  return lines.join('\n');
}

const isDirectRun = process.argv[1]?.endsWith('analyze-summary.ts') ?? false;
if (isDirectRun) {
  const root = join(import.meta.dirname, '..');
  const source = join(root, '.next/analyze/client.json');
  if (!existsSync(source)) {
    console.error('No .next/analyze/client.json. Run `npm run analyze` first.');
    process.exit(1);
  }
  const outIndex = process.argv.indexOf('--out');
  const out = outIndex === -1 ? undefined : process.argv[outIndex + 1];
  const assets = JSON.parse(readFileSync(source, 'utf8')) as AnalyzerAsset[];
  const summary = summariseAnalysis(assets);
  if (out) {
    mkdirSync(join(root, out, '..'), { recursive: true });
    writeFileSync(join(root, out), `${JSON.stringify(summary, null, 2)}\n`);
    console.error(`wrote ${out}`);
  }
  console.log(renderAnalysis(summary));
}
