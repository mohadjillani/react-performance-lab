'use client';

import { useState } from 'react';
import type { CourseSummary } from '@/lib/data/store';
import { CourseRow } from './CourseRow';

/** The interactive part of the catalogue; the data arrives from the server page. */
export function Catalogue({ courses }: { courses: CourseSummary[] }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const visible =
    needle === ''
      ? courses
      : courses.filter(
          (course) =>
            course.title.toLowerCase().includes(needle) ||
            course.category.toLowerCase().includes(needle) ||
            course.instructorName.toLowerCase().includes(needle),
        );

  return (
    <>
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
          {visible.length.toLocaleString('en-GB')} courses
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
