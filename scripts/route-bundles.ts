import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { LAYOUT_ENTRY, ROUTES } from './lib/routes';

/**
 * size-limit measures files matched by a static glob, but Next.js chunk names
 * are hashed and a route's first-load set is only known from
 * .next/app-build-manifest.json. This script copies each route's first-load
 * JavaScript (its own list plus the root layout's) into
 * .next/route-bundles/<route>/ so .size-limit.json can point at a stable path.
 *
 * "First-load JS" here is the same set Next.js sums in its build output:
 * the runtime chunks, the layout chunk and the page chunk, excluding polyfills
 * and CSS.
 */

interface AppBuildManifest {
  pages: Record<string, string[]>;
}

export interface RouteBundle {
  files: string[];
  bytes: number;
}

export function materialiseRouteBundles(root: string): Record<string, RouteBundle> {
  const manifestPath = join(root, '.next/app-build-manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error('No .next/app-build-manifest.json. Run `next build` first.');
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as AppBuildManifest;
  const layoutFiles = manifest.pages[LAYOUT_ENTRY] ?? [];
  const outDir = join(root, '.next/route-bundles');
  rmSync(outDir, { recursive: true, force: true });

  const result: Record<string, RouteBundle> = {};
  for (const route of ROUTES) {
    const pageFiles = manifest.pages[route.entry];
    if (!pageFiles) {
      throw new Error(`Route entry ${route.entry} is missing from the build manifest`);
    }
    const files = [...new Set([...layoutFiles, ...pageFiles])].filter((f) => f.endsWith('.js'));
    const dir = join(outDir, route.key);
    mkdirSync(dir, { recursive: true });
    let bytes = 0;
    for (const file of files) {
      const source = join(root, '.next', file);
      copyFileSync(source, join(dir, basename(file)));
      bytes += readFileSync(source).byteLength;
    }
    result[route.key] = { files, bytes };
  }
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

const isDirectRun = process.argv[1]?.endsWith('route-bundles.ts') ?? false;
if (isDirectRun) {
  const bundles = materialiseRouteBundles(process.cwd());
  for (const [key, bundle] of Object.entries(bundles)) {
    console.log(
      `${key.padEnd(10)} ${String(bundle.files.length).padStart(2)} files  ${(bundle.bytes / 1000).toFixed(1)} kB raw`,
    );
  }
}
