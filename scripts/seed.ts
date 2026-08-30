import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateFixtures, thumbnailFor } from '../lib/data/generate';
import { CATEGORIES } from '../lib/data/types';

const root = join(import.meta.dirname, '..');
const fixtures = generateFixtures();

const target = join(root, 'lib/data/fixtures.json');
writeFileSync(target, JSON.stringify(fixtures));

// One thumbnail per category, so the catalogue's 2,000 <img> tags resolve to
// twelve cacheable files. The SVG has an intrinsic size, which is what makes a
// dimensionless <img> shift layout when it loads.
const palette = [
  '#0f766e',
  '#b45309',
  '#1d4ed8',
  '#be123c',
  '#4d7c0f',
  '#6d28d9',
  '#0e7490',
  '#a16207',
  '#9f1239',
  '#3f6212',
  '#7c2d12',
  '#334155',
];
const thumbsDir = join(root, 'public/thumbs');
mkdirSync(thumbsDir, { recursive: true });
CATEGORIES.forEach((category, index) => {
  const initials = category
    .split(' ')
    .map((word) => word.charAt(0))
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><rect width="160" height="100" rx="8" fill="${palette[index % palette.length] ?? '#334155'}"/><text x="80" y="60" font-family="system-ui, sans-serif" font-size="32" font-weight="700" fill="#ffffff" text-anchor="middle">${initials}</text></svg>\n`;
  writeFileSync(join(thumbsDir, thumbnailFor(category).replace('/thumbs/', '')), svg);
});

console.log(
  `seed ${String(fixtures.seed)}: ${String(fixtures.instructors.length)} instructors, ${String(fixtures.courses.length)} courses, ${String(fixtures.reviews.length)} reviews -> lib/data/fixtures.json`,
);
