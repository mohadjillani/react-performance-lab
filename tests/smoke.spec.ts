import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Fixtures } from '../lib/data/types';

/**
 * Behavioural parity across branches. Every fix/* branch must pass this
 * unchanged: a fix is not allowed to improve a metric by dropping content.
 * Expected values are derived from the committed fixtures rather than typed
 * in, so the suite cannot drift from the data.
 *
 * Deliberately not asserted: DOM row counts (fix/05 virtualises the list) and
 * anything relative to the wall clock.
 */

const fixtures = JSON.parse(
  readFileSync(join(process.cwd(), 'lib/data/fixtures.json'), 'utf8'),
) as Fixtures;

const DETAIL_SLUG = 'observability-in-practice-1';
const SEARCH_TERM = 'Terraform';

const instructorName = (id: number) =>
  fixtures.instructors.find((i) => i.id === id)?.name ?? 'Unknown';

const featuredTitles = [...fixtures.courses]
  .sort((a, b) => b.enrolments - a.enrolments || a.id - b.id)
  .slice(0, 6)
  .map((c) => c.title);

const searchMatches = fixtures.courses.filter((course) => {
  const needle = SEARCH_TERM.toLowerCase();
  return (
    course.title.toLowerCase().includes(needle) ||
    course.category.toLowerCase().includes(needle) ||
    instructorName(course.instructorId).toLowerCase().includes(needle)
  );
}).length;

const detailCourse = fixtures.courses.find((c) => c.slug === DETAIL_SLUG);
if (!detailCourse) throw new Error(`fixture ${DETAIL_SLUG} missing`);
const detailReviews = fixtures.reviews
  .filter((r) => r.courseId === detailCourse.id)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
const ratingBuckets = new Set(detailReviews.map((r) => r.rating)).size; // recharts draws no bar for a zero count
const newestReview = detailReviews[0];
if (!newestReview) throw new Error(`fixture ${DETAIL_SLUG} has no reviews`);

test.describe('landing page', () => {
  test('renders the category chart and the six most popular courses', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learn something this week');
    await expect(page.getByTestId('landing-totals')).toContainText('2,000 courses');

    const chart = page.getByTestId('category-chart');
    await expect(chart.locator('svg').first()).toBeVisible();
    await expect(chart.locator('.recharts-bar-rectangle')).toHaveCount(12);

    const cards = page.getByTestId('featured-courses').getByRole('heading', { level: 3 });
    await expect(cards).toHaveText(featuredTitles);
  });
});

test.describe('catalogue', () => {
  test('lists all 2,000 courses and filters them', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByTestId('course-count')).toHaveText('2,000 courses');
    const first = fixtures.courses[0];
    if (!first) throw new Error('no fixture courses');
    await expect(page.getByTestId('course-list').getByRole('link').first()).toHaveText(first.title);

    await page.getByRole('searchbox', { name: 'Search courses' }).fill(SEARCH_TERM);
    await expect(page.getByTestId('course-count')).toHaveText(
      `${searchMatches.toLocaleString('en-GB')} courses`,
    );
  });

  test('links through to a course', async ({ page }) => {
    await page.goto('/courses');
    await page
      .getByTestId('course-list')
      .getByRole('link', { name: detailCourse.title })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/courses/${DETAIL_SLUG}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(detailCourse.title);
  });
});

test.describe('course detail', () => {
  test('shows the course, its instructor and its reviews', async ({ page }) => {
    await page.goto(`/courses/${DETAIL_SLUG}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(detailCourse.title);
    await expect(page.getByText(detailCourse.summary)).toBeVisible();

    await expect(page.getByTestId('instructor')).toContainText(
      instructorName(detailCourse.instructorId),
    );

    await expect(page.getByTestId('review-count')).toHaveText(`(${String(detailReviews.length)})`);
    const reviews = page.getByTestId('reviews');
    await expect(reviews.locator('.review').first()).toContainText(newestReview.author);
    await expect(reviews.locator('.review')).toHaveCount(detailReviews.length);
    await expect(page.getByTestId('rating-chart').locator('.recharts-bar-rectangle')).toHaveCount(
      ratingBuckets,
    );
  });
});
