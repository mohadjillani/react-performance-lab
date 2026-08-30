import type { LabRoute } from './routes';

/** One entry from `size-limit --json`, plus the budget it was checked against. */
export interface SizeEntry {
  name: string;
  size: number;
  limit: number | null;
  passed: boolean;
}

export interface RouteMetrics {
  /** Lighthouse performance score, 0-100, median of the runs. */
  performance: number;
  /** Milliseconds. */
  lcp: number;
  /** Milliseconds. */
  tbt: number;
  cls: number;
  /** Bytes, Lighthouse "total-byte-weight". */
  totalBytes: number;
  /** Requests to /api/* during the page load. */
  apiRequests: number;
  /** DOM size audit: number of elements. */
  domElements: number;
}

export interface Measurement {
  schemaVersion: 1;
  branch: string;
  commit: string;
  measuredAt: string;
  node: string;
  platform: string;
  size: {
    entries: SizeEntry[];
    passed: boolean;
  };
  lighthouse: {
    runs: number;
    routes: Partial<Record<LabRoute['key'], RouteMetrics>>;
    passed: boolean;
  } | null;
  /** Set by compare.ts when a branch could not be built or measured. */
  error?: string;
}
