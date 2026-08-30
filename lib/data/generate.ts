import { CATEGORIES, LEVELS } from './types';
import type { Category, Course, Fixtures, Instructor, Review } from './types';

/**
 * mulberry32: a small 32-bit PRNG with a good enough distribution for fixture
 * data. The same seed always produces the same sequence, which is what makes
 * the DOM, and therefore the measurements, stable between runs.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GenerateOptions {
  seed?: number;
  courses?: number;
  instructors?: number;
  reviews?: number;
}

export const DEFAULT_SEED = 20240917;

/** Fixed reference date so generated timestamps never depend on the wall clock. */
const EPOCH = Date.UTC(2025, 0, 1);
const DAY = 86_400_000;

const FIRST_NAMES = [
  'Amara',
  'Ben',
  'Chloe',
  'Dev',
  'Elena',
  'Farid',
  'Grace',
  'Hugo',
  'Isla',
  'Jonas',
  'Kavya',
  'Liam',
  'Maya',
  'Noah',
  'Olivia',
  'Priya',
  'Quinn',
  'Rafael',
  'Sofia',
  'Tariq',
  'Uma',
  'Victor',
  'Wren',
  'Xavier',
  'Yara',
  'Zane',
  'Aiden',
  'Bianca',
  'Callum',
  'Dana',
  'Ezra',
  'Freya',
  'Gabriel',
  'Hana',
  'Idris',
  'Jade',
  'Kian',
  'Leila',
  'Mateo',
  'Nadia',
];
const LAST_NAMES = [
  'Ahmed',
  'Bauer',
  'Chen',
  'Dubois',
  'Evans',
  'Fischer',
  'Garcia',
  'Haddad',
  'Ivanova',
  'Jensen',
  'Khan',
  'Lindqvist',
  'Moreau',
  'Nakamura',
  'Okafor',
  'Patel',
  'Quintero',
  'Rossi',
  'Schmidt',
  'Tanaka',
  'Usman',
  'Varga',
  'Walsh',
  'Xu',
  'Yilmaz',
  'Zhang',
  'Andersen',
  'Brooks',
  'Costa',
  'Dlamini',
  'Eriksen',
  'Ferreira',
  'Gupta',
  'Hoffmann',
  'Ibrahim',
  'Jang',
  'Kowalski',
  'Lopez',
  'Mensah',
  'Novak',
];
const INSTRUCTOR_TITLES = [
  'Staff Engineer',
  'Principal Engineer',
  'Engineering Manager',
  'Independent Consultant',
  'Solutions Architect',
  'Senior Data Scientist',
  'Site Reliability Engineer',
  'Product Designer',
  'Security Researcher',
  'University Lecturer',
];

const TOPICS: Record<Category, string[]> = {
  'Web Development': [
    'TypeScript',
    'React',
    'Next.js',
    'Web Accessibility',
    'CSS Layout',
    'Node.js APIs',
  ],
  'Data Science': [
    'Pandas',
    'Statistics',
    'Data Visualisation',
    'SQL for Analysis',
    'Experiment Design',
  ],
  Cloud: ['AWS Networking', 'Serverless', 'Terraform', 'Cloud Cost Control', 'Kubernetes'],
  Security: [
    'Web Security',
    'Threat Modelling',
    'OAuth and OIDC',
    'Secrets Management',
    'Incident Response',
  ],
  Mobile: ['React Native', 'Swift UI', 'Kotlin', 'Offline-first Apps', 'Mobile Performance'],
  Design: ['Design Systems', 'Typography', 'Interaction Design', 'Figma', 'Motion Design'],
  DevOps: ['CI Pipelines', 'Docker', 'Observability', 'Release Engineering', 'GitHub Actions'],
  Databases: ['PostgreSQL', 'MongoDB', 'Redis', 'Query Optimisation', 'Schema Migrations'],
  'Programming Languages': ['Rust', 'Go', 'Python', 'Functional Programming', 'Compilers'],
  Business: [
    'Product Management',
    'Technical Writing',
    'Pricing',
    'Engineering Leadership',
    'Negotiation',
  ],
  Mathematics: ['Linear Algebra', 'Probability', 'Discrete Maths', 'Calculus', 'Optimisation'],
  'Machine Learning': ['Deep Learning', 'NLP', 'Recommender Systems', 'MLOps', 'Model Evaluation'],
};
const FORMATS = [
  'Fundamentals',
  'in Practice',
  'Workshop',
  'Deep Dive',
  'for Teams',
  'from Scratch',
  'Masterclass',
  'Crash Course',
  'Patterns',
  'Bootcamp',
];
const SUMMARY_OPENERS = [
  'A hands-on course on',
  'Everything you need to start with',
  'A structured path through',
  'Practical, example-driven lessons on',
  'A project-based introduction to',
];
const SUMMARY_CLOSERS = [
  'with exercises after every module.',
  'built around a single running project.',
  'that ends with a capstone you can show.',
  'taught the way it is used at work.',
  'with a focus on the mistakes people actually make.',
];
const REVIEW_BODIES: Record<Review['rating'], string[]> = {
  5: [
    'Exactly what I needed. Clear, well paced, and the exercises are worth doing.',
    'Best course I have taken on this subject. The capstone alone justifies it.',
    'Dense but never confusing. I finished with real confidence.',
  ],
  4: [
    'Very good overall. A couple of modules felt rushed.',
    'Solid material and a responsive instructor. Would recommend.',
    'Good balance of theory and practice. Slightly dated tooling in places.',
  ],
  3: [
    'Useful, but I had to look elsewhere for the harder parts.',
    'Fine as an introduction. Do not expect much depth.',
    'Reasonable content, uneven audio quality.',
  ],
  2: [
    'Too much time on setup, too little on the actual topic.',
    'The examples did not run as shown without changes.',
  ],
  1: ['Not what the description promised. Refunded.'],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  const item = list[Math.floor(rand() * list.length)];
  if (item === undefined) throw new Error('pick() called with an empty list');
  return item;
}

function int(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function isoDaysBefore(days: number): string {
  return new Date(EPOCH - days * DAY).toISOString();
}

export function thumbnailFor(category: Category): string {
  return `/thumbs/${slugify(category)}.svg`;
}

export function generateFixtures(options: GenerateOptions = {}): Fixtures {
  const seed = options.seed ?? DEFAULT_SEED;
  const courseCount = options.courses ?? 2000;
  const instructorCount = options.instructors ?? 200;
  const reviewCount = options.reviews ?? 10_000;
  const rand = mulberry32(seed);

  const instructors: Instructor[] = [];
  for (let i = 1; i <= instructorCount; i += 1) {
    const name = `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`;
    const title = pick(rand, INSTRUCTOR_TITLES);
    instructors.push({
      id: i,
      name,
      title,
      bio: `${name} is a ${title.toLowerCase()} who has taught ${String(int(rand, 2, 40))} cohorts and prefers worked examples over slides.`,
    });
  }

  const courses: Course[] = [];
  for (let i = 1; i <= courseCount; i += 1) {
    const category = pick(rand, CATEGORIES);
    const topic = pick(rand, TOPICS[category]);
    const title = `${topic} ${pick(rand, FORMATS)}`;
    const publishedDaysAgo = int(rand, 30, 1400);
    courses.push({
      id: i,
      slug: `${slugify(title)}-${String(i)}`,
      title,
      summary: `${pick(rand, SUMMARY_OPENERS)} ${topic.toLowerCase()} ${pick(rand, SUMMARY_CLOSERS)}`,
      category,
      level: pick(rand, LEVELS),
      instructorId: int(rand, 1, instructorCount),
      priceCents: int(rand, 9, 199) * 100 + 99,
      durationHours: int(rand, 2, 40),
      enrolments: int(rand, 12, 25_000),
      rating: 0,
      reviewCount: 0,
      publishedAt: isoDaysBefore(publishedDaysAgo),
      updatedAt: isoDaysBefore(int(rand, 0, Math.min(publishedDaysAgo, 120))),
      thumbnail: thumbnailFor(category),
    });
  }

  const reviews: Review[] = [];
  const ratingSums = new Map<number, { sum: number; count: number }>();
  for (let i = 1; i <= reviewCount; i += 1) {
    const courseId = int(rand, 1, courseCount);
    // Skewed towards 4 and 5 stars, the way real catalogues look.
    const roll = rand();
    const rating: Review['rating'] =
      roll < 0.45 ? 5 : roll < 0.75 ? 4 : roll < 0.9 ? 3 : roll < 0.97 ? 2 : 1;
    reviews.push({
      id: i,
      courseId,
      author: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES).charAt(0)}.`,
      rating,
      body: pick(rand, REVIEW_BODIES[rating]),
      createdAt: isoDaysBefore(int(rand, 0, 400)),
    });
    const agg = ratingSums.get(courseId) ?? { sum: 0, count: 0 };
    agg.sum += rating;
    agg.count += 1;
    ratingSums.set(courseId, agg);
  }

  for (const course of courses) {
    const agg = ratingSums.get(course.id);
    if (agg) {
      course.rating = Math.round((agg.sum / agg.count) * 10) / 10;
      course.reviewCount = agg.count;
    }
  }

  return { seed, generator: 'mulberry32', instructors, courses, reviews };
}
