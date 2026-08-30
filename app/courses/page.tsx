import { Catalogue } from '@/components/Catalogue';
import { listCourses } from '@/lib/data/store';

export const revalidate = 60;

export default async function CataloguePage() {
  const courses = await listCourses();
  return (
    <>
      <h1>All courses</h1>
      <Catalogue courses={courses} />
    </>
  );
}
