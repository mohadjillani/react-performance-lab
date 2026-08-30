export const CATEGORIES = [
  'Web Development',
  'Data Science',
  'Cloud',
  'Security',
  'Mobile',
  'Design',
  'DevOps',
  'Databases',
  'Programming Languages',
  'Business',
  'Mathematics',
  'Machine Learning',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

export type Level = (typeof LEVELS)[number];

export interface Instructor {
  id: number;
  name: string;
  title: string;
  bio: string;
}

export interface Course {
  id: number;
  slug: string;
  title: string;
  summary: string;
  category: Category;
  level: Level;
  instructorId: number;
  priceCents: number;
  durationHours: number;
  enrolments: number;
  rating: number;
  reviewCount: number;
  publishedAt: string;
  updatedAt: string;
  thumbnail: string;
}

export interface Review {
  id: number;
  courseId: number;
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: string;
}

export interface Fixtures {
  seed: number;
  generator: 'mulberry32';
  instructors: Instructor[];
  courses: Course[];
  reviews: Review[];
}
