'use client';

import { useEffect, useState } from 'react';
import { CourseRow } from '@/components/CourseRow';
import { getJson } from '@/lib/client-fetch';
import type { CourseSummary } from '@/lib/data/store';

export default function CataloguePage() {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    getJson<CourseSummary[]>('/api/courses')
      .then((list) => {
        if (!cancelled) setCourses(list);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = courses
    ? courses.filter((course) => {
        const needle = query.trim().toLowerCase();
        if (needle === '') return true;
        return (
          course.title.toLowerCase().includes(needle) ||
          course.category.toLowerCase().includes(needle) ||
          course.instructorName.toLowerCase().includes(needle)
        );
      })
    : [];

  return (
    <>
      <h1>All courses</h1>
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search by title, category or instructor"
          aria-label="Search courses"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <span className="muted" data-testid="course-count">
          {courses ? `${visible.length.toLocaleString('en-GB')} courses` : 'Loading…'}
        </span>
      </div>
      <ul className="course-list" data-testid="course-list">
        {visible.map((course) => (
          <CourseRow key={course.id} course={course} />
        ))}
      </ul>
    </>
  );
}
