// Lighthouse CI configuration. scripts/measure.ts starts `next start` on a free
// port and passes it as LAB_PORT; running `npx lhci collect` by hand against a
// server on port 3100 works too. The three URLs mirror scripts/lib/routes.ts.
const port = process.env.LAB_PORT ?? '3100';
const base = `http://127.0.0.1:${port}`;

// Budgets are per route because the routes are not alike: the catalogue renders
// 2,000 rows and will never score like the landing page. Each fix branch
// tightens the numbers it improves; see docs/methodology.md for the tolerance.
const budget = (performance, lcp, tbt, cls, bytes) => ({
  'categories:performance': ['error', { minScore: performance }],
  'largest-contentful-paint': ['error', { maxNumericValue: lcp }],
  'total-blocking-time': ['error', { maxNumericValue: tbt }],
  'cumulative-layout-shift': ['error', { maxNumericValue: cls }],
  'total-byte-weight': ['error', { maxNumericValue: bytes }],
});

module.exports = {
  ci: {
    collect: {
      url: [`${base}/`, `${base}/courses`, `${base}/courses/observability-in-practice-1`],
      numberOfRuns: 3,
      settings: {
        // Lighthouse defaults: mobile emulation with simulated 4G and 4x CPU slowdown.
        onlyCategories: ['performance'],
        skipAudits: ['uses-http2'],
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: `^${base}/$`,
          aggregationMethod: 'median',
          assertions: budget(0.95, 2200, 250, 0.02, 380_000),
        },
        {
          matchingUrlPattern: `^${base}/courses$`,
          aggregationMethod: 'median',
          assertions: budget(0.91, 3400, 225, 0.02, 290_000),
        },
        {
          matchingUrlPattern: `^${base}/courses/`,
          aggregationMethod: 'median',
          assertions: budget(0.95, 2300, 275, 0.02, 380_000),
        },
      ],
    },
  },
};
