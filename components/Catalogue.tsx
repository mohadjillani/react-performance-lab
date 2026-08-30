'use client';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import type { CourseSummary } from '@/lib/data/store';
import { CourseRow } from './CourseRow';

const ROW_ESTIMATE = 92;

/**
 * The interactive part of the catalogue. Three changes from the previous
 * version: the filter runs against a deferred copy of the query so typing
 * never waits for it, the filtered list is memoised so unrelated re-renders
 * do not recompute it, and only the rows in (or near) the viewport are
 * mounted. The DOM goes from 2,000 rows to a few dozen; the data, the search
 * and the row count do not change.
 */
export function Catalogue({ courses }: { courses: CourseSummary[] }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const listRef = useRef<HTMLUListElement>(null);

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (needle === '') return courses;
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(needle) ||
        course.category.toLowerCase().includes(needle) ||
        course.instructorName.toLowerCase().includes(needle),
    );
  }, [courses, deferredQuery]);

  const virtualizer = useWindowVirtualizer({
    count: visible.length,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 8,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });
  const items = virtualizer.getVirtualItems();

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
      <ul
        ref={listRef}
        className="course-list virtual-list"
        data-testid="course-list"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {items.map((item) => {
          const course = visible[item.index];
          if (!course) return null;
          return (
            <CourseRow
              key={course.id}
              course={course}
              index={item.index}
              measure={virtualizer.measureElement}
              offset={item.start - virtualizer.options.scrollMargin}
            />
          );
        })}
      </ul>
    </>
  );
}
