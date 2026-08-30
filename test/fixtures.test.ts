import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SEED, generateFixtures, mulberry32 } from '../lib/data/generate';
import { CATEGORIES } from '../lib/data/types';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect(Array.from({ length: 5 }, () => a())).toEqual(Array.from({ length: 5 }, () => b()));
  });

  it('stays within [0, 1)', () => {
    const rand = mulberry32(1);
    for (let i = 0; i < 10_000; i += 1) {
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('generateFixtures', () => {
  it('is deterministic for a given seed', () => {
    expect(generateFixtures({ seed: 1, courses: 50, instructors: 5, reviews: 100 })).toEqual(
      generateFixtures({ seed: 1, courses: 50, instructors: 5, reviews: 100 }),
    );
  });

  it('changes with the seed', () => {
    const a = generateFixtures({ seed: 1, courses: 20, instructors: 3, reviews: 10 });
    const b = generateFixtures({ seed: 2, courses: 20, instructors: 3, reviews: 10 });
    expect(a.courses.map((c) => c.title)).not.toEqual(b.courses.map((c) => c.title));
  });

  it('produces the documented volumes with valid references', () => {
    const fixtures = generateFixtures();
    expect(fixtures.seed).toBe(DEFAULT_SEED);
    expect(fixtures.instructors).toHaveLength(200);
    expect(fixtures.courses).toHaveLength(2000);
    expect(fixtures.reviews).toHaveLength(10_000);

    const instructorIds = new Set(fixtures.instructors.map((i) => i.id));
    const courseIds = new Set(fixtures.courses.map((c) => c.id));
    const slugs = new Set(fixtures.courses.map((c) => c.slug));
    expect(slugs.size).toBe(2000);
    for (const course of fixtures.courses) {
      expect(instructorIds.has(course.instructorId)).toBe(true);
      expect(CATEGORIES).toContain(course.category);
      expect(course.rating).toBeGreaterThanOrEqual(0);
      expect(course.rating).toBeLessThanOrEqual(5);
    }
    for (const review of fixtures.reviews) {
      expect(courseIds.has(review.courseId)).toBe(true);
    }
  });

  it('never depends on the wall clock', () => {
    const fixtures = generateFixtures({ courses: 5, instructors: 2, reviews: 5 });
    for (const course of fixtures.courses) {
      expect(new Date(course.publishedAt).getTime()).toBeLessThan(Date.UTC(2025, 0, 1));
    }
  });

  it('locks the first course so an accidental generator change is visible', () => {
    const [first] = generateFixtures().courses;
    expect(first?.slug).toMatchInlineSnapshot(`"observability-in-practice-1"`);
    expect(first?.title).toMatchInlineSnapshot(`"Observability in Practice"`);
  });

  it('matches the committed lib/data/fixtures.json', () => {
    const committed = readFileSync(join(import.meta.dirname, '../lib/data/fixtures.json'), 'utf8');
    expect(committed).toBe(JSON.stringify(generateFixtures()));
  });
});
