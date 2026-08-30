import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RouteMetrics } from './measurement';
import { ROUTES } from './routes';
import type { LabRoute } from './routes';

/** The subset of a Lighthouse result this lab reads. */
interface LighthouseResult {
  requestedUrl?: string;
  finalDisplayedUrl?: string;
  categories: { performance?: { score: number | null } };
  audits: Record<
    string,
    { numericValue?: number; details?: { items?: { url?: string; resourceType?: string }[] } }
  >;
}

export function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted[mid - 1];
  const upper = sorted[mid];
  if (upper === undefined) return Number.NaN;
  return sorted.length % 2 === 0 && lower !== undefined ? (lower + upper) / 2 : upper;
}

function metricsOf(lhr: LighthouseResult): RouteMetrics {
  const numeric = (id: string) => lhr.audits[id]?.numericValue ?? Number.NaN;
  const requests = lhr.audits['network-requests']?.details?.items ?? [];
  const apiRequests = requests.filter((item) => {
    if (!item.url) return false;
    try {
      return new URL(item.url).pathname.startsWith('/api/');
    } catch {
      return false;
    }
  }).length;
  return {
    performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
    lcp: numeric('largest-contentful-paint'),
    tbt: numeric('total-blocking-time'),
    cls: numeric('cumulative-layout-shift'),
    totalBytes: numeric('total-byte-weight'),
    apiRequests,
    domElements: numeric('dom-size'),
  };
}

/** Reads every lhr-*.json in .lighthouseci and returns the per-route median of each metric. */
export function summariseLighthouseRuns(dir: string): {
  runs: number;
  routes: Partial<Record<LabRoute['key'], RouteMetrics>>;
} {
  const files = readdirSync(dir).filter((f) => f.startsWith('lhr-') && f.endsWith('.json'));
  const byRoute = new Map<LabRoute['key'], RouteMetrics[]>();
  for (const file of files) {
    const lhr = JSON.parse(readFileSync(join(dir, file), 'utf8')) as LighthouseResult;
    const url = lhr.requestedUrl ?? lhr.finalDisplayedUrl;
    if (!url) continue;
    const pathname = new URL(url).pathname;
    const route = ROUTES.find((r) => r.path === pathname);
    if (!route) continue;
    const list = byRoute.get(route.key) ?? [];
    list.push(metricsOf(lhr));
    byRoute.set(route.key, list);
  }

  const routes: Partial<Record<LabRoute['key'], RouteMetrics>> = {};
  let runs = 0;
  for (const [key, list] of byRoute) {
    runs = Math.max(runs, list.length);
    routes[key] = {
      performance: median(list.map((m) => m.performance)),
      lcp: median(list.map((m) => m.lcp)),
      tbt: median(list.map((m) => m.tbt)),
      cls: median(list.map((m) => m.cls)),
      totalBytes: median(list.map((m) => m.totalBytes)),
      apiRequests: median(list.map((m) => m.apiRequests)),
      domElements: median(list.map((m) => m.domElements)),
    };
  }
  return { runs, routes };
}
