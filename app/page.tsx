import { CourseCard } from '@/components/CourseCard';
import { LazyCategoryChart } from '@/components/LazyCategoryChart';
import { meanBy, sortByDesc, sumBy } from '@/lib/collections';
import { getCategoryStats, listFeaturedCourses } from '@/lib/data/store';

// Rendered on the server and cached for a minute. The two reads happen in
// parallel on the server, once per revalidation, instead of in every
// visitor's browser after hydration.
export const revalidate = 60;

export default async function LandingPage() {
  const [stats, featured] = await Promise.all([getCategoryStats(), listFeaturedCourses()]);
  const totalCourses = sumBy(stats, 'courses');
  const totalEnrolments = sumBy(stats, 'enrolments');
  const featuredRating = meanBy(featured, 'rating');

  return (
    <>
      <h1>Learn something this week</h1>
      <p className="muted">2,000 courses across twelve categories, taught by practitioners.</p>

      <section>
        <h2>Courses by category</h2>
        <p className="muted" data-testid="landing-totals">
          {totalCourses.toLocaleString('en-GB')} courses &middot;{' '}
          {totalEnrolments.toLocaleString('en-GB')} enrolments &middot; featured courses average{' '}
          {featuredRating.toFixed(1)} stars
        </p>
        <LazyCategoryChart stats={sortByDesc(stats, 'courses')} />
      </section>

      <section>
        <h2>Most popular</h2>
        <div className="card-grid" data-testid="featured-courses">
          {featured.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </>
  );
}
